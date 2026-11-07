/**
 * Patient Management Service
 */
const { getDatabase } = require('../../core/database');
const { generateId, hashPassword } = require('../../core/security');
const eventBus = require('../../core/event-bus');

class PatientService {
  constructor() {
    this.db = getDatabase();
  }

  getAll(filters = {}) {
    let query = `
      SELECT p.*, b.room_number, b.bed_number, b.ward_type 
      FROM patients p
      LEFT JOIN beds b ON p.bed_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND p.status = ?';
      params.push(filters.status);
    }

    if (filters.blood_group) {
      query += ' AND p.blood_group = ?';
      params.push(filters.blood_group);
    }

    if (filters.search) {
      query += ' AND (p.name LIKE ? OR p.id LIKE ? OR p.phone LIKE ? OR p.email LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY p.created_at DESC';
    return this.db.prepare(query).all(...params);
  }

  getById(id) {
    const patient = this.db.prepare(`
      SELECT p.*, b.room_number, b.bed_number, b.ward_type, b.daily_rate
      FROM patients p
      LEFT JOIN beds b ON p.bed_id = b.id
      WHERE p.id = ?
    `).get(id);

    if (!patient) {
      throw new Error(`Patient with ID '${id}' not found`);
    }

    // Medical history records
    const medicalRecords = this.db.prepare(`
      SELECT * FROM medical_records
      WHERE patient_id = ?
      ORDER BY created_at DESC
    `).all(id);

    // Admissions history
    const admissions = this.db.prepare(`
      SELECT a.*, b.room_number, b.bed_number, b.ward_type
      FROM patient_admissions a
      LEFT JOIN beds b ON a.bed_id = b.id
      WHERE a.patient_id = ?
      ORDER BY a.admission_date DESC
    `).all(id);

    // Appointments history
    const appointments = this.db.prepare(`
      SELECT * FROM appointments
      WHERE patient_id = ?
      ORDER BY appointment_date DESC, time_slot DESC
    `).all(id);

    // Invoices history
    const invoices = this.db.prepare(`
      SELECT * FROM invoices
      WHERE patient_id = ?
      ORDER BY issue_date DESC
    `).all(id);

    return {
      ...patient,
      medical_records: medicalRecords,
      admissions,
      appointments,
      invoices
    };
  }

  create(data, user) {
    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      blood_group = '',
      phone,
      email = '',
      address = '',
      emergency_contact_name = '',
      emergency_contact_phone = '',
      insurance_provider = '',
      insurance_policy_number = '',
      allergies = '',
      chronic_conditions = '',
      create_portal_account = false,
      initial_password = 'Patient123!'
    } = data;

    if (!first_name || !last_name || !date_of_birth || !gender || !phone) {
      throw new Error('First name, last name, date of birth, gender, and phone number are required');
    }

    const fullName = `${first_name.trim()} ${last_name.trim()}`;
    const patientId = generateId('PAT');
    let userId = null;

    if (email) {
      const existingUser = this.db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
      if (existingUser) {
        userId = existingUser.id;
      } else if (create_portal_account) {
        userId = generateId('USR');
        const passHash = hashPassword(initial_password);
        this.db.prepare(`
          INSERT INTO users (id, email, password_hash, name, role, phone, is_active)
          VALUES (?, ?, ?, ?, 'patient', ?, 1)
        `).run(userId, email, passHash, fullName, phone);
      }
    }

    this.db.prepare(`
      INSERT INTO patients (
        id, user_id, first_name, last_name, name, date_of_birth, gender,
        blood_group, phone, email, address, emergency_contact_name,
        emergency_contact_phone, insurance_provider, insurance_policy_number,
        status, allergies, chronic_conditions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'outpatient', ?, ?)
    `).run(
      patientId,
      userId,
      first_name.trim(),
      last_name.trim(),
      fullName,
      date_of_birth,
      gender,
      blood_group,
      phone,
      email,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      insurance_provider,
      insurance_policy_number,
      allergies,
      chronic_conditions
    );

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'PATIENT_REGISTERED',
      module: 'patients',
      details: `Patient ${fullName} (${patientId}) registered`
    });

    eventBus.emit('patient.registered', { patientId, name: fullName });

    return this.getById(patientId);
  }

  update(id, data, user) {
    const existing = this.db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    if (!existing) {
      throw new Error(`Patient with ID '${id}' not found`);
    }

    const first_name = data.first_name !== undefined ? data.first_name.trim() : existing.first_name;
    const last_name = data.last_name !== undefined ? data.last_name.trim() : existing.last_name;
    const name = `${first_name} ${last_name}`;
    const date_of_birth = data.date_of_birth !== undefined ? data.date_of_birth : existing.date_of_birth;
    const gender = data.gender !== undefined ? data.gender : existing.gender;
    const blood_group = data.blood_group !== undefined ? data.blood_group : existing.blood_group;
    const phone = data.phone !== undefined ? data.phone : existing.phone;
    const email = data.email !== undefined ? data.email : existing.email;
    const address = data.address !== undefined ? data.address : existing.address;
    const emergency_contact_name = data.emergency_contact_name !== undefined ? data.emergency_contact_name : existing.emergency_contact_name;
    const emergency_contact_phone = data.emergency_contact_phone !== undefined ? data.emergency_contact_phone : existing.emergency_contact_phone;
    const insurance_provider = data.insurance_provider !== undefined ? data.insurance_provider : existing.insurance_provider;
    const insurance_policy_number = data.insurance_policy_number !== undefined ? data.insurance_policy_number : existing.insurance_policy_number;
    const allergies = data.allergies !== undefined ? data.allergies : existing.allergies;
    const chronic_conditions = data.chronic_conditions !== undefined ? data.chronic_conditions : existing.chronic_conditions;

    this.db.prepare(`
      UPDATE patients SET
        first_name = ?, last_name = ?, name = ?, date_of_birth = ?, gender = ?,
        blood_group = ?, phone = ?, email = ?, address = ?, emergency_contact_name = ?,
        emergency_contact_phone = ?, insurance_provider = ?, insurance_policy_number = ?,
        allergies = ?, chronic_conditions = ?
      WHERE id = ?
    `).run(
      first_name, last_name, name, date_of_birth, gender,
      blood_group, phone, email, address, emergency_contact_name,
      emergency_contact_phone, insurance_provider, insurance_policy_number,
      allergies, chronic_conditions, id
    );

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'PATIENT_UPDATED',
      module: 'patients',
      details: `Patient details updated for ${name} (${id})`
    });

    return this.getById(id);
  }

  admit(patientId, { bed_id, reason = '', doctor_id = null, notes = '' }, user) {
    const patient = this.db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) throw new Error(`Patient '${patientId}' not found`);

    if (patient.status === 'admitted') {
      throw new Error(`Patient '${patient.name}' is already admitted to bed ${patient.bed_id}`);
    }

    const bed = this.db.prepare('SELECT * FROM beds WHERE id = ?').get(bed_id);
    if (!bed) throw new Error(`Bed '${bed_id}' not found`);

    if (bed.status !== 'available') {
      throw new Error(`Bed '${bed.room_number}-${bed.bed_number}' is not available (Current status: ${bed.status})`);
    }

    const admissionId = generateId('ADM');
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Update Bed
    this.db.prepare(`
      UPDATE beds 
      SET status = 'occupied', current_patient_id = ?, current_patient_name = ?, admitted_at = ?
      WHERE id = ?
    `).run(patientId, patient.name, nowStr, bed_id);

    // Update Patient
    this.db.prepare(`
      UPDATE patients 
      SET status = 'admitted', bed_id = ?
      WHERE id = ?
    `).run(bed_id, patientId);

    // Record Admission
    this.db.prepare(`
      INSERT INTO patient_admissions (id, patient_id, bed_id, admission_date, reason, doctor_id, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, 'admitted', ?)
    `).run(admissionId, patientId, bed_id, nowStr, reason, doctor_id, notes);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'PATIENT_ADMITTED',
      module: 'patients',
      details: `Patient ${patient.name} admitted to ${bed.room_number} (${bed.bed_number})`
    });

    eventBus.emit('patient.admitted', { patientId, bedId: bed_id, admissionId });

    return this.getById(patientId);
  }

  discharge(patientId, { notes = '' } = {}, user) {
    const patient = this.db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) throw new Error(`Patient '${patientId}' not found`);

    if (patient.status !== 'admitted') {
      throw new Error(`Patient '${patient.name}' is not currently admitted`);
    }

    const bedId = patient.bed_id;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (bedId) {
      // Clear Bed
      this.db.prepare(`
        UPDATE beds 
        SET status = 'available', current_patient_id = NULL, current_patient_name = NULL, admitted_at = NULL
        WHERE id = ?
      `).run(bedId);
    }

    // Update latest admission record
    this.db.prepare(`
      UPDATE patient_admissions 
      SET discharge_date = ?, status = 'discharged', notes = COALESCE(notes || ' ', '') || ?
      WHERE patient_id = ? AND status = 'admitted'
    `).run(nowStr, notes ? `Discharge notes: ${notes}` : '', patientId);

    // Update Patient Status
    this.db.prepare(`
      UPDATE patients 
      SET status = 'discharged', bed_id = NULL
      WHERE id = ?
    `).run(patientId);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'PATIENT_DISCHARGED',
      module: 'patients',
      details: `Patient ${patient.name} discharged from hospital`
    });

    eventBus.emit('patient.discharged', { patientId, bedId });

    return this.getById(patientId);
  }

  addMedicalRecord(patientId, data, user) {
    const patient = this.db.prepare('SELECT name FROM patients WHERE id = ?').get(patientId);
    if (!patient) throw new Error(`Patient '${patientId}' not found`);

    const {
      record_type = 'consultation',
      diagnosis = '',
      prescription = '',
      symptoms = '',
      vitals = null,
      notes = '',
      appointment_id = null
    } = data;

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

    const recordId = generateId('REC');
    const vitalsStr = typeof vitals === 'object' && vitals !== null ? JSON.stringify(vitals) : (vitals || null);

    this.db.prepare(`
      INSERT INTO medical_records (id, patient_id, doctor_id, doctor_name, appointment_id, record_type, diagnosis, prescription, symptoms, vitals, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(recordId, patientId, doctorId, doctorName, appointment_id, record_type, diagnosis, prescription, symptoms, vitalsStr, notes);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'MEDICAL_RECORD_ADDED',
      module: 'patients',
      details: `Medical record (${record_type}) added for ${patient.name}`
    });

    return this.db.prepare('SELECT * FROM medical_records WHERE id = ?').get(recordId);
  }

  delete(id, user) {
    const patient = this.db.prepare('SELECT * FROM patients WHERE id = ?').get(id);
    if (!patient) throw new Error(`Patient '${id}' not found`);

    if (patient.status === 'admitted') {
      throw new Error(`Cannot delete patient '${patient.name}' while actively admitted. Discharge first.`);
    }

    this.db.prepare('DELETE FROM medical_records WHERE patient_id = ?').run(id);
    this.db.prepare('DELETE FROM patient_admissions WHERE patient_id = ?').run(id);
    this.db.prepare('DELETE FROM patients WHERE id = ?').run(id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'PATIENT_DELETED',
      module: 'patients',
      details: `Patient ${patient.name} (${id}) deleted`
    });

    return { success: true, message: `Patient ${patient.name} deleted successfully` };
  }
}

module.exports = new PatientService();

