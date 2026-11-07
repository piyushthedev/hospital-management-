const test = require('node:test');
const assert = require('node:assert');
const doctorService = require('../src/modules/doctors/doctor.service');

test('Doctors: List all doctors with filters', () => {
  const doctors = doctorService.getAll();
  assert.ok(doctors.length >= 4, 'Must have seeded doctors');

  const cardioDocs = doctorService.getAll({ department_id: 'DEP-CARDIO' });
  assert.ok(cardioDocs.length >= 1, 'Should find cardiology doctor');
  assert.strictEqual(cardioDocs[0].department_id, 'DEP-CARDIO');
});

test('Doctors: Register a new doctor', () => {
  const licNum = `LIC-TEST-${Date.now().toString().slice(-5)}`;
  const doctor = doctorService.create({
    name: 'Dr. Gregory House, MD',
    email: `house.${Date.now()}@hospital.org`,
    phone: '+1 (555) 300-4000',
    department_id: 'DEP-GENMED',
    specialization: 'Diagnostic Medicine & Nephrology',
    license_number: licNum,
    qualification: 'MD, Johns Hopkins University',
    experience_years: 22,
    consultation_fee: 250.0,
    schedule_days: 'Mon,Tue,Wed,Thu',
    shift_hours: '10:00 - 18:00',
    room_number: 'Diagnostic Lab 1'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(doctor.id);
  assert.strictEqual(doctor.license_number, licNum);
  assert.strictEqual(doctor.consultation_fee, 250.0);
  assert.strictEqual(doctor.availability_status, 'available');
});

test('Doctors: Update availability status', () => {
  const docs = doctorService.getAll();
  const doc = docs[0];

  const updated = doctorService.updateAvailability(doc.id, 'in_consultation', { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });
  assert.strictEqual(updated.availability_status, 'in_consultation');

  // Verify retrieval reflects status
  const refreshed = doctorService.getById(doc.id);
  assert.strictEqual(refreshed.availability_status, 'in_consultation');
});

test('Doctors: Retrieve doctor daily schedule', () => {
  const docs = doctorService.getAll();
  const doc = docs[0];
  const todayStr = new Date().toISOString().split('T')[0];

  const scheduleData = doctorService.getSchedule(doc.id, todayStr);
  assert.strictEqual(scheduleData.doctor_id, doc.id);
  assert.ok(Array.isArray(scheduleData.schedule));
  assert.ok(scheduleData.schedule.length > 0);
  assert.ok(scheduleData.schedule[0].time_slot);
});

