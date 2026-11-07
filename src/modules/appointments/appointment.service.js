/**
 * Appointment Scheduling Service
 */
const { getDatabase } = require('../../core/database');
const { generateId } = require('../../core/security');
const eventBus = require('../../core/event-bus');

class AppointmentService {
  constructor() {
    this.db = getDatabase();
  }

  getAll(filters = {}) {
    let query = 'SELECT * FROM appointments WHERE 1=1';
    const params = [];

    if (filters.doctor_id) {
      query += ' AND doctor_id = ?';
      params.push(filters.doctor_id);
    }

    if (filters.patient_id) {
      query += ' AND patient_id = ?';
      params.push(filters.patient_id);
    }

    if (filters.department_id) {
      query += ' AND department_id = ?';
      params.push(filters.department_id);
    }

    if (filters.date) {
      query += ' AND appointment_date = ?';
      params.push(filters.date);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY appointment_date DESC, time_slot ASC';
    return this.db.prepare(query).all(...params);
  }

  getById(id) {
    const apt = this.db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    if (!apt) {
      throw new Error(`Appointment with ID '${id}' not found`);
    }
    return apt;
  }

  create(data, user) {
    const {
      patient_id,
      doctor_id,
      appointment_date,
      time_slot,
      reason = 'Routine Consultation',
      type = 'general_checkup',
      notes = ''
    } = data;

    if (!patient_id || !doctor_id || !appointment_date || !time_slot) {
      throw new Error('Patient, doctor, appointment date, and time slot are required');
    }

    const patient = this.db.prepare('SELECT id, name FROM patients WHERE id = ?').get(patient_id);
    if (!patient) throw new Error(`Patient '${patient_id}' not found`);

    const doctor = this.db.prepare('SELECT id, name, department_id, department_name, consultation_fee FROM doctors WHERE id = ?').get(doctor_id);
    if (!doctor) throw new Error(`Doctor '${doctor_id}' not found`);

    // Check conflict: Is the doctor already booked for this slot?
    const conflict = this.db.prepare(`
      SELECT id, patient_name FROM appointments 
      WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ? AND status NOT IN ('cancelled', 'no_show')
    `).get(doctor_id, appointment_date, time_slot);

    if (conflict) {
      throw new Error(`Doctor ${doctor.name} already has a confirmed appointment at ${time_slot} on ${appointment_date}`);
    }

    const aptId = generateId('APT');

    this.db.prepare(`
      INSERT INTO appointments (
        id, patient_id, patient_name, doctor_id, doctor_name,
        department_id, department_name, appointment_date, time_slot,
        reason, type, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
    `).run(
      aptId,
      patient.id,
      patient.name,
      doctor.id,
      doctor.name,
      doctor.department_id,
      doctor.department_name,
      appointment_date,
      time_slot,
      reason,
      type,
      notes
    );

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'APPOINTMENT_BOOKED',
      module: 'appointments',
      details: `Appointment booked for ${patient.name} with ${doctor.name} on ${appointment_date} (${time_slot})`
    });

    eventBus.emit('appointment.created', {
      appointmentId: aptId,
      patientId: patient.id,
      patientName: patient.name,
      doctorId: doctor.id,
      doctorName: doctor.name,
      consultationFee: doctor.consultation_fee,
      date: appointment_date
    });

    return this.getById(aptId);
  }

  updateStatus(id, status, { notes = '', prescription_notes = '' } = {}, user) {
    const validStatuses = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const apt = this.db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    if (!apt) throw new Error(`Appointment '${id}' not found`);

    this.db.prepare(`
      UPDATE appointments SET
        status = ?,
        notes = CASE WHEN ? != '' THEN ? ELSE notes END,
        prescription_notes = CASE WHEN ? != '' THEN ? ELSE prescription_notes END,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(status, notes, notes, prescription_notes, prescription_notes, id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'APPOINTMENT_STATUS_CHANGED',
      module: 'appointments',
      details: `Appointment ${id} status updated to ${status}`
    });

    if (status === 'completed') {
      eventBus.emit('appointment.completed', {
        appointmentId: id,
        patientId: apt.patient_id,
        patientName: apt.patient_name,
        doctorId: apt.doctor_id,
        doctorName: apt.doctor_name,
        date: apt.appointment_date,
        prescriptionNotes: prescription_notes || notes
      });
    }

    return this.getById(id);
  }

  reschedule(id, { appointment_date, time_slot }, user) {
    const apt = this.db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
    if (!apt) throw new Error(`Appointment '${id}' not found`);

    if (!appointment_date || !time_slot) {
      throw new Error('New date and time slot are required for rescheduling');
    }

    // Check conflict
    const conflict = this.db.prepare(`
      SELECT id FROM appointments 
      WHERE doctor_id = ? AND appointment_date = ? AND time_slot = ? AND id != ? AND status NOT IN ('cancelled', 'no_show')
    `).get(apt.doctor_id, appointment_date, time_slot, id);

    if (conflict) {
      throw new Error(`Doctor already has a booking for ${time_slot} on ${appointment_date}`);
    }

    this.db.prepare(`
      UPDATE appointments SET
        appointment_date = ?,
        time_slot = ?,
        status = 'scheduled',
        updated_at = datetime('now')
      WHERE id = ?
    `).run(appointment_date, time_slot, id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'APPOINTMENT_RESCHEDULED',
      module: 'appointments',
      details: `Appointment ${id} rescheduled to ${appointment_date} at ${time_slot}`
    });

    return this.getById(id);
  }

  cancel(id, reason = '', user) {
    return this.updateStatus(id, 'cancelled', { notes: reason ? `Cancellation reason: ${reason}` : '' }, user);
  }
}

module.exports = new AppointmentService();

