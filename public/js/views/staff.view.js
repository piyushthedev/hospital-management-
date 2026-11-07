/**
 * Staff & Roster Management View
 */
const StaffView = {
  staffList: [],

  async render() {
    let staff = [];
    let roster = { morning: [], evening: [], night: [], rotating: [] };

    try {
      const res = await api.staff.getAll();
      staff = res.data || [];
      this.staffList = staff;

      const rosterRes = await api.staff.getRoster();
      roster = rosterRes.data || roster;
    } catch (err) {
      console.error('Failed to load staff:', err);
    }

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--slate-900); letter-spacing: -0.02em;">Hospital Staff & Shift Rosters</h2>
          <p style="font-size: 0.875rem; color: var(--slate-500);">Nursing officers, clinical receptionists, pharmacists, laboratory technicians, and shift schedules</p>
        </div>
        ${api.user.role === 'admin' ? `
          <div>
            <button class="btn btn-primary" onclick="StaffView.openAddModal()">
              <span>➕ Register Staff Member</span>
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Shift Roster Overview Cards -->
      <div class="grid-cards" style="margin-bottom: 1.5rem;">
        <div class="stat-card" style="border-left: 4px solid #0284c7;">
          <div class="stat-card-header">
            <span class="stat-title">🌅 Morning Shift</span>
            <span class="badge badge-info">${roster.morning?.length || 0} on duty</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; max-height: 90px; overflow-y: auto;">
            ${(roster.morning || []).map(s => `<div>• <strong>${s.name}</strong> (${s.role.replace('_', ' ')})</div>`).join('') || 'No staff assigned'}
          </div>
        </div>

        <div class="stat-card" style="border-left: 4px solid #f59e0b;">
          <div class="stat-card-header">
            <span class="stat-title">🌇 Evening Shift</span>
            <span class="badge badge-warning">${roster.evening?.length || 0} on duty</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; max-height: 90px; overflow-y: auto;">
            ${(roster.evening || []).map(s => `<div>• <strong>${s.name}</strong> (${s.role.replace('_', ' ')})</div>`).join('') || 'No staff assigned'}
          </div>
        </div>

        <div class="stat-card" style="border-left: 4px solid #6366f1;">
          <div class="stat-card-header">
            <span class="stat-title">🌙 Night Shift</span>
            <span class="badge badge-neutral">${roster.night?.length || 0} on duty</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; max-height: 90px; overflow-y: auto;">
            ${(roster.night || []).map(s => `<div>• <strong>${s.name}</strong> (${s.role.replace('_', ' ')})</div>`).join('') || 'No staff assigned'}
          </div>
        </div>

        <div class="stat-card" style="border-left: 4px solid #10b981;">
          <div class="stat-card-header">
            <span class="stat-title">🔄 Rotating Support</span>
            <span class="badge badge-success">${roster.rotating?.length || 0} on duty</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; max-height: 90px; overflow-y: auto;">
            ${(roster.rotating || []).map(s => `<div>• <strong>${s.name}</strong> (${s.role.replace('_', ' ')})</div>`).join('') || 'No staff assigned'}
          </div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" id="staff-search-input" class="search-input" placeholder="Search staff member by name, email, phone..." oninput="StaffView.handleFilter()">
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <select id="staff-role-filter" class="select-filter" onchange="StaffView.handleFilter()">
            <option value="">All Roles</option>
            <option value="nurse">Nurse</option>
            <option value="receptionist">Receptionist</option>
            <option value="pharmacist">Pharmacist</option>
            <option value="lab_technician">Lab Technician</option>
            <option value="accountant">Accountant</option>
            <option value="admin_assistant">Admin Assistant</option>
          </select>
          <select id="staff-shift-filter" class="select-filter" onchange="StaffView.handleFilter()">
            <option value="">All Shifts</option>
            <option value="morning">Morning</option>
            <option value="evening">Evening</option>
            <option value="night">Night</option>
            <option value="rotating">Rotating</option>
          </select>
        </div>
      </div>

      <!-- Staff Directory Table -->
      <div class="content-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Staff ID</th>
                <th>Name</th>
                <th>Role / Cadre</th>
                <th>Department</th>
                <th>Current Shift</th>
                <th>Contact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="staff-table-body">
              ${this.renderRows(staff)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderRows(list) {
    if (!list || list.length === 0) {
      return `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching staff found</td></tr>`;
    }

    return list.map(s => `
      <tr>
        <td style="font-weight: 700; color: var(--primary);">${s.id}</td>
        <td>
          <div style="font-weight: 600; color: var(--secondary);">${s.name}</div>
        </td>
        <td>
          <span class="badge ${
            s.role === 'nurse' ? 'badge-primary' :
            s.role === 'pharmacist' ? 'badge-success' :
            s.role === 'lab_technician' ? 'badge-info' : 'badge-neutral'
          }">${s.role.replace('_', ' ')}</span>
        </td>
        <td>${s.department_name || 'Administration'}</td>
        <td>
          <span class="badge badge-neutral" style="text-transform: capitalize;">${s.shift}</span>
        </td>
        <td>
          <div>${s.phone || '-'}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${s.email}</div>
        </td>
        <td>
          <span class="badge ${s.status === 'active' ? 'badge-success' : 'badge-danger'}">${s.status}</span>
        </td>
      </tr>
    `).join('');
  },

  handleFilter() {
    const search = (document.getElementById('staff-search-input')?.value || '').toLowerCase();
    const role = document.getElementById('staff-role-filter')?.value || '';
    const shift = document.getElementById('staff-shift-filter')?.value || '';

    const filtered = this.staffList.filter(s => {
      const matchSearch = !search ||
        s.name.toLowerCase().includes(search) ||
        s.email.toLowerCase().includes(search) ||
        s.id.toLowerCase().includes(search);

      const matchRole = !role || s.role === role;
      const matchShift = !shift || s.shift === shift;

      return matchSearch && matchRole && matchShift;
    });

    const tbody = document.getElementById('staff-table-body');
    if (tbody) tbody.innerHTML = this.renderRows(filtered);
  },

  async openAddModal() {
    try {
      const res = await api.departments.getAll();
      const departments = res.data || [];

      const modalHtml = `
        <div class="modal-header">
          <h3>Register Staff Member</h3>
          <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
        </div>
        <form onsubmit="StaffView.submitAdd(event)">
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" id="staff-name" class="form-input" placeholder="e.g. Clara Barton" required>
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" id="staff-email" class="form-input" placeholder="staff@hospital.org" required>
              </div>
              <div class="form-group">
                <label class="form-label">Role</label>
                <select id="staff-role" class="form-select" required>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="lab_technician">Lab Technician</option>
                  <option value="accountant">Accountant</option>
                  <option value="admin_assistant">Admin Assistant</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Department</label>
                <select id="staff-dept" class="form-select">
                  <option value="">Administration / General</option>
                  ${departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Duty Shift</label>
                <select id="staff-shift" class="form-select" required>
                  <option value="morning">Morning (07:00 - 15:00)</option>
                  <option value="evening">Evening (15:00 - 23:00)</option>
                  <option value="night">Night (23:00 - 07:00)</option>
                  <option value="rotating">Rotating</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input type="text" id="staff-phone" class="form-input" placeholder="+1 (555) 000-0000">
              </div>
            </div>
            <div style="margin-top: 0.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer;">
                <input type="checkbox" id="staff-create-account" checked>
                <span>Create Staff Login Account (Default initial password: <code>Staff123!</code>)</span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Staff Member</button>
          </div>
        </form>
      `;

      App.showDynamicModal(modalHtml);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async submitAdd(event) {
    event.preventDefault();
    const data = {
      name: document.getElementById('staff-name').value,
      email: document.getElementById('staff-email').value,
      role: document.getElementById('staff-role').value,
      department_id: document.getElementById('staff-dept').value || null,
      shift: document.getElementById('staff-shift').value,
      phone: document.getElementById('staff-phone').value,
      create_user_account: document.getElementById('staff-create-account').checked
    };

    try {
      await api.staff.create(data);
      showToast('Staff member registered successfully!', 'success');
      App.closeActiveModal();
      App.navigate('staff');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

window.StaffView = StaffView;

