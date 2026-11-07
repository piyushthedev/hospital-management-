/**
 * Hospital Administration & System Governance Service
 */
const { getDatabase } = require('../../core/database');
const { generateId, hashPassword } = require('../../core/security');
const eventBus = require('../../core/event-bus');

class AdminService {
  constructor() {
    this.db = getDatabase();
    this.initEventListeners();
  }

  initEventListeners() {
    // Audit listener
    eventBus.on('audit.log', (logData) => {
      try {
        const id = generateId('LOG');
        this.db.prepare(`
          INSERT INTO audit_logs (id, user_id, user_name, user_role, action, module, details, ip_address)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          logData.userId || null,
          logData.userName || 'System',
          logData.userRole || 'system',
          logData.action,
          logData.module || 'core',
          logData.details || '',
          logData.ipAddress || '127.0.0.1'
        );
      } catch (err) {
        console.error('[AdminService] Failed to record audit log:', err);
      }
    });
  }

  getOverview() {
    // 1. Core entity counts
    const patientStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'admitted' THEN 1 ELSE 0 END) as admitted,
        SUM(CASE WHEN status = 'outpatient' THEN 1 ELSE 0 END) as outpatient
      FROM patients
    `).get();

    const doctorStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN availability_status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN availability_status = 'in_consultation' THEN 1 ELSE 0 END) as in_consultation
      FROM doctors
    `).get();

    const staffCount = this.db.prepare("SELECT COUNT(*) as total FROM staff WHERE status = 'active'").get().total;
    const departmentCount = this.db.prepare("SELECT COUNT(*) as total FROM departments WHERE status = 'active'").get().total;

    // 2. Bed Occupancy
    const bedStats = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
      FROM beds
    `).get();

    const occupancyRate = bedStats.total > 0 
      ? parseFloat(((bedStats.occupied / bedStats.total) * 100).toFixed(1)) 
      : 0.0;

    // 3. Appointments Today
    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppointments = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as scheduled
      FROM appointments
      WHERE appointment_date = ?
    `).get(todayStr);

    // 4. Financial Snapshot
    const finance = this.db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0.0) as total_invoiced,
        COALESCE(SUM(paid_amount), 0.0) as total_revenue,
        COALESCE(SUM(total_amount - paid_amount), 0.0) as pending_balance
      FROM invoices
    `).get();

    // 5. Recent Audit Logs
    const recentLogs = this.db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    return {
      metrics: {
        patients: {
          total: patientStats.total,
          admitted: patientStats.admitted || 0,
          outpatient: patientStats.outpatient || 0
        },
        doctors: {
          total: doctorStats.total,
          available: doctorStats.available || 0,
          in_consultation: doctorStats.in_consultation || 0
        },
        staff_total: staffCount,
        departments_total: departmentCount,
        beds: {
          total: bedStats.total,
          occupied: bedStats.occupied || 0,
          available: bedStats.available || 0,
          maintenance: bedStats.maintenance || 0,
          occupancy_rate: occupancyRate
        },
        today_appointments: {
          total: todayAppointments.total,
          completed: todayAppointments.completed || 0,
          in_progress: todayAppointments.in_progress || 0,
          confirmed: todayAppointments.confirmed || 0,
          scheduled: todayAppointments.scheduled || 0
        },
        financials: {
          total_revenue: finance.total_revenue,
          pending_balance: finance.pending_balance,
          total_invoiced: finance.total_invoiced
        }
      },
      recent_activity: recentLogs
    };
  }

  getAuditLogs(filters = {}) {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (filters.module) {
      query += ' AND module = ?';
      params.push(filters.module);
    }

    if (filters.action) {
      query += ' AND action = ?';
      params.push(filters.action);
    }

    if (filters.user_id) {
      query += ' AND user_id = ?';
      params.push(filters.user_id);
    }

    const limit = parseInt(filters.limit, 10) || 50;
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    return this.db.prepare(query).all(...params);
  }

  getSettings() {
    const rows = this.db.prepare('SELECT key, value, description FROM hospital_settings').all();
    const settings = {};
    rows.forEach(r => {
      settings[r.key] = r.value;
    });
    return settings;
  }

