/**
 * Pharmacy & Medication Inventory Service
 */
const { getDatabase } = require('../../core/database');
const { generateId } = require('../../core/security');
const eventBus = require('../../core/event-bus');

class PharmacyService {
  constructor() {
    this.db = getDatabase();
  }

  // --- Medicine Inventory Management ---

  getAllMedicines(filters = {}) {
    let query = 'SELECT * FROM medicines WHERE 1=1';
    const params = [];

    if (filters.category) {
      query += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (name LIKE ? OR generic_name LIKE ? OR category LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY name ASC';
    return this.db.prepare(query).all(...params);
  }

  getMedicineById(id) {
    const med = this.db.prepare('SELECT * FROM medicines WHERE id = ?').get(id);
    if (!med) throw new Error(`Medicine '${id}' not found`);
    return med;
  }

  createMedicine(data, user) {
    const {
      name,
      generic_name = '',
      category = 'General',
      dosage_form = 'Tablet',
      unit_price = 1.0,
      stock_quantity = 0,
      reorder_level = 20,
      expiry_date = null
    } = data;

    if (!name || !category) {
      throw new Error('Medicine commercial name and category are required');
    }

    const price = parseFloat(unit_price) || 0;
    const qty = parseInt(stock_quantity, 10) || 0;
    const reorder = parseInt(reorder_level, 10) || 20;

    let status = 'in_stock';
    if (qty <= 0) {
      status = 'out_of_stock';
    } else if (qty <= reorder) {
      status = 'low_stock';
    }

    const id = generateId('MED');

    this.db.prepare(`
      INSERT INTO medicines (id, name, generic_name, category, dosage_form, unit_price, stock_quantity, reorder_level, expiry_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, generic_name, category, dosage_form, price, qty, reorder, expiry_date, status);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'MEDICINE_CREATED',
      module: 'pharmacy',
      details: `Added new medicine to formulary: ${name} (${dosage_form}, initial stock: ${qty})`
    });

    return this.getMedicineById(id);
  }

  updateMedicine(id, data, user) {
    const existing = this.getMedicineById(id);

    const name = data.name !== undefined ? data.name : existing.name;
    const generic_name = data.generic_name !== undefined ? data.generic_name : existing.generic_name;
    const category = data.category !== undefined ? data.category : existing.category;
    const dosage_form = data.dosage_form !== undefined ? data.dosage_form : existing.dosage_form;
    const unit_price = data.unit_price !== undefined ? parseFloat(data.unit_price) : existing.unit_price;
    const stock_quantity = data.stock_quantity !== undefined ? parseInt(data.stock_quantity, 10) : existing.stock_quantity;
    const reorder_level = data.reorder_level !== undefined ? parseInt(data.reorder_level, 10) : existing.reorder_level;
    const expiry_date = data.expiry_date !== undefined ? data.expiry_date : existing.expiry_date;

    let status = 'in_stock';
    if (stock_quantity <= 0) {
      status = 'out_of_stock';
    } else if (stock_quantity <= reorder_level) {
      status = 'low_stock';
    }

    this.db.prepare(`
      UPDATE medicines
      SET name = ?, generic_name = ?, category = ?, dosage_form = ?, unit_price = ?, stock_quantity = ?, reorder_level = ?, expiry_date = ?, status = ?
      WHERE id = ?
    `).run(name, generic_name, category, dosage_form, unit_price, stock_quantity, reorder_level, expiry_date, status, id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'MEDICINE_UPDATED',
      module: 'pharmacy',
      details: `Updated medicine ${name} (${id})`
    });

    return this.getMedicineById(id);
  }

  adjustStock(id, data, user) {
    const existing = this.getMedicineById(id);
    const delta = parseInt(data.adjustment, 10);
    if (isNaN(delta) || delta === 0) {
      throw new Error('Valid non-zero adjustment integer is required');
    }

    const newStock = existing.stock_quantity + delta;
    if (newStock < 0) {
      throw new Error(`Insufficient stock. Current: ${existing.stock_quantity}, adjustment: ${delta}`);
    }

    let status = 'in_stock';
    if (newStock <= 0) {
      status = 'out_of_stock';
    } else if (newStock <= existing.reorder_level) {
      status = 'low_stock';
    }

    this.db.prepare(`
      UPDATE medicines
      SET stock_quantity = ?, status = ?
      WHERE id = ?
    `).run(newStock, status, id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'MEDICINE_STOCK_ADJUSTED',
      module: 'pharmacy',
      details: `Stock for ${existing.name} adjusted by ${delta > 0 ? '+' + delta : delta} to ${newStock}. Reason: ${data.reason || 'Manual inventory update'}`
    });

    return this.getMedicineById(id);
  }

  // --- Prescriptions & Dispensation ---

  getAllPrescriptions(filters = {}) {
    let query = 'SELECT * FROM prescriptions WHERE 1=1';
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
      query += ' AND (patient_name LIKE ? OR doctor_name LIKE ? OR diagnosis LIKE ? OR id LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY created_at DESC';
    const prescriptions = this.db.prepare(query).all(...params);

    const getItems = this.db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?');
    return prescriptions.map(p => ({
      ...p,
      items: getItems.all(p.id)
    }));
  }

  getPrescriptionById(id) {
    const rx = this.db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(id);
    if (!rx) throw new Error(`Prescription '${id}' not found`);

    const items = this.db.prepare('SELECT * FROM prescription_items WHERE prescription_id = ?').all(id);
    return {
      ...rx,
      items
    };
  }

  createPrescription(data, user) {
    const { patient_id, appointment_id = null, diagnosis = '', items = [] } = data;
    if (!patient_id) throw new Error('Patient ID is required');
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Prescription must include at least one medication item');
    }

    const patient = this.db.prepare('SELECT id, name FROM patients WHERE id = ?').get(patient_id);
    if (!patient) throw new Error(`Patient '${patient_id}' not found`);

    let doctorId = data.doctor_id || null;
    let doctorName = data.doctor_name || 'Dr. Emily Chen, MD';

    if (user?.role === 'doctor') {
      const doc = this.db.prepare('SELECT id, name FROM doctors WHERE user_id = ?').get(user.id);
      if (doc) {
        doctorId = doc.id;
        doctorName = doc.name;
      }
    } else if (doctorId) {
      const doc = this.db.prepare('SELECT id, name FROM doctors WHERE id = ?').get(doctorId);
      if (doc) doctorName = doc.name;
    }

    const rxId = generateId('RX');

    this.db.prepare(`
      INSERT INTO prescriptions (id, patient_id, patient_name, doctor_id, doctor_name, appointment_id, diagnosis, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(rxId, patient.id, patient.name, doctorId || 'DOC-GEN', doctorName, appointment_id, diagnosis);

    const insertItem = this.db.prepare(`
      INSERT INTO prescription_items (id, prescription_id, medicine_id, medicine_name, dosage, frequency, duration_days, quantity, unit_price, dispensed_quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `);

    for (const item of items) {
      const med = this.db.prepare('SELECT id, name, unit_price FROM medicines WHERE id = ?').get(item.medicine_id);
      if (!med) throw new Error(`Medicine item '${item.medicine_id}' does not exist in formulary`);

      const itemId = generateId('RXI');
      const qty = parseInt(item.quantity, 10) || 30;
      insertItem.run(
        itemId,
        rxId,
        med.id,
        item.medicine_name || med.name,
        item.dosage || 'Standard dose',
        item.frequency || 'Once daily',
        parseInt(item.duration_days, 10) || 30,
        qty,
        item.unit_price || med.unit_price
      );
    }

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'PRESCRIPTION_CREATED',
      module: 'pharmacy',
      details: `Prescription ${rxId} written for ${patient.name} with ${items.length} item(s)`
    });

    eventBus.emit('pharmacy:prescription_created', {
      prescriptionId: rxId,
      patientId: patient.id,
      patientName: patient.name,
      doctorName
    });

    return this.getPrescriptionById(rxId);
  }

  dispensePrescription(id, user) {
    const rx = this.getPrescriptionById(id);
    if (rx.status === 'dispensed') {
      throw new Error(`Prescription '${id}' is already dispensed`);
    }
    if (rx.status === 'cancelled') {
      throw new Error(`Cannot dispense cancelled prescription '${id}'`);
    }

    // Check inventory availability for all items first
    for (const item of rx.items) {
      const med = this.db.prepare('SELECT id, name, stock_quantity FROM medicines WHERE id = ?').get(item.medicine_id);
      if (!med) {
        throw new Error(`Medicine '${item.medicine_name}' no longer exists in inventory`);
      }
      if (med.stock_quantity < item.quantity) {
        throw new Error(`Insufficient stock for '${med.name}'. In stock: ${med.stock_quantity}, Required: ${item.quantity}`);
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const dispenserName = user?.name || 'Michael Chang (Pharmacist)';

    // Deduct stock and mark prescription dispensed
    for (const item of rx.items) {
      const med = this.db.prepare('SELECT stock_quantity, reorder_level FROM medicines WHERE id = ?').get(item.medicine_id);
      const newStock = med.stock_quantity - item.quantity;
      let newStatus = 'in_stock';
      if (newStock <= 0) {
        newStatus = 'out_of_stock';
      } else if (newStock <= med.reorder_level) {
        newStatus = 'low_stock';
      }

      this.db.prepare(`
        UPDATE medicines
        SET stock_quantity = ?, status = ?
        WHERE id = ?
      `).run(newStock, newStatus, item.medicine_id);

      this.db.prepare(`
        UPDATE prescription_items
        SET dispensed_quantity = quantity
        WHERE id = ?
      `).run(item.id);
    }

    this.db.prepare(`
      UPDATE prescriptions
      SET status = 'dispensed', dispensed_by = ?, dispensed_at = ?
      WHERE id = ?
    `).run(dispenserName, todayStr, id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'PRESCRIPTION_DISPENSED',
      module: 'pharmacy',
      details: `Prescription ${id} for ${rx.patient_name} dispensed by ${dispenserName}`
    });

    eventBus.emit('pharmacy:dispensed', {
      prescriptionId: id,
      patientId: rx.patient_id,
      patientName: rx.patient_name,
      items: rx.items
    });

    return this.getPrescriptionById(id);
  }

  cancelPrescription(id, reason, user) {
    const rx = this.getPrescriptionById(id);
    if (rx.status === 'dispensed') {
      throw new Error(`Cannot cancel an already dispensed prescription '${id}'`);
    }

    this.db.prepare(`
      UPDATE prescriptions
      SET status = 'cancelled'
      WHERE id = ?
    `).run(id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'PRESCRIPTION_CANCELLED',
      module: 'pharmacy',
      details: `Prescription ${id} cancelled. Reason: ${reason || 'Not specified'}`
    });

    return this.getPrescriptionById(id);
  }

  getSummaryMetrics() {
    const totalMedicines = this.db.prepare('SELECT COUNT(*) as count FROM medicines').get().count;
    const lowStock = this.db.prepare("SELECT COUNT(*) as count FROM medicines WHERE status = 'low_stock'").get().count;
    const outOfStock = this.db.prepare("SELECT COUNT(*) as count FROM medicines WHERE status = 'out_of_stock'").get().count;
    const totalPrescriptions = this.db.prepare('SELECT COUNT(*) as count FROM prescriptions').get().count;
    const pendingPrescriptions = this.db.prepare("SELECT COUNT(*) as count FROM prescriptions WHERE status = 'pending'").get().count;
    const dispensedPrescriptions = this.db.prepare("SELECT COUNT(*) as count FROM prescriptions WHERE status = 'dispensed'").get().count;

    return {
      totalMedicines,
      lowStock,
      outOfStock,
      inStock: totalMedicines - (lowStock + outOfStock),
      totalPrescriptions,
      pendingPrescriptions,
      dispensedPrescriptions
    };
  }
}

module.exports = new PharmacyService();

