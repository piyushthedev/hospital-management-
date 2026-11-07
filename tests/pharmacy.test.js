const test = require('node:test');
const assert = require('node:assert');
const pharmacyService = require('../src/modules/pharmacy/pharmacy.service');
const patientService = require('../src/modules/patients/patient.service');

test('Pharmacy: List medicines and verify seeded formulary catalog', () => {
  const medicines = pharmacyService.getAllMedicines();
  assert.ok(medicines.length >= 6, 'Must have at least 6 seeded medicines');
  const lipitor = medicines.find(m => m.name.includes('Lipitor'));
  assert.ok(lipitor, 'Lipitor must exist in medicines');
  assert.strictEqual(lipitor.category, 'Cardiovascular');
  assert.ok(lipitor.stock_quantity > 0);
});

test('Pharmacy: Create new medicine and verify inventory categorization', () => {
  const code = Date.now().toString().slice(-4);
  const created = pharmacyService.createMedicine({
    name: `Test-Antibiotic-${code}`,
    generic_name: 'Ciprofloxacin',
    category: 'Antibiotics',
    dosage_form: 'Tablet',
    unit_price: 2.25,
    stock_quantity: 15,
    reorder_level: 25
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(created.id);
  assert.strictEqual(created.status, 'low_stock'); // 15 <= 25 => low_stock
  assert.strictEqual(created.unit_price, 2.25);
});

test('Pharmacy: Stock adjustment updates stock quantity and status', () => {
  const code = Date.now().toString().slice(-4);
  const med = pharmacyService.createMedicine({
    name: `Adjustable-${code}`,
    generic_name: 'Ibuprofen',
    category: 'Analgesics',
    dosage_form: 'Tablet',
    unit_price: 0.50,
    stock_quantity: 50,
    reorder_level: 20
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.strictEqual(med.status, 'in_stock');

  // Decrement by 40 -> 10 (which is <= 20, so low_stock)
  const updated1 = pharmacyService.adjustStock(med.id, { adjustment: -40, reason: 'Ward supply transfer' }, { id: 'USR-ADMIN', name: 'Admin' });
  assert.strictEqual(updated1.stock_quantity, 10);
  assert.strictEqual(updated1.status, 'low_stock');

  // Decrement by 10 -> 0 (out_of_stock)
  const updated2 = pharmacyService.adjustStock(med.id, { adjustment: -10, reason: 'Depleted' }, { id: 'USR-ADMIN', name: 'Admin' });
  assert.strictEqual(updated2.stock_quantity, 0);
  assert.strictEqual(updated2.status, 'out_of_stock');

  // Increment by 100 -> 100 (in_stock)
  const updated3 = pharmacyService.adjustStock(med.id, { adjustment: 100, reason: 'New shipment received' }, { id: 'USR-ADMIN', name: 'Admin' });
  assert.strictEqual(updated3.stock_quantity, 100);
  assert.strictEqual(updated3.status, 'in_stock');
});

test('Pharmacy: Create prescription with medication items', () => {
  const patients = patientService.getAll();
  const patient = patients[0];
  const medicines = pharmacyService.getAllMedicines();
  const med = medicines.find(m => m.stock_quantity >= 10);

  const rx = pharmacyService.createPrescription({
    patient_id: patient.id,
    diagnosis: 'Mild hypertension & preventative therapy',
    items: [
      {
        medicine_id: med.id,
        dosage: '10mg',
        frequency: 'Daily morning',
        duration_days: 14,
        quantity: 14
      }
    ]
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(rx.id);
  assert.strictEqual(rx.patient_id, patient.id);
  assert.strictEqual(rx.status, 'pending');
  assert.strictEqual(rx.items.length, 1);
  assert.strictEqual(rx.items[0].quantity, 14);
});

test('Pharmacy: Dispense prescription decrements stock and transitions status', () => {
  const patients = patientService.getAll();
  const patient = patients[0];

  // Create dedicated medicine to test dispensing
  const testMed = pharmacyService.createMedicine({
    name: `DispenseTest-${Date.now().toString().slice(-4)}`,
    category: 'General',
    dosage_form: 'Tablet',
    unit_price: 1.0,
    stock_quantity: 30,
    reorder_level: 10
  }, { id: 'USR-ADMIN', name: 'Admin' });

  const rx = pharmacyService.createPrescription({
    patient_id: patient.id,
    diagnosis: 'Acute symptom relief',
    items: [
      {
        medicine_id: testMed.id,
        dosage: '1 tablet',
        frequency: 'As needed',
        duration_days: 5,
        quantity: 10
      }
    ]
  }, { id: 'USR-ADMIN', name: 'Admin' });

  const dispensed = pharmacyService.dispensePrescription(rx.id, { id: 'USR-STAFF1', name: 'Michael Chang (Pharmacist)', role: 'staff' });
  assert.strictEqual(dispensed.status, 'dispensed');
  assert.ok(dispensed.dispensed_by.includes('Michael Chang'));

  // Verify stock decremented by 10 (30 - 10 = 20)
  const medAfter = pharmacyService.getMedicineById(testMed.id);
  assert.strictEqual(medAfter.stock_quantity, 20);

  // Attempting to dispense again must fail
  assert.throws(() => {
    pharmacyService.dispensePrescription(rx.id, { id: 'USR-ADMIN', name: 'Admin' });
  }, /already dispensed/);
});

