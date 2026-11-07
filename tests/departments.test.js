const test = require('node:test');
const assert = require('node:assert');
const departmentService = require('../src/modules/departments/department.service');

test('Departments: List departments and check seeded records', () => {
  const depts = departmentService.getAll();
  assert.ok(depts.length >= 4, 'Must have at least 4 seeded departments');
  
  const cardio = depts.find(d => d.code === 'CARD');
  assert.ok(cardio, 'Cardiology department must exist');
  assert.strictEqual(cardio.name, 'Cardiology');
  assert.ok(cardio.doctor_count >= 1, 'Cardiology should have at least 1 doctor');
});

test('Departments: Create new department and retrieve details', () => {
  const code = `TEST-${Date.now().toString().slice(-4)}`;
  const created = departmentService.create({
    name: 'Dermatology & Skin Care',
    code,
    description: 'Diagnosis and treatment of skin, hair, and nail disorders',
    floor: '2nd Floor - Wing D',
    phone_extension: 'Ext 250',
    capacity: 15
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(created.id);
  assert.strictEqual(created.code, code);
  assert.strictEqual(created.capacity, 15);

  const fetched = departmentService.getById(created.id);
  assert.strictEqual(fetched.name, 'Dermatology & Skin Care');
});

test('Departments: Reject duplicate department code', () => {
  assert.throws(
    () => departmentService.create({
      name: 'Duplicate Cardio',
      code: 'CARD' // Already exists
    }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' }),
    /already in use/
  );
});

test('Departments: Update department details', () => {
  const depts = departmentService.getAll();
  const target = depts[0];

  const updated = departmentService.update(target.id, {
    description: 'Updated Department Overview Description'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.strictEqual(updated.description, 'Updated Department Overview Description');
});