  updateSettings(data, user) {
    const updateStmt = this.db.prepare(`
      INSERT INTO hospital_settings (key, value, description)
      VALUES (?, ?, '')
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        updateStmt.run(key, String(value));
      }
    }

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'SETTINGS_UPDATED',
      module: 'admin',
      details: 'Hospital general settings updated'
    });

    return this.getSettings();
  }

  getBeds(filters = {}) {
    let query = 'SELECT * FROM beds WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.ward_type) {
      query += ' AND ward_type = ?';
      params.push(filters.ward_type);
    }

    if (filters.department_id) {
      query += ' AND department_id = ?';
      params.push(filters.department_id);
    }

    query += ' ORDER BY room_number ASC, bed_number ASC';
    return this.db.prepare(query).all(...params);
  }

  createBed(data, user) {
    const { room_number, bed_number, department_id = null, ward_type = 'General', daily_rate = 150.0 } = data;

    if (!room_number || !bed_number) {
      throw new Error('Room number and bed number are required');
    }

    let departmentName = null;
    if (department_id) {
      const dept = this.db.prepare('SELECT name FROM departments WHERE id = ?').get(department_id);
      if (dept) departmentName = dept.name;
    }

    const bedId = generateId('BED');

    this.db.prepare(`
      INSERT INTO beds (id, room_number, bed_number, department_id, department_name, ward_type, status, daily_rate)
      VALUES (?, ?, ?, ?, ?, ?, 'available', ?)
    `).run(bedId, room_number, bed_number, department_id, departmentName, ward_type, parseFloat(daily_rate) || 150.0);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'BED_CREATED',
      module: 'admin',
      details: `Bed ${room_number}-${bed_number} created in ${ward_type}`
    });

    return this.db.prepare('SELECT * FROM beds WHERE id = ?').get(bedId);
  }

  updateBed(id, data, user) {
    const bed = this.db.prepare('SELECT * FROM beds WHERE id = ?').get(id);
    if (!bed) throw new Error(`Bed '${id}' not found`);

    const status = data.status !== undefined ? data.status : bed.status;
    const daily_rate = data.daily_rate !== undefined ? parseFloat(data.daily_rate) : bed.daily_rate;
    const ward_type = data.ward_type !== undefined ? data.ward_type : bed.ward_type;

    this.db.prepare(`
      UPDATE beds SET status = ?, daily_rate = ?, ward_type = ? WHERE id = ?
    `).run(status, daily_rate, ward_type, id);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'BED_UPDATED',
      module: 'admin',
      details: `Bed ${bed.room_number}-${bed.bed_number} updated status to ${status}`
    });

    return this.db.prepare('SELECT * FROM beds WHERE id = ?').get(id);
  }

  getUsers() {
    return this.db.prepare(`
      SELECT id, email, name, role, phone, is_active, created_at, updated_at
      FROM users
      ORDER BY role ASC, name ASC
    `).all();
  }

  createUser(userData, adminUser) {
    const { email, password, name, role = 'patient', phone = '' } = userData;
    if (!email || !password || !name) {
      throw new Error('Email, password, and full name are required');
    }

    const existing = this.db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email);
    if (existing) {
      throw new Error(`User with email '${email}' already exists`);
    }

    const allowedRoles = ['admin', 'doctor', 'staff', 'patient', 'accountant'];
    if (!allowedRoles.includes(role)) {
      throw new Error(`Invalid role: ${role}. Allowed roles: ${allowedRoles.join(', ')}`);
    }

    const userId = generateId('USR');
    const passwordHash = hashPassword(password);

    this.db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(userId, email.toLowerCase().trim(), passwordHash, name.trim(), role, phone);

    // Pre-enroll default biometric device
    const bioId = generateId('BIO');
    this.db.prepare(`
      INSERT INTO biometric_credentials (id, user_id, credential_id, device_name)
      VALUES (?, ?, ?, ?)
    `).run(bioId, userId, `fp-${userId}`, 'Hospital Biometric Terminal');

    eventBus.emit('audit.log', {
      userId: adminUser?.id,
      userName: adminUser?.name,
      userRole: adminUser?.role,
      action: 'ADMIN_USER_CREATED',
      module: 'admin',
      details: `Administrator created new user ${email} with role '${role}'`
    });

    return this.db.prepare('SELECT id, email, name, role, phone, is_active, created_at FROM users WHERE id = ?').get(userId);
  }

  toggleUserStatus(userId, isActive, user) {
    const targetUser = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!targetUser) throw new Error(`User '${userId}' not found`);

    if (targetUser.id === user.id) {
      throw new Error('You cannot deactivate your own account');
    }

    this.db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(isActive ? 1 : 0, userId);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      module: 'admin',
      details: `User account ${targetUser.email} ${isActive ? 'activated' : 'deactivated'}`
    });

    return { success: true, is_active: isActive ? 1 : 0 };
  }
}

module.exports = new AdminService();
