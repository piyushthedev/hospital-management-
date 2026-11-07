/**
 * Doctor Management Service
 */
const { getDatabase } = require('../../core/database');
const { generateId, hashPassword } = require('../../core/security');
const eventBus = require('../../core/event-bus');

class DoctorService {
  constructor() {
    this.db = getDatabase();
  }

  getAll(filters = {}) {
    let query = 'SELECT * FROM doctors WHERE 1=1';
    const params = [];

    if (filters.department_id) {
      query += ' AND department_id = ?';
      params.push(filters.department_id);
    }

    if (filters.availability_status) {
      query += ' AND availability_status = ?';
      params.push(filters.availability_status);
    }

    if (filters.search) {
      query += ' AND (name LIKE ? OR specialization LIKE ? OR qualification LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY name ASC';
    return this.db.prepare(query).all(...params);
  }

  getById(id) {
    const doctor = this.db.prepare('SELECT * FROM doctors WHERE id = ?').get(id);
    if (!doctor) {
      throw new Error(`Doctor with ID '${id}' not found`);
    }

    const appointments = this.db.prepare(`
      SELECT a.*, p.blood_group, p.phone as patient_phone 
      FROM appointments a
      LEFT JOIN patients p ON a.patient_id = p.id
      WHERE a.doctor_id = ?
      ORDER BY a.appointment_date DESC, a.time_slot ASC
      LIMIT 20
    `).all(id);

    return {
      ...doctor,
      appointments
    };
  }

  create(data, user) {
    const {
      name,
      email,
      phone = '',
      department_id,
      specialization,
      license_number,
      qualification = '',
      experience_years = 0,
      consultation_fee = 50.0,
      schedule_days = 'Mon,Tue,Wed,Thu,Fri',
      shift_hours = '09:00 - 17:00',
      room_number = '',
      create_user_account = false,
      initial_password = 'Doctor123!'
    } = data;

    if (!name || !email || !department_id || !specialization || !license_number) {
      throw new Error('Name, email, department, specialization, and license number are required');
    }

    const dept = this.db.prepare('SELECT name FROM departments WHERE id = ?').get(department_id);
    if (!dept) {
      throw new Error(`Department '${department_id}' not found`);
    }

    const existingLic = this.db.prepare('SELECT id FROM doctors WHERE license_number = ?').get(license_number);
    if (existingLic) {
      throw new Error(`Doctor with license number '${license_number}' already registered`);
    }

    let userId = null;
    const existingUser = this.db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
    if (existingUser) {
      userId = existingUser.id;
    } else if (create_user_account) {
      userId = generateId('USR');
      const passHash = hashPassword(initial_password);
      this.db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, phone, is_active)
        VALUES (?, ?, ?, ?, 'doctor', ?, 1)
      `).run(userId, email, passHash, name, phone);
    }

    const doctorId = generateId('DOC');
    this.db.prepare(`
      INSERT INTO doctors (
        id, user_id, name, email, phone, department_id, department_name,
        specialization, license_number, qualification, experience_years,
        consultation_fee, availability_status, schedule_days, shift_hours, room_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, ?)
    `).run(
      doctorId,
      userId,
      name,
      email,
      phone,
      department_id,
      dept.name,
      specialization,
      license_number,
      qualification,
      parseInt(experience_years, 10) || 0,
      parseFloat(consultation_fee) || 50.0,
      schedule_days,
      shift_hours,
      room_number
    );

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'DOCTOR_REGISTERED',
      module: 'doctors',
      details: `Doctor ${name} (${doctorId}) added to ${dept.name}`
    });

    return this.getById(doctorId);
  }

  update(id, data, user) {
    const existing = this.db.prepare('SELECT * FROM doctors WHERE id = ?').get(id);
    if (!existing) {
      throw new Error(`Doctor with ID '${id}' not found`);
    }

    let deptName = existing.department_name;
    if (data.department_id && data.department_id !== existing.department_id) {
      const dept = this.db.prepare('SELECT name FROM departments WHERE id = ?').get(data.department_id);
      if (!dept) throw new Error(`Department '${data.department_id}' not found`);
      deptName = dept.name;
    }

    const name = data.name !== undefined ? data.name : existing.name;
    const email = data.email !== undefined ? data.email : existing.email;
    const phone = data.phone !== undefined ? data.phone : existing.phone;
    const department_id = data.department_id !== undefined ? data.department_id : existing.department_id;
    const specialization = data.specialization !== undefined ? data.specialization : existing.specialization;
    const qualification = data.qualification !== undefined ? data.qualification : existing.qualification;
    const experience_years = data.experience_years !== undefined ? parseInt(data.experience_years, 10) : existing.experience_years;
    const consultation_fee = data.consultation_fee !== undefined ? parseFloat(data.consultation_fee) : existing.consultation_fee;
    const availability_status = data.availability_status !== undefined ? data.availability_status : existing.availability_status;
    const schedule_days = data.schedule_days !== undefined ? data.schedule_days : existing.schedule_days;
    const shift_hours = data.shift_hours !== undefined ? data.shift_hours : existing.shift_hours;
    const room_number = data.room_number !== undefined ? data.room_number : existing.room_number;

    this.db.prepare(`
      UPDATE doctors SET
        name = ?, email = ?, phone = ?, department_id = ?, department_name = ?,
        specialization = ?, qualification = ?, experience_years = ?,
        consultation_fee = ?, availability_status = ?, schedule_days = ?,
        shift_hours = ?, room_number = ?
      WHERE id = ?
    `).run(
      name, email, phone, department_id, deptName,
      specialization, qualification, experience_years,
      consultation_fee, availability_status, schedule_days,
      shift_hours, room_number, id
    );

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'DOCTOR_UPDATED',
      module: 'doctors',
      details: `Doctor ${name} (${id}) profile updated`
    });

    return this.getById(id);
  }

  updateAvailability(id, status, user) {
    const validStatuses = ['available', 'in_consultation', 'on_leave', 'off_duty'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const doc = this.db.prepare('SELECT name FROM doctors WHERE id = ?').get(id);
    if (!doc) {
      throw new Error(`Doctor with ID '${id}' not found`);
    }

    this.db.prepare('UPDATE doctors SET availability_status = ? WHERE id = ?').run(status, id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'DOCTOR_AVAILABILITY_CHANGED',
      module: 'doctors',
      details: `Doctor ${doc.name} status updated to ${status}`
    });

    return { id, availability_status: status };
  }

  getSchedule(id, dateStr) {
    const doc = this.db.prepare('SELECT id, name, schedule_days, shift_hours FROM doctors WHERE id = ?').get(id);
    if (!doc) throw new Error(`Doctor with ID '${id}' not found`);

    const appointments = this.db.prepare(`
      SELECT id, patient_name, time_slot, status, type 
      FROM appointments 
      WHERE doctor_id = ? AND appointment_date = ? AND status != 'cancelled'
      ORDER BY time_slot ASC
    `).all(id, dateStr);

    const standardSlots = [
      '09:00 AM - 09:30 AM',
      '09:30 AM - 10:00 AM',
      '10:00 AM - 10:30 AM',
      '10:30 AM - 11:00 AM',
      '11:00 AM - 11:30 AM',
      '11:30 AM - 12:00 PM',
      '02:00 PM - 02:30 PM',
      '02:30 PM - 03:00 PM',
      '03:00 PM - 03:30 PM',
      '03:30 PM - 04:00 PM',
      '04:00 PM - 04:30 PM'
    ];

    const bookedMap = new Map();
    appointments.forEach(apt => bookedMap.set(apt.time_slot, apt));

    const schedule = standardSlots.map(slot => {
      const booked = bookedMap.get(slot);
      return {
        time_slot: slot,
        is_available: !booked,
        appointment: booked || null
      };
    });

    return {
      doctor_id: id,
      doctor_name: doc.name,
      date: dateStr,
      schedule
    };
  }

  delete(id, user) {
    const doc = this.db.prepare('SELECT name FROM doctors WHERE id = ?').get(id);
    if (!doc) throw new Error(`Doctor with ID '${id}' not found`);

    // Check if future scheduled appointments exist
    const today = new Date().toISOString().split('T')[0];
    const pendingCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM appointments 
      WHERE doctor_id = ? AND appointment_date >= ? AND status IN ('scheduled', 'confirmed')
    `).get(id, today).count;

    if (pendingCount > 0) {
      throw new Error(`Cannot delete doctor with ${pendingCount} upcoming appointment(s). Reassign or cancel them first.`);
    }

    this.db.prepare('DELETE FROM doctors WHERE id = ?').run(id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'DOCTOR_DELETED',
      module: 'doctors',
      details: `Doctor ${doc.name} (${id}) removed`
    });

    return { success: true, message: `Doctor ${doc.name} removed successfully` };
  }
}

module.exports = new DoctorService();

