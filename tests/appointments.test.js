const test = require('node:test');
const assert = require('node:assert');
const appointmentService = require('../src/modules/appointments/appointment.service');
const patientService = require('../src/modules/patients/patient.service');
const doctorService = require('../src/modules/doctors/doctor.service');
const { getDatabase } = require('../src/core/database');

// Clean up any future test appointments to ensure test idempotency
test.beforeEach(() => {
  const db = getDatabase();
  db.prepare("DELETE FROM appointments WHERE appointment_date >= '2027-01-01'").run();
});

test('Appointments: List appointments and filter by doctor/status', () => {
  const all = appointmentService.getAll();
  assert.ok(all.length >= 3, 'Must have seeded appointments');

  const docAppointments = appointmentService.getAll({ doctor_id: 'DOC-CHEN' });
  assert.ok(docAppointments.length >= 1);
});

test('Appointments: Book appointment successfully', () => {
  const patients = patientService.getAll();
  const doctors = doctorService.getAll();

  const randomDay = 10 + Math.floor(Math.random() * 18);
  const testDate = `2027-01-${String(randomDay).padStart(2, '0')}`;
  const testSlot = '02:00 PM - 02:30 PM';

  const apt = appointmentService.create({
    patient_id: patients[0].id,
    doctor_id: doctors[0].id,
    appointment_date: testDate,
    time_slot: testSlot,
    reason: 'Routine quarterly checkup',
    type: 'follow_up'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(apt.id);
  assert.strictEqual(apt.patient_id, patients[0].id);
  assert.strictEqual(apt.doctor_id, doctors[0].id);
  assert.strictEqual(apt.appointment_date, testDate);
  assert.strictEqual(apt.status, 'scheduled');

  // Conflict test: Attempt to book the same doctor at the same slot
  assert.throws(
    () => appointmentService.create({
      patient_id: patients[1].id,
      doctor_id: doctors[0].id,
      appointment_date: testDate,
      time_slot: testSlot,
      reason: 'Another patient trying to double-book'
    }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' }),
    /already has a confirmed appointment/
  );
});

test('Appointments: Status lifecycle progression', () => {
  const patients = patientService.getAll();
  const doctors = doctorService.getAll();

  const randomDay = 10 + Math.floor(Math.random() * 18);
  const aptDate = `2027-02-${String(randomDay).padStart(2, '0')}`;

  const apt = appointmentService.create({
    patient_id: patients[0].id,
    doctor_id: doctors[1].id,
    appointment_date: aptDate,
    time_slot: '09:00 AM - 09:30 AM',
    reason: 'Initial consultation'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  // 1. Confirm
  const confirmed = appointmentService.updateStatus(apt.id, 'confirmed', {}, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });
  assert.strictEqual(confirmed.status, 'confirmed');

  // 2. In-Progress
  const inProg = appointmentService.updateStatus(apt.id, 'in_progress', {}, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });
  assert.strictEqual(inProg.status, 'in_progress');

  // 3. Complete (with prescription notes)
  const completed = appointmentService.updateStatus(apt.id, 'completed', {
    notes: 'Consultation concluded successfully',
    prescription_notes: 'Amoxicillin 500mg TID for 7 days'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.strictEqual(completed.status, 'completed');
  assert.strictEqual(completed.prescription_notes, 'Amoxicillin 500mg TID for 7 days');
});

test('Appointments: Reschedule appointment to another slot', () => {
  const patients = patientService.getAll();
  const doctors = doctorService.getAll();

  const randomDay = 10 + Math.floor(Math.random() * 15);
  const initialDate = `2027-03-${String(randomDay).padStart(2, '0')}`;
  const targetDate = `2027-03-${String(randomDay + 1).padStart(2, '0')}`;

  const apt = appointmentService.create({
    patient_id: patients[0].id,
    doctor_id: doctors[0].id,
    appointment_date: initialDate,
    time_slot: '10:00 AM - 10:30 AM',
    reason: 'Holiday check'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  const rescheduled = appointmentService.reschedule(apt.id, {
    appointment_date: targetDate,
    time_slot: '11:00 AM - 11:30 AM'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.strictEqual(rescheduled.appointment_date, targetDate);
  assert.strictEqual(rescheduled.time_slot, '11:00 AM - 11:30 AM');
});
