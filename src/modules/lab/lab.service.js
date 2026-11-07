/**
 * Laboratory & Diagnostic Services
 */
const { getDatabase } = require('../../core/database');
const { generateId } = require('../../core/security');
const eventBus = require('../../core/event-bus');

class LabService {
  constructor() {
    this.db = getDatabase();
  }

  getAllTests() {
    return this.db.prepare('SELECT * FROM lab_tests ORDER BY category ASC, name ASC').all();
  }

  getTestById(id) {
    const test = this.db.prepare('SELECT * FROM lab_tests WHERE id = ?').get(id);
    if (!test) throw new Error(`Lab test '${id}' not found`);
    return test;
  }

  createTest(data, user) {
    const { name, code, category = 'Biochemistry', price = 50.0, normal_range = '', sample_type = 'Blood' } = data;
    if (!name || !code) throw new Error('Lab test name and code are required');

    const existing = this.db.prepare('SELECT id FROM lab_tests WHERE code = ? COLLATE NOCASE').get(code);
    if (existing) throw new Error(`Lab test with code '${code}' already exists`);

    const id = generateId('LAB');
    this.db.prepare(`
      INSERT INTO lab_tests (id, name, code, category, price, normal_range, sample_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, code.toUpperCase(), category, parseFloat(price) || 50.0, normal_range, sample_type);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'LAB_TEST_CATALOG_CREATED',
      module: 'lab',
      details: `Lab test '${name}' (${code}) added to diagnostic catalog`
    });

    return this.getTestById(id);
  }

  getAllOrders(filters = {}) {
    let query = 'SELECT * FROM lab_orders WHERE 1=1';
    const params = [];

    if (filters.patient_id) {
      query += ' AND patient_id = ?';
      params.push(filters.patient_id);
    }

    if (filters.doctor_id) {
      query += ' AND doctor_id = ?';
      params.push(filters.doctor_id);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (patient_name LIKE ? OR test_name LIKE ? OR id LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY ordered_at DESC';
    return this.db.prepare(query).all(...params);
  }

  getOrderById(id) {
    const order = this.db.prepare('SELECT * FROM lab_orders WHERE id = ?').get(id);
    if (!order) throw new Error(`Lab order '${id}' not found`);
    return order;
  }

  createOrder(data, user) {
    const { patient_id, test_id, notes = '' } = data;
    if (!patient_id || !test_id) throw new Error('Patient ID and Test ID are required');

    const patient = this.db.prepare('SELECT id, name FROM patients WHERE id = ?').get(patient_id);
    if (!patient) throw new Error(`Patient '${patient_id}' not found`);

    const test = this.db.prepare('SELECT id, name, normal_range, price FROM lab_tests WHERE id = ?').get(test_id);
    if (!test) throw new Error(`Diagnostic test '${test_id}' not found`);

    let doctorId = data.doctor_id || null;
    let doctorName = null;

    if (user?.role === 'doctor') {
      const doc = this.db.prepare('SELECT id, name FROM doctors WHERE user_id = ?').get(user.id);
      if (doc) {
        doctorId = doc.id;
        doctorName = doc.name;
      }
    }

    if (!doctorName && doctorId) {
      const doc = this.db.prepare('SELECT name FROM doctors WHERE id = ?').get(doctorId);
      if (doc) doctorName = doc.name;
    }

    const orderId = generateId('LBO');
    this.db.prepare(`
      INSERT INTO lab_orders (id, patient_id, patient_name, doctor_id, doctor_name, test_id, test_name, status, normal_range, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ordered', ?, ?)
    `).run(orderId, patient.id, patient.name, doctorId, doctorName, test.id, test.name, test.normal_range, notes);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'LAB_ORDER_PLACED',
      module: 'lab',
      details: `Diagnostic test ${test.name} ordered for ${patient.name}`
    });

    eventBus.emit('lab.ordered', {
      orderId,
      patientId: patient.id,
      patientName: patient.name,
      testName: test.name,
      price: test.price
    });

    return this.getOrderById(orderId);
  }

  updateOrderStatus(id, status, { result_value = '', notes = '' } = {}, user) {
    const valid = ['ordered', 'sample_collected', 'in_analysis', 'completed', 'cancelled'];
    if (!valid.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${valid.join(', ')}`);
    }

    const order = this.getOrderById(id);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const completedAt = status === 'completed' ? nowStr : order.completed_at;
    const finalResult = result_value || order.result_value;
    const finalNotes = notes || order.notes;

    this.db.prepare(`
      UPDATE lab_orders SET
        status = ?,
        result_value = ?,
        notes = ?,
        completed_at = ?
      WHERE id = ?
    `).run(status, finalResult, finalNotes, completedAt, id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'LAB_ORDER_STATUS_CHANGED',
      module: 'lab',
      details: `Lab order ${id} status updated to ${status}`
    });

    // When completed, automatically attach to patient's clinical chart
    if (status === 'completed' && finalResult) {
      const recId = generateId('REC');
      this.db.prepare(`
        INSERT INTO medical_records (id, patient_id, doctor_id, doctor_name, record_type, diagnosis, notes)
        VALUES (?, ?, ?, ?, 'lab_result', ?, ?)
      `).run(
        recId,
        order.patient_id,
        order.doctor_id,
        order.doctor_name,
        `Diagnostic Lab Report: ${order.test_name}`,
        `Result: ${finalResult} (Reference: ${order.normal_range || 'Standard'}). ${finalNotes || ''}`
      );

      eventBus.emit('lab.completed', {
        orderId: id,
        patientId: order.patient_id,
        testName: order.test_name,
        resultValue: finalResult
      });
    }

    return this.getOrderById(id);
  }

  deleteOrder(id, user) {
    const order = this.getOrderById(id);
    if (order.status === 'completed') {
      throw new Error('Cannot delete completed diagnostic test results');
    }

    this.db.prepare('DELETE FROM lab_orders WHERE id = ?').run(id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'LAB_ORDER_DELETED',
      module: 'lab',
      details: `Lab order ${id} deleted`
    });

    return { success: true, message: `Lab order ${id} removed` };
  }
}

module.exports = new LabService();

