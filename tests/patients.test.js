const test = require('node:test');
const assert = require('node:assert');
const patientService = require('../src/modules/patients/patient.service');
const { getDatabase } = require('../src/core/database');

test('Patients: List patients and filter by status', () => {
  const patients = patientService.getAll();
  assert.ok(patients.length >= 4, 'Must have seeded patients');

  const admittedPatients = patientService.getAll({ status: 'admitted' });
  assert.ok(admittedPatients.length >= 1, 'Must have admitted patients');
  assert.strictEqual(admittedPatients[0].status, 'admitted');
});

test('Patients: Register new patient profile', () => {
  const patient = patientService.create({
    first_name: 'Arthur',
    last_name: 'Pendleton',
    date_of_birth: '1978-05-12',
    gender: 'Male',
    blood_group: 'O-',
    phone: '+1 (555) 999-1234',
    email: `arthur.${Date.now()}@example.com`,
    address: '42 Baker Street, Metro City',
    emergency_contact_name: 'Gwen Pendleton (Sister)',
    emergency_contact_phone: '+1 (555) 999-5678',
    insurance_provider: 'Blue Cross Shield',
    insurance_policy_number: 'BC-99201-P',
    allergies: 'Latex, Iodine',
    chronic_conditions: 'High Cholesterol'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(patient.id);
  assert.strictEqual(patient.name, 'Arthur Pendleton');
  assert.strictEqual(patient.blood_group, 'O-');
  assert.strictEqual(patient.status, 'outpatient');
});

test('Patients: Add medical record with clinical vitals', () => {
  const patients = patientService.getAll();
  const patient = patients[0];

  const record = patientService.addMedicalRecord(patient.id, {
    doctor_id: 'DOC-CHEN',
    record_type: 'vitals',
    diagnosis: 'Routine Vital Signs Assessment',
    symptoms: 'Patient reports feeling fatigue',
    vitals: {
      bp: '120/80 mmHg',
      hr: '72 bpm',
      temp: '98.6 F',
      spo2: '99%'
    },
    notes: 'Vitals stable. Continue current regimen.'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(record.id);
  assert.strictEqual(record.patient_id, patient.id);
  assert.ok(record.vitals.includes('120/80'));

  const full = patientService.getById(patient.id);
  const found = full.medical_records.find(r => r.id === record.id);
  assert.ok(found, 'Record must be in patient medical records list');
});

test('Patients: Admit patient to available bed and then discharge', () => {
  const db = getDatabase();
  
  // Find an available bed
  const bed = db.prepare("SELECT id, room_number FROM beds WHERE status = 'available' LIMIT 1").get();
  assert.ok(bed, 'An available bed must exist for testing admission');

  // Register a fresh patient for admission
  const freshPatient = patientService.create({
    first_name: 'Charlotte',
    last_name: 'Bronte',
    date_of_birth: '1990-04-21',
    gender: 'Female',
    blood_group: 'B-',
    phone: '+1 (555) 888-2233'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  // Admit
  const admitted = patientService.admit(freshPatient.id, {
    bed_id: bed.id,
    reason: 'Observation for severe bronchitis',
    notes: 'Nebulizer treatment every 4 hours'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.strictEqual(admitted.status, 'admitted');
  assert.strictEqual(admitted.bed_id, bed.id);

  // Check bed is now occupied
  const updatedBed = db.prepare('SELECT status, current_patient_id FROM beds WHERE id = ?').get(bed.id);
  assert.strictEqual(updatedBed.status, 'occupied');
  assert.strictEqual(updatedBed.current_patient_id, freshPatient.id);

  // Discharge
  const discharged = patientService.discharge(freshPatient.id, {
    notes: 'Condition resolved satisfactorily, prescribed oral antibiotics.'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.strictEqual(discharged.status, 'discharged');
  assert.strictEqual(discharged.bed_id, null);

  // Check bed is released back to available
  const freedBed = db.prepare('SELECT status, current_patient_id FROM beds WHERE id = ?').get(bed.id);
  assert.strictEqual(freedBed.status, 'available');
  assert.strictEqual(freedBed.current_patient_id, null);
});
