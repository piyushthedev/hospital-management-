/**
 * Hospital Administration & Governance View
 */
const AdminView = {
  activeTab: 'beds',

  async render() {
    let beds = [];
    let settings = {};
    let users = [];
    let logs = [];

    try {
      const [bedsRes, setRes, usersRes, logsRes] = await Promise.all([
        api.admin.getBeds(),
        api.admin.getSettings(),
        api.admin.getUsers(),
        api.admin.getAuditLogs({ limit: 40 })
      ]);

      beds = bedsRes.data || [];
      settings = setRes.data || {};
      users = usersRes.data || [];
      logs = logsRes.data || [];
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--slate-900); letter-spacing: -0.02em;">Hospital Facilities & Administration</h2>
          <p style="font-size: 0.875rem; color: var(--slate-500);">Ward bed matrices, organization parameters, user credentials, and security audit telemetry</p>
        </div>
        <div>
          <button class="btn btn-primary" onclick="AdminView.openAddBedModal()">
            <span>➕ Add Hospital Bed</span>
          </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div style="display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border-color); margin-bottom: 1.5rem;">
        <button class="btn ${this.activeTab === 'beds' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="AdminView.switchTab('beds')">
          🛏️ Bed & Ward Inventory (${beds.length})
        </button>
        <button class="btn ${this.activeTab === 'settings' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="AdminView.switchTab('settings')">
          ⚙️ Hospital Settings
        </button>
        <button class="btn ${this.activeTab === 'users' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="AdminView.switchTab('users')">
          👥 User Accounts (${users.length})
        </button>
        <button class="btn ${this.activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="AdminView.switchTab('audit')">
          📋 Security Audit Logs (${logs.length})
        </button>
      </div>

      <div id="admin-tab-content">
        ${this.renderTabContent(beds, settings, users, logs)}
      </div>
    `;
  },

  switchTab(tab) {
    this.activeTab = tab;
    App.navigate('admin');
  },

  renderTabContent(beds, settings, users, logs) {
    if (this.activeTab === 'beds') {
      return `
        <div class="content-card">
          <div class="card-header">
            <h2>Hospital Bed Matrix (Ward Layout)</h2>
            <div style="display: flex; gap: 0.75rem; font-size: 0.8rem; align-items: center;">
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: var(--accent); border-radius: 2px;"></span> Available</span>
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: var(--primary); border-radius: 2px;"></span> Occupied</span>
              <span style="display: flex; align-items: center; gap: 4px;"><span style="width: 10px; height: 10px; background: var(--warning); border-radius: 2px;"></span> Maintenance</span>
            </div>
          </div>
          <div class="card-body">
            <div class="bed-matrix-grid">
              ${beds.map(b => `
                <div class="bed-tile ${b.status}">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div class="bed-number">${b.room_number} - ${b.bed_number}</div>
                    <span class="badge ${b.status === 'available' ? 'badge-success' : b.status === 'occupied' ? 'badge-info' : 'badge-warning'}" style="font-size: 0.65rem;">
                      ${b.status}
                    </span>
                  </div>
                  <div class="bed-ward">${b.ward_type} Ward • $${b.daily_rate}/day</div>
                  ${b.current_patient_name ? `
                    <div style="font-size: 0.75rem; font-weight: 600; color: var(--primary-dark); background: #e0f2fe; padding: 4px 6px; border-radius: 4px; margin-top: 4px;">
                      👤 ${b.current_patient_name}
                    </div>
                  ` : `
                    <div style="font-size: 0.75rem; color: var(--accent-dark); margin-top: 4px;">
                      Ready for admission
                    </div>
                  `}
                  <div style="margin-top: 0.5rem; display: flex; gap: 0.25rem;">
                    ${b.status !== 'occupied' ? `
                      <button class="btn btn-secondary btn-sm" style="font-size: 0.675rem; padding: 2px 6px; width: 100%;" onclick="AdminView.toggleBedMaintenance('${b.id}', '${b.status}')">
                        ${b.status === 'available' ? 'Set Maintenance' : 'Set Available'}
                      </button>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'settings') {
      return `
        <div class="content-card">
          <div class="card-header">
            <h2>Hospital Organization Configuration</h2>
          </div>
          <div class="card-body">
            <form onsubmit="AdminView.submitSettings(event)" style="max-width: 700px;">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Hospital Name</label>
                  <input type="text" id="set-name" class="form-input" value="${settings.hospital_name || ''}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Internal Hospital Code</label>
                  <input type="text" id="set-code" class="form-input" value="${settings.hospital_code || ''}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Main Reception Phone</label>
                  <input type="text" id="set-phone" class="form-input" value="${settings.hospital_phone || ''}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Emergency 24/7 Hotline</label>
                  <input type="text" id="set-hotline" class="form-input" value="${settings.emergency_hotline || ''}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Inquiry Email</label>
                  <input type="email" id="set-email" class="form-input" value="${settings.hospital_email || ''}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Ward Visiting Hours</label>
                  <input type="text" id="set-hours" class="form-input" value="${settings.visitor_hours || ''}" required>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Physical Campus Address</label>
                <input type="text" id="set-address" class="form-input" value="${settings.hospital_address || ''}" required>
              </div>
              <button type="submit" class="btn btn-primary" style="margin-top: 0.5rem;">
                Save Hospital Settings
              </button>
            </form>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'users') {
      return `
        <div class="content-card">
          <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--slate-900);">System Users & Access Control (RBAC)</h2>
              <p style="font-size: 0.8rem; color: var(--slate-500);">Manage authenticated hospital accounts, permissions, and status</p>
            </div>
            <button class="btn btn-primary btn-sm" onclick="AdminView.openCreateUserModal()">
              <span>➕ Create System User</span>
            </button>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Assigned Role</th>
                  <th>Account Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${users.map(u => `
                  <tr>
                    <td style="font-weight: 700; color: var(--primary);">${u.id}</td>
                    <td style="font-weight: 600;">${u.name}</td>
                    <td>${u.email}</td>
                    <td>
                      <span class="badge ${
                        u.role === 'admin' ? 'badge-primary' :
                        u.role === 'doctor' ? 'badge-info' :
                        u.role === 'staff' ? 'badge-success' : 'badge-neutral'
                      }">${u.role}</span>
                    </td>
                    <td>
                      <span class="badge ${u.is_active ? 'badge-success' : 'badge-danger'}">
                        ${u.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td>
                      ${u.id !== api.user.id ? `
                        <button class="btn ${u.is_active ? 'btn-danger' : 'btn-accent'} btn-sm" onclick="AdminView.toggleUser('${u.id}', ${u.is_active ? 0 : 1})">
                          ${u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      ` : `
                        <span style="font-size: 0.75rem; color: var(--text-muted);">(Current User)</span>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (this.activeTab === 'audit') {
      return `
        <div class="content-card">
          <div class="card-header">
            <h2>Hospital System Audit Trail</h2>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User Name</th>
                  <th>Role</th>
                  <th>Event Action</th>
                  <th>Module</th>
                  <th>Event Details</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                ${logs.map(log => `
                  <tr>
                    <td style="font-size: 0.75rem; color: var(--text-muted);">${log.created_at}</td>
                    <td><strong>${log.user_name || 'System'}</strong></td>
                    <td><span class="badge badge-neutral">${log.user_role || 'system'}</span></td>
                    <td><code>${log.action}</code></td>
                    <td><span class="badge badge-info">${log.module}</span></td>
                    <td style="font-size: 0.8rem;">${log.details}</td>
                    <td style="font-size: 0.75rem; color: var(--text-muted);">${log.ip_address || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    return '';
  },

  async toggleBedMaintenance(bedId, currentStatus) {
    const nextStatus = currentStatus === 'available' ? 'maintenance' : 'available';
    try {
      await api.admin.updateBed(bedId, { status: nextStatus });
      showToast(`Bed status changed to ${nextStatus}`, 'success');
      App.navigate('admin');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async toggleUser(userId, newStatus) {
    try {
      await api.admin.toggleUserStatus(userId, newStatus);
      showToast('User status updated successfully', 'success');
      App.navigate('admin');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  openCreateUserModal() {
    const modalHtml = `
      <div class="modal-header">
        <h3>Create System User Account</h3>
        <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
      </div>
      <form onsubmit="AdminView.submitCreateUser(event)">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input type="text" id="adm-user-name" class="form-input" placeholder="e.g. Dr. Julian Bashir or Nurse Ratched" required>
          </div>

          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" id="adm-user-email" class="form-input" placeholder="name@hospital.org" required>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">System Role (RBAC)</label>
              <select id="adm-user-role" class="form-select" required>
                <option value="doctor">Physician / Doctor</option>
                <option value="staff">Clinical Staff / Nurse</option>
                <option value="accountant">Billing & Finance Officer</option>
                <option value="patient">Patient Profile</option>
                <option value="admin">Hospital Administrator</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Phone Number (OTP Enabled)</label>
              <input type="tel" id="adm-user-phone" class="form-input" placeholder="+1 (555) 000-0000" value="+1 (555) 700-1000" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Initial Password</label>
            <input type="password" id="adm-user-pass" class="form-input" value="Hospital123!" placeholder="Min 6 characters" required minlength="6">
            <div style="font-size: 0.725rem; color: var(--slate-400); margin-top: 0.25rem;">Default temporary password. User will be enrolled for biometric Touch ID automatically.</div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create User Account</button>
        </div>
      </form>
    `;

    App.showDynamicModal(modalHtml);
  },

  async submitCreateUser(event) {
    event.preventDefault();
    const data = {
      name: document.getElementById('adm-user-name').value.trim(),
      email: document.getElementById('adm-user-email').value.trim(),
      role: document.getElementById('adm-user-role').value,
      phone: document.getElementById('adm-user-phone').value.trim(),
      password: document.getElementById('adm-user-pass').value
    };

    try {
      await api.admin.createUser(data);
      showToast(`User account created for ${data.name} (${data.role.toUpperCase()})!`, 'success');
      App.closeActiveModal();
      App.navigate('admin');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async submitSettings(event) {
    event.preventDefault();
    const data = {
      hospital_name: document.getElementById('set-name').value,
      hospital_code: document.getElementById('set-code').value,
      hospital_phone: document.getElementById('set-phone').value,
      emergency_hotline: document.getElementById('set-hotline').value,
      hospital_email: document.getElementById('set-email').value,
      visitor_hours: document.getElementById('set-hours').value,
      hospital_address: document.getElementById('set-address').value
    };

    try {
      await api.admin.updateSettings(data);
      showToast('Hospital configuration updated!', 'success');
      App.navigate('admin');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  openAddBedModal() {
    const modalHtml = `
      <div class="modal-header">
        <h3>Add Hospital Bed to Ward</h3>
        <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
      </div>
      <form onsubmit="AdminView.submitAddBed(event)">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Room / Unit #</label>
              <input type="text" id="bed-room" class="form-input" placeholder="e.g. Ward-3B or ICU-2" required>
            </div>
            <div class="form-group">
              <label class="form-label">Bed Designation</label>
              <input type="text" id="bed-num" class="form-input" placeholder="e.g. Bed-1 or Bed-A" required>
            </div>
            <div class="form-group">
              <label class="form-label">Ward Type</label>
              <select id="bed-ward-type" class="form-select" required>
                <option value="General">General Medical Ward</option>
                <option value="ICU">Intensive Care Unit (ICU)</option>
                <option value="Pediatrics">Pediatrics Ward</option>
                <option value="Private">Private Luxury Suite</option>
                <option value="Maternity">Maternity Ward</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Daily Bed Rate ($)</label>
              <input type="number" id="bed-rate" class="form-input" value="150" min="0" step="25" required>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add Hospital Bed</button>
        </div>
      </form>
    `;

    App.showDynamicModal(modalHtml);
  },

  async submitAddBed(event) {
    event.preventDefault();
    const data = {
      room_number: document.getElementById('bed-room').value,
      bed_number: document.getElementById('bed-num').value,
      ward_type: document.getElementById('bed-ward-type').value,
      daily_rate: parseFloat(document.getElementById('bed-rate').value) || 150
    };

    try {
      await api.admin.createBed(data);
      showToast('New bed added to ward!', 'success');
      App.closeActiveModal();
      App.navigate('admin');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

window.AdminView = AdminView;

