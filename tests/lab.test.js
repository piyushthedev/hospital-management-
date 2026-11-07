const test = require('node:test');
const assert = require('node:assert');
const labService = require('../src/modules/lab/lab.service');
const patientService = require('../src/modules/patients/patient.service');

test('Lab: List all diagnostic catalog tests', () => {
  const tests = labService.getAllTests();
  assert.ok(tests.length >= 4, 'Must have seeded lab tests');
  const cbc = tests.find(t => t.code === 'CBC');
  assert.ok(cbc, 'CBC test must exist');
  assert.strictEqual(cbc.category, 'Hematology');
});

test('Lab: Create a new diagnostic test definition', () => {
  const code = `TEST-${Date.now().toString().slice(-4)}`;
  const created = labService.createTest({
    name: 'Thyroid Stimulating Hormone (TSH) Assay',
    code,
    category: 'Endocrine',
    price: 65.0,
    normal_range: '0.4 - 4.0 mIU/L',
    sample_type: 'Serum'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(created.id);
  assert.strictEqual(created.code, code);
  assert.strictEqual(created.price, 65.0);
});

test('Lab: Order diagnostic test for patient and update results to completed', () => {
  const patients = patientService.getAll();
  const patient = patients[0];
  const tests = labService.getAllTests();
  const testObj = tests[0];

  // 1. Place Order
  const order = labService.createOrder({
    patient_id: patient.id,
    test_id: testObj.id,
    notes: 'Urgent pre-op diagnostic assessment'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(order.id);
  assert.strictEqual(order.patient_id, patient.id);
  assert.strictEqual(order.status, 'ordered');

  // 2. Status Transition: sample_collected
  const step1 = labService.updateOrderStatus(order.id, 'sample_collected', {}, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });
  assert.strictEqual(step1.status, 'sample_collected');

  // 3. Complete and attach results
  const completed = labService.updateOrderStatus(order.id, 'completed', {
    result_value: 'Within normal limits (WBC: 6.2 K/uL, Hb: 14.8 g/dL)',
    notes: 'No abnormalities detected.'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.strictEqual(completed.status, 'completed');
  assert.ok(completed.result_value.includes('Within normal limits'));
  assert.ok(completed.completed_at);

  // 4. Verify result is automatically reflected in patient medical records
  const updatedPat = patientService.getById(patient.id);
  const foundRec = updatedPat.medical_records.find(r => r.record_type === 'lab_result' && r.diagnosis.includes(testObj.name));
  assert.ok(foundRec, 'Completed lab report must be linked to patient medical chart');
});

