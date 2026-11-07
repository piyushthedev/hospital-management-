/**
 * Departments Management View
 */
const DepartmentsView = {
  departmentsList: [],

  async render() {
    let departments = [];
    try {
      const res = await api.departments.getAll();
      departments = res.data || [];
      this.departmentsList = departments;
    } catch (err) {
      console.error('Failed to load departments:', err);
    }

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--slate-900); letter-spacing: -0.02em;">Hospital Departments & Medical Units</h2>
          <p style="font-size: 0.875rem; color: var(--slate-500);">Clinical specialty units, lead physician appointments, floor wings, and ward bed allocations</p>
        </div>
        ${api.user.role === 'admin' ? `
          <div>
            <button class="btn btn-primary" onclick="DepartmentsView.openAddModal()">
              <span>➕ Add Department</span>
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Departments Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
        ${departments.map(d => {
          const occupancy = d.bed_count > 0 ? Math.round((d.occupied_beds / d.bed_count) * 100) : 0;
          return `
            <div class="stat-card" style="padding: 1.5rem; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
                  <div>
                    <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--secondary);">${d.name}</h3>
                    <span class="badge badge-info">${d.code}</span>
                  </div>
                  <span class="badge badge-success">${d.status}</span>
                </div>

                <p style="font-size: 0.825rem; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.4;">
                  ${d.description || 'General hospital clinical department'}
                </p>

                <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 1rem;">
                  <div><strong>Head Doctor:</strong> ${d.head_doctor_name || 'Dr. Not Assigned'}</div>
                  <div><strong>Location:</strong> ${d.floor || 'Main Building'}</div>
                  <div><strong>Phone Extension:</strong> ${d.phone_extension || '-'}</div>
                </div>

                <!-- Bed Occupancy Bar -->
                <div style="margin-bottom: 0.75rem;">
                  <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                    <span>Ward Beds: ${d.occupied_beds || 0} / ${d.bed_count || 0}</span>
                    <span>${occupancy}%</span>
                  </div>
                  <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 9999px; overflow: hidden;">
                    <div style="width: ${occupancy}%; height: 100%; background: ${occupancy > 80 ? 'var(--danger)' : 'var(--primary)'};"></div>
                  </div>
                </div>
              </div>

              <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                  <strong>${d.doctor_count || 0}</strong> Doctors • <strong>${d.staff_count || 0}</strong> Staff
                </div>
                <button class="btn btn-secondary btn-sm" onclick="DepartmentsView.viewDetails('${d.id}')">
                  View Unit
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  async viewDetails(deptId) {
    try {
      const res = await api.departments.getById(deptId);
      const d = res.data;

      const modalHtml = `
        <div class="modal-header">
          <div>
            <h3>${d.name} (${d.code})</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${d.floor} • ${d.phone_extension}</span>
          </div>
          <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.25rem;">${d.description}</p>
          
          <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--secondary); margin-bottom: 0.5rem;">Assigned Doctors (${d.doctors?.length || 0})</h4>
          <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1.25rem;">
            ${(d.doctors || []).map(doc => `
              <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: #f8fafc; border-radius: 6px; font-size: 0.85rem;">
                <div><strong>${doc.name}</strong> (${doc.specialization})</div>
                <span class="badge ${doc.availability_status === 'available' ? 'badge-success' : 'badge-neutral'}">${doc.availability_status}</span>
              </div>
            `).join('')}
          </div>

          <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--secondary); margin-bottom: 0.5rem;">Ward Beds (${d.beds?.length || 0})</h4>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.5rem;">
            ${(d.beds || []).map(b => `
              <div style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.775rem; text-align: center; background: ${b.status === 'occupied' ? '#e0f2fe' : '#f0fdf4'};">
                <div style="font-weight: 700;">${b.room_number}-${b.bed_number}</div>
                <div style="color: var(--text-muted);">${b.status}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="App.closeActiveModal()">Close</button>
        </div>
      `;

      App.showDynamicModal(modalHtml);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  openAddModal() {
    const modalHtml = `
      <div class="modal-header">
        <h3>Create Clinical Department</h3>
        <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
      </div>
      <form onsubmit="DepartmentsView.submitAdd(event)">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Department Name</label>
              <input type="text" id="dept-name" class="form-input" placeholder="e.g. Oncology & Hematology" required>
            </div>
            <div class="form-group">
              <label class="form-label">Department Code</label>
              <input type="text" id="dept-code" class="form-input" placeholder="e.g. ONCO" required>
            </div>
            <div class="form-group">
              <label class="form-label">Floor / Building Location</label>
              <input type="text" id="dept-floor" class="form-input" placeholder="e.g. 5th Floor - Wing A">
            </div>
            <div class="form-group">
              <label class="form-label">Phone Extension</label>
              <input type="text" id="dept-ext" class="form-input" placeholder="e.g. Ext 501">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Description & Scope of Care</label>
            <textarea id="dept-desc" class="form-textarea" placeholder="Department clinical responsibilities..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Department</button>
        </div>
      </form>
    `;

    App.showDynamicModal(modalHtml);
  },

  async submitAdd(event) {
    event.preventDefault();
    const data = {
      name: document.getElementById('dept-name').value,
      code: document.getElementById('dept-code').value.toUpperCase(),
      floor: document.getElementById('dept-floor').value,
      phone_extension: document.getElementById('dept-ext').value,
      description: document.getElementById('dept-desc').value
    };

    try {
      await api.departments.create(data);
      showToast('Department successfully created!', 'success');
      App.closeActiveModal();
      App.navigate('departments');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

window.DepartmentsView = DepartmentsView;

