/**
 * Staff Management Service
 */
const { getDatabase } = require('../../core/database');
const { generateId, hashPassword } = require('../../core/security');
const eventBus = require('../../core/event-bus');

class StaffService {
  constructor() {
    this.db = getDatabase();
  }

  getAll(filters = {}) {
    let query = 'SELECT * FROM staff WHERE 1=1';
    const params = [];

    if (filters.role) {
      query += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters.department_id) {
      query += ' AND department_id = ?';
      params.push(filters.department_id);
    }

    if (filters.shift) {
      query += ' AND shift = ?';
      params.push(filters.shift);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY name ASC';
    return this.db.prepare(query).all(...params);
  }

  getById(id) {
    const member = this.db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
    if (!member) {
      throw new Error(`Staff member with ID '${id}' not found`);
    }
    return member;
  }

  create(data, user) {
    const {
      name,
      email,
      phone = '',
      role,
      department_id = null,
      shift = 'morning',
      joining_date = new Date().toISOString().split('T')[0],
      salary = 0.0,
      create_user_account = false,
      initial_password = 'Staff123!'
    } = data;

    if (!name || !email || !role) {
      throw new Error('Name, email, and staff role are required');
    }

    const validRoles = ['nurse', 'receptionist', 'lab_technician', 'pharmacist', 'accountant', 'admin_assistant'];
    if (!validRoles.includes(role)) {
      throw new Error(`Invalid staff role: ${role}. Must be one of: ${validRoles.join(', ')}`);
    }

    let departmentName = null;
    if (department_id) {
      const dept = this.db.prepare('SELECT name FROM departments WHERE id = ?').get(department_id);
      if (dept) departmentName = dept.name;
    }

    let userId = null;
    const existingUser = this.db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
    if (existingUser) {
      userId = existingUser.id;
    } else if (create_user_account) {
      userId = generateId('USR');
      const passHash = hashPassword(initial_password);
      this.db.prepare(`
        INSERT INTO users (id, email, password_hash, name, role, phone, is_active)
        VALUES (?, ?, ?, ?, 'staff', ?, 1)
      `).run(userId, email, passHash, name, phone);
    }

    const staffId = generateId('STF');
    this.db.prepare(`
      INSERT INTO staff (
        id, user_id, name, email, phone, role, department_id, department_name, shift, status, joining_date, salary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(
      staffId,
      userId,
      name,
      email,
      phone,
      role,
      department_id,
      departmentName,
      shift,
      joining_date,
      parseFloat(salary) || 0.0
    );

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'STAFF_REGISTERED',
      module: 'staff',
      details: `Staff member ${name} (${role}) added`
    });

    return this.getById(staffId);
  }

  update(id, data, user) {
    const existing = this.db.prepare('SELECT * FROM staff WHERE id = ?').get(id);
    if (!existing) {
      throw new Error(`Staff member with ID '${id}' not found`);
    }

    let deptName = existing.department_name;
    if (data.department_id && data.department_id !== existing.department_id) {
      const dept = this.db.prepare('SELECT name FROM departments WHERE id = ?').get(data.department_id);
      deptName = dept ? dept.name : null;
    }

    const name = data.name !== undefined ? data.name : existing.name;
    const email = data.email !== undefined ? data.email : existing.email;
    const phone = data.phone !== undefined ? data.phone : existing.phone;
    const role = data.role !== undefined ? data.role : existing.role;
    const department_id = data.department_id !== undefined ? data.department_id : existing.department_id;
    const shift = data.shift !== undefined ? data.shift : existing.shift;
    const status = data.status !== undefined ? data.status : existing.status;
    const salary = data.salary !== undefined ? parseFloat(data.salary) : existing.salary;

    this.db.prepare(`
      UPDATE staff SET
        name = ?, email = ?, phone = ?, role = ?, department_id = ?, department_name = ?,
        shift = ?, status = ?, salary = ?
      WHERE id = ?
    `).run(name, email, phone, role, department_id, deptName, shift, status, salary, id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'STAFF_UPDATED',
      module: 'staff',
      details: `Staff member ${name} (${id}) updated`
    });

    return this.getById(id);
  }

  delete(id, user) {
    const member = this.db.prepare('SELECT name FROM staff WHERE id = ?').get(id);
    if (!member) throw new Error(`Staff member '${id}' not found`);

    this.db.prepare('DELETE FROM staff WHERE id = ?').run(id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'STAFF_DELETED',
      module: 'staff',
      details: `Staff member ${member.name} (${id}) removed`
    });

    return { success: true, message: `Staff member ${member.name} removed successfully` };
  }

  getRoster() {
    const staffList = this.db.prepare("SELECT id, name, role, department_name, shift, status FROM staff WHERE status = 'active'").all();
    const roster = {
      morning: [],
      evening: [],
      night: [],
      rotating: []
    };

    staffList.forEach(s => {
      const shiftKey = s.shift.toLowerCase();
      if (roster[shiftKey]) {
        roster[shiftKey].push(s);
      } else {
        roster.morning.push(s);
      }
    });

    return roster;
  }
}

module.exports = new StaffService();
