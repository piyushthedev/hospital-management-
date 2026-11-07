const test = require('node:test');
const assert = require('node:assert');
const billingService = require('../src/modules/billing/billing.service');
const patientService = require('../src/modules/patients/patient.service');

test('Billing: List all invoices and verify initial seeded invoices', () => {
  const invoices = billingService.getAllInvoices();
  assert.ok(invoices.length >= 3, 'Must have at least 3 seeded invoices');

  const paid = billingService.getAllInvoices({ status: 'paid' });
  assert.ok(paid.length >= 1, 'Must have at least one paid invoice');
  assert.strictEqual(paid[0].status, 'paid');
});

test('Billing: Create invoice with multiple item types and verify calculations', () => {
  const patients = patientService.getAll();
  const patient = patients[0];

  const items = [
    { description: 'Cardiology Follow-Up Consultation', item_type: 'consultation', quantity: 1, unit_price: 150.0 },
    { description: 'Electrocardiogram (ECG) Procedure', item_type: 'procedure', quantity: 1, unit_price: 120.0 },
    { description: 'Cardiac Enzyme Blood Lab Panel', item_type: 'laboratory', quantity: 1, unit_price: 80.0 },
    { description: 'Prescription Nitroglycerin Sublingual', item_type: 'pharmacy', quantity: 2, unit_price: 25.0 }
  ];
  // Subtotal = 150 + 120 + 80 + 50 = 400.0
  // Discount = 50.0
  // Taxable = 350.0
  // Tax (5%) = 17.50
  // Total = 367.50

  const invoice = billingService.createInvoice({
    patient_id: patient.id,
    discount_amount: 50.0,
    notes: 'Outpatient diagnostic workup',
    items
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(invoice.id);
  assert.strictEqual(invoice.subtotal, 400.0);
  assert.strictEqual(invoice.discount_amount, 50.0);
  assert.strictEqual(invoice.tax_amount, 17.5);
  assert.strictEqual(invoice.total_amount, 367.5);
  assert.strictEqual(invoice.paid_amount, 0.0);
  assert.strictEqual(invoice.status, 'unpaid');
  assert.strictEqual(invoice.items.length, 4);
});

test('Billing: Record payments and verify status transitions to partially_paid then paid', () => {
  const patients = patientService.getAll();
  const patient = patients[0];

  // Create clean invoice of total $210 (200 + 5% tax = 210)
  const inv = billingService.createInvoice({
    patient_id: patient.id,
    items: [
      { description: 'Specialist Consultation', item_type: 'consultation', quantity: 1, unit_price: 200.0 }
    ]
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.strictEqual(inv.total_amount, 210.0);
  assert.strictEqual(inv.status, 'unpaid');

  // 1. Partial payment: $100
  const afterPart = billingService.recordPayment(inv.id, {
    amount: 100.0,
    payment_method: 'credit_card',
    reference_number: 'CARD-AUTH-1122'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.strictEqual(afterPart.paid_amount, 100.0);
  assert.strictEqual(afterPart.status, 'partially_paid');

  // 2. Final payment: $110
  const afterFull = billingService.recordPayment(inv.id, {
    amount: 110.0,
    payment_method: 'cash',
    reference_number: 'CASH-RCPT-55'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.strictEqual(afterFull.paid_amount, 210.0);
  assert.strictEqual(afterFull.status, 'paid');

  // 3. Overpayment rejection
  assert.throws(
    () => billingService.recordPayment(inv.id, {
      amount: 10.0,
      payment_method: 'cash'
    }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' }),
    /already been paid in full/
  );
});

test('Billing: Summary metrics calculation', () => {
  const summary = billingService.getSummary();
  assert.ok(summary.financials.total_invoiced > 0);
  assert.ok(summary.financials.total_collected > 0);
  assert.ok(summary.counts.total_invoices >= 3);
});

test('Billing: Automatic registration invoice generation and patient billing accounts ledger', () => {
  const uniqueSuffix = Date.now().toString().slice(-4);
  const newPatient = patientService.create({
    first_name: 'Gwendolyn',
    last_name: `Harcourt-${uniqueSuffix}`,
    date_of_birth: '1992-04-18',
    gender: 'Female',
    blood_group: 'AB+',
    phone: `+1-555-01${uniqueSuffix}`,
    email: `gwendolyn.${uniqueSuffix}@example.org`,
    insurance_provider: 'Blue Cross Shield Platinum',
    insurance_policy_number: `BCS-${uniqueSuffix}`
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(newPatient.id, 'Patient must be created');

  // Verify patient's registration invoice was created automatically
  const patientInvoices = billingService.getAllInvoices({ patient_id: newPatient.id });
  assert.strictEqual(patientInvoices.length, 1, 'Newly registered patient must have exactly 1 registration invoice');
  
  const regInv = patientInvoices[0];
  assert.strictEqual(regInv.subtotal, 50.0);
  assert.strictEqual(regInv.tax_amount, 2.5);
  assert.strictEqual(regInv.total_amount, 52.5);
  assert.strictEqual(regInv.status, 'unpaid');
  assert.ok(regInv.notes.includes('Blue Cross Shield Platinum'), 'Invoice notes must include insurance details');

  // Verify patient appears in Patient Accounts & Claims Ledger
  const accounts = billingService.getPatientBillingAccounts({ patient_id: newPatient.id });
  assert.strictEqual(accounts.length, 1, 'Patient account must exist in billing ledger');
  
  const account = accounts[0];
  assert.strictEqual(account.patient_id, newPatient.id);
  assert.strictEqual(account.patient_name, `Gwendolyn Harcourt-${uniqueSuffix}`);
  assert.strictEqual(account.insurance_provider, 'Blue Cross Shield Platinum');
  assert.strictEqual(account.insurance_policy_number, `BCS-${uniqueSuffix}`);
  assert.strictEqual(account.total_invoiced, 52.5);
  assert.strictEqual(account.total_paid, 0.0);
  assert.strictEqual(account.total_due, 52.5);
  assert.strictEqual(account.claim_status, 'Claim Pending Verification');
});

