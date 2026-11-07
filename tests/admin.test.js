const test = require('node:test');
const assert = require('node:assert');
const adminService = require('../src/modules/admin/admin.service');

test('Admin: Overview metrics aggregation', () => {
  const overview = adminService.getOverview();
  assert.ok(overview.metrics);
  assert.ok(overview.metrics.patients.total >= 4);
  assert.ok(overview.metrics.doctors.total >= 4);
  assert.ok(overview.metrics.beds.total >= 6);
  assert.ok(overview.metrics.beds.occupancy_rate >= 0);
  assert.ok(Array.isArray(overview.recent_activity));
});

test('Admin: Bed management (list, create, update status)', () => {
  const allBeds = adminService.getBeds();
  assert.ok(allBeds.length >= 6);

  // Add new bed
  const newBed = adminService.createBed({
    room_number: 'SURG-404',
    bed_number: 'Bed-1',
    ward_type: 'Private',
    daily_rate: 350.0
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(newBed.id);
  assert.strictEqual(newBed.room_number, 'SURG-404');
  assert.strictEqual(newBed.status, 'available');

  // Update bed to maintenance
  const updatedBed = adminService.updateBed(newBed.id, {
    status: 'maintenance'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.strictEqual(updatedBed.status, 'maintenance');
});

test('Admin: Audit log tracking', () => {
  const logs = adminService.getAuditLogs({ limit: 10 });
  assert.ok(Array.isArray(logs));
  assert.ok(logs.length > 0);
  assert.ok(logs[0].action);
  assert.ok(logs[0].created_at);
});

test('Admin: Hospital settings read and write', () => {
  const settings = adminService.getSettings();
  assert.ok(settings.hospital_name);

  const updated = adminService.updateSettings({
    visitor_hours: '10:00 AM - 07:00 PM'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.strictEqual(updated.visitor_hours, '10:00 AM - 07:00 PM');
});

test('Admin: User directory and account status toggling', () => {
  const users = adminService.getUsers();
  assert.ok(users.length >= 4);

  const nonAdmin = users.find(u => u.role !== 'admin');
  assert.ok(nonAdmin);

  // Deactivate
  const deactivated = adminService.toggleUserStatus(nonAdmin.id, false, { id: 'USR-ADMIN', role: 'admin' });
  assert.strictEqual(deactivated.is_active, 0);

  // Reactivate
  const reactivated = adminService.toggleUserStatus(nonAdmin.id, true, { id: 'USR-ADMIN', role: 'admin' });
  assert.strictEqual(reactivated.is_active, 1);
});

test('Admin: Create user account with role assignment', () => {
  const code = Date.now().toString().slice(-4);
  const newUser = adminService.createUser({
    name: `Nurse Florence ${code}`,
    email: `florence.${code}@hospital.org`,
    password: 'FlorencePassword123!',
    role: 'staff',
    phone: '+1 (555) 333-4444'
  }, { id: 'USR-ADMIN', name: 'Admin', role: 'admin' });

  assert.ok(newUser.id);
  assert.strictEqual(newUser.role, 'staff');
  assert.strictEqual(newUser.name, `Nurse Florence ${code}`);
  assert.strictEqual(newUser.is_active, 1);
});


