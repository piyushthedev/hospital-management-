const test = require('node:test');
const assert = require('node:assert');
const staffService = require('../src/modules/staff/staff.service');

test('Staff: List staff members and filter by role', () => {
  const staff = staffService.getAll();
  assert.ok(staff.length >= 4, 'Must have seeded staff members');

  const nurses = staffService.getAll({ role: 'nurse' });
  assert.ok(nurses.length >= 1, 'Must have at least one nurse');
  assert.strictEqual(nurses[0].role, 'nurse');
});

test('Staff: Register new staff member', () => {
  const member = staffService.create({
    name: 'Samuel Clemens',
    email: `samuel.${Date.now()}@hospital.org`,
    phone: '+1 (555) 444-1234',
    role: 'lab_technician',
    department_id: 'DEP-GENMED',
    shift: 'night',
    salary: 62000.0
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(member.id);
  assert.strictEqual(member.name, 'Samuel Clemens');
  assert.strictEqual(member.role, 'lab_technician');
  assert.strictEqual(member.shift, 'night');
  assert.strictEqual(member.salary, 62000.0);
});

test('Staff: Validate shift roster mapping', () => {
  const roster = staffService.getRoster();
  assert.ok(roster.morning);
  assert.ok(roster.evening);
  assert.ok(roster.night);
  assert.ok(roster.rotating);
  assert.ok(roster.morning.length > 0, 'Morning roster should have active staff');
});

test('Staff: Reject invalid staff role', () => {
  assert.throws(
    () => staffService.create({
      name: 'Bad Role Person',
      email: 'bad@hospital.org',
      role: 'astronaut' // Invalid
    }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' }),
    /Invalid staff role/
  );
});

