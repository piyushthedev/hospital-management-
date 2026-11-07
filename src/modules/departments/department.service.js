/**
 * Departments Service
 */
const { getDatabase } = require('../../core/database');
const { generateId } = require('../../core/security');
const eventBus = require('../../core/event-bus');

class DepartmentService {
  constructor() {
    this.db = getDatabase();
  }

  getAll() {
    const departments = this.db.prepare(`
      SELECT 
        d.*,
        (SELECT COUNT(*) FROM doctors doc WHERE doc.department_id = d.id) as doctor_count,
        (SELECT COUNT(*) FROM staff s WHERE s.department_id = d.id) as staff_count,
        (SELECT COUNT(*) FROM beds b WHERE b.department_id = d.id) as bed_count,
        (SELECT COUNT(*) FROM beds b WHERE b.department_id = d.id AND b.status = 'occupied') as occupied_beds
      FROM departments d
      ORDER BY d.name ASC
    `).all();

    return departments;
  }

  getById(id) {
    const dept = this.db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
    if (!dept) {
      throw new Error(`Department with ID '${id}' not found`);
    }

    const doctors = this.db.prepare('SELECT id, name, specialization, consultation_fee, availability_status FROM doctors WHERE department_id = ?').all(id);
    const staff = this.db.prepare('SELECT id, name, role, shift, status FROM staff WHERE department_id = ?').all(id);
    const beds = this.db.prepare('SELECT id, room_number, bed_number, ward_type, status, current_patient_name FROM beds WHERE department_id = ?').all(id);

    return {
      ...dept,
      doctors,
      staff,
      beds
    };
  }

  create(data, user) {
    const { name, code, description = '', floor = '', phone_extension = '', capacity = 20, head_doctor_id = null } = data;

    if (!name || !code) {
      throw new Error('Department name and code are required');
    }

    const existingCode = this.db.prepare('SELECT id FROM departments WHERE code = ? COLLATE NOCASE').get(code);
    if (existingCode) {
      throw new Error(`Department code '${code}' is already in use`);
    }

    let headDoctorName = null;
    if (head_doctor_id) {
      const doc = this.db.prepare('SELECT name FROM doctors WHERE id = ?').get(head_doctor_id);
      if (doc) headDoctorName = doc.name;
    }

    const id = generateId('DEP');
    this.db.prepare(`
      INSERT INTO departments (id, name, code, description, head_doctor_id, head_doctor_name, floor, phone_extension, capacity, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(id, name, code.toUpperCase(), description, head_doctor_id, headDoctorName, floor, phone_extension, capacity);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'DEPARTMENT_CREATED',
      module: 'departments',
      details: `Department '${name}' (${code}) created`
    });

    return this.getById(id);
  }

  update(id, data, user) {
    const existing = this.db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
    if (!existing) {
      throw new Error(`Department with ID '${id}' not found`);
    }

    const name = data.name !== undefined ? data.name : existing.name;
    const description = data.description !== undefined ? data.description : existing.description;
    const floor = data.floor !== undefined ? data.floor : existing.floor;
    const phone_extension = data.phone_extension !== undefined ? data.phone_extension : existing.phone_extension;
    const capacity = data.capacity !== undefined ? data.capacity : existing.capacity;
    const status = data.status !== undefined ? data.status : existing.status;
    let head_doctor_id = data.head_doctor_id !== undefined ? data.head_doctor_id : existing.head_doctor_id;
    let head_doctor_name = existing.head_doctor_name;

    if (data.head_doctor_id) {
      const doc = this.db.prepare('SELECT name FROM doctors WHERE id = ?').get(data.head_doctor_id);
      if (doc) head_doctor_name = doc.name;
    } else if (data.head_doctor_id === null) {
      head_doctor_name = null;
    }

    this.db.prepare(`
      UPDATE departments 
      SET name = ?, description = ?, floor = ?, phone_extension = ?, capacity = ?, status = ?, head_doctor_id = ?, head_doctor_name = ?
      WHERE id = ?
    `).run(name, description, floor, phone_extension, capacity, status, head_doctor_id, head_doctor_name, id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'DEPARTMENT_UPDATED',
      module: 'departments',
      details: `Department '${name}' (${id}) updated`
    });

    return this.getById(id);
  }

  delete(id, user) {
    const dept = this.db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
    if (!dept) {
      throw new Error(`Department with ID '${id}' not found`);
    }

    // Check if doctors are attached
    const doctorsCount = this.db.prepare('SELECT COUNT(*) as count FROM doctors WHERE department_id = ?').get(id).count;
    if (doctorsCount > 0) {
      throw new Error(`Cannot delete department with ${doctorsCount} assigned doctor(s). Reassign them first.`);
    }

    this.db.prepare('DELETE FROM departments WHERE id = ?').run(id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'DEPARTMENT_DELETED',
      module: 'departments',
      details: `Department '${dept.name}' (${id}) deleted`
    });

    return { success: true, message: `Department '${dept.name}' deleted successfully` };
  }
}

module.exports = new DepartmentService();

