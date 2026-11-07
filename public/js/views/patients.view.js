/**
 * Patients Management View
 */
const PatientsView = {
  patientsList: [],

  async render() {
    let patients = [];
    try {
      const res = await api.patients.getAll();
      patients = res.data || [];
      this.patientsList = patients;
    } catch (err) {
      console.error('Failed to load patients:', err);
    }

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--slate-900); letter-spacing: -0.02em;">Patient Registry & Health Records</h2>
          <p style="font-size: 0.875rem; color: var(--slate-500);">Comprehensive patient demographics, admissions, and longitudinal clinical history</p>
        </div>
        <div>
          <button class="btn btn-primary" onclick="App.openModal('registerPatientModal')">
            <span>➕ Register Patient</span>
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" id="patient-search-input" class="search-input" placeholder="Search by name, MRN, phone, email..." oninput="PatientsView.handleFilter()">
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <select id="patient-status-filter" class="select-filter" onchange="PatientsView.handleFilter()">
            <option value="">All Patient Statuses</option>
            <option value="admitted">Admitted (Inpatient)</option>
            <option value="outpatient">Outpatient</option>
            <option value="discharged">Discharged</option>
          </select>
          <select id="patient-blood-filter" class="select-filter" onchange="PatientsView.handleFilter()">
            <option value="">All Blood Groups</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
        </div>
      </div>

      <!-- Patients Data Table -->
      <div class="content-card">
        <div class="table-responsive">
          <table class="data-table" id="patients-table">
            <thead>
              <tr>
                <th>MRN / ID</th>
                <th>Patient Name</th>
                <th>Age / Gender</th>
                <th>Blood Group</th>
                <th>Phone / Email</th>
                <th>Status / Bed</th>
                <th>Insurance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="patients-table-body">
              ${this.renderRows(patients)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderRows(list) {
    if (!list || list.length === 0) {
      return `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching patients found</td></tr>`;
    }

    return list.map(p => {
      const birthYear = p.date_of_birth ? new Date(p.date_of_birth).getFullYear() : null;
      const age = birthYear ? (new Date().getFullYear() - birthYear) : '-';

      return `
        <tr>
          <td style="font-weight: 700; color: var(--primary);">${p.id}</td>
          <td>
            <div style="font-weight: 600; color: var(--secondary);">${p.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${p.emergency_contact_name || ''}</div>
          </td>
          <td>${age} yrs / ${p.gender}</td>
          <td>
            <span class="badge badge-info" style="font-weight: 700;">${p.blood_group || 'Unknown'}</span>
          </td>
          <td>
            <div>${p.phone}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${p.email || '-'}</div>
          </td>
          <td>
            <span class="badge ${
              p.status === 'admitted' ? 'badge-primary' :
              p.status === 'outpatient' ? 'badge-success' : 'badge-neutral'
            }">${p.status}</span>
            ${p.status === 'admitted' && p.room_number ? `
              <div style="font-size: 0.725rem; color: var(--primary-dark); font-weight: 600; margin-top: 2px;">
                🛏️ ${p.room_number} (${p.bed_number})
              </div>
            ` : ''}
          </td>
          <td>
            <div style="font-size: 0.8rem;">${p.insurance_provider || 'Self-pay'}</div>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${p.insurance_policy_number || ''}</div>
          </td>
          <td>
            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
              <button class="btn btn-secondary btn-sm" onclick="PatientsView.viewChart('${p.id}')">
                📋 Chart
              </button>
              ${p.status !== 'admitted' ? `
                <button class="btn btn-primary btn-sm" onclick="PatientsView.openAdmitModal('${p.id}', '${p.name}')">
                  Admit
                </button>
              ` : `
                <button class="btn btn-danger btn-sm" onclick="PatientsView.discharge('${p.id}', '${p.name}')">
                  Discharge
                </button>
              `}
              <button class="btn btn-secondary btn-sm" onclick="PatientsView.openRecordModal('${p.id}', '${p.name}')">
                + Vitals
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  handleFilter() {
    const search = (document.getElementById('patient-search-input')?.value || '').toLowerCase();
    const status = document.getElementById('patient-status-filter')?.value || '';
    const blood = document.getElementById('patient-blood-filter')?.value || '';

    const filtered = this.patientsList.filter(p => {
      const matchSearch = !search || 
        p.name.toLowerCase().includes(search) || 
        p.id.toLowerCase().includes(search) || 
        p.phone.includes(search) || 
        (p.email && p.email.toLowerCase().includes(search));
      
      const matchStatus = !status || p.status === status;
      const matchBlood = !blood || p.blood_group === blood;

      return matchSearch && matchStatus && matchBlood;
    });

    const tbody = document.getElementById('patients-table-body');
    if (tbody) tbody.innerHTML = this.renderRows(filtered);
  },

  async viewChart(patientId) {
    try {
      const res = await api.patients.getById(patientId);
      const p = res.data;

      const modalHtml = `
        <div class="modal-header">
          <div>
            <h3>Medical Chart: ${p.name}</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">MRN: ${p.id} • ${p.gender} • Blood Group: ${p.blood_group || 'N/A'}</span>
          </div>
          <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
        </div>
        <div class="modal-body" style="display: flex; flex-direction: column; gap: 1.25rem;">
          
          <!-- Key Info Highlights -->
          <div style="background: #f8fafc; padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; font-size: 0.825rem;">
            <div><strong>Status:</strong> <span class="badge ${p.status === 'admitted' ? 'badge-primary' : 'badge-neutral'}">${p.status}</span></div>
            <div><strong>Ward / Bed:</strong> ${p.room_number ? `${p.room_number} - ${p.bed_number}` : 'N/A'}</div>
            <div><strong>Insurance:</strong> ${p.insurance_provider || 'None'}</div>
            <div style="grid-column: span 3;"><strong>Known Allergies:</strong> <span style="color: var(--danger); font-weight: 600;">${p.allergies || 'No known allergies'}</span></div>
            <div style="grid-column: span 3;"><strong>Chronic Conditions:</strong> ${p.chronic_conditions || 'None reported'}</div>
          </div>

          <!-- Clinical Records & Vitals Timeline -->
          <div>
            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--secondary);">Clinical History & Consultations (${p.medical_records?.length || 0})</h4>
            ${!p.medical_records || p.medical_records.length === 0 ? `
              <p style="font-size: 0.825rem; color: var(--text-muted);">No clinical records on file yet.</p>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                ${p.medical_records.map(r => `
                  <div style="border-left: 3px solid var(--primary); padding-left: 1rem; background: #ffffff; border-radius: 0 8px 8px 0; border: 1px solid var(--border-color); padding: 0.85rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                      <span class="badge badge-info">${r.record_type}</span>
                      <span style="font-size: 0.75rem; color: var(--text-muted);">${r.created_at}</span>
                    </div>
                    <div style="font-size: 0.875rem; font-weight: 700; color: var(--secondary);">${r.diagnosis || 'Clinical Assessment'}</div>
                    ${r.symptoms ? `<div style="font-size: 0.8rem; color: var(--text-muted);"><strong>Symptoms:</strong> ${r.symptoms}</div>` : ''}
                    ${r.vitals ? `<div style="font-size: 0.8rem; color: var(--accent-dark); background: var(--accent-light); display: inline-block; padding: 2px 8px; border-radius: 4px; margin: 4px 0;"><strong>Vitals:</strong> ${r.vitals}</div>` : ''}
                    ${r.prescription ? `<div style="font-size: 0.8rem; color: var(--info); margin-top: 4px;"><strong>Rx Prescription:</strong> ${r.prescription}</div>` : ''}
                    ${r.notes ? `<div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 4px;"><em>Notes: ${r.notes}</em></div>` : ''}
                    ${r.doctor_name ? `<div style="font-size: 0.75rem; color: var(--text-subtle); margin-top: 4px;">Attending: ${r.doctor_name}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            `}
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

  async openAdmitModal(patientId, patientName) {
    try {
      const res = await api.admin.getBeds({ status: 'available' });
      const availableBeds = res.data || [];

      if (availableBeds.length === 0) {
        showToast('No available hospital beds found. All wards are currently full.', 'warning');
        return;
      }

      const modalHtml = `
        <div class="modal-header">
          <h3>Admit Patient: ${patientName}</h3>
          <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
        </div>
        <form onsubmit="PatientsView.submitAdmit(event, '${patientId}')">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Select Available Bed</label>
              <select id="admit-bed-id" class="form-select" required>
                ${availableBeds.map(b => `
                  <option value="${b.id}">
                    ${b.room_number} - ${b.bed_number} (${b.ward_type} Ward - $${b.daily_rate}/day)
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Admission Reason</label>
              <input type="text" id="admit-reason" class="form-input" placeholder="e.g. Inpatient surgical recovery, Acute observation" required>
            </div>
            <div class="form-group">
              <label class="form-label">Clinical Notes</label>
              <textarea id="admit-notes" class="form-textarea" placeholder="Special patient instructions..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Confirm Admission</button>
          </div>
        </form>
      `;

      App.showDynamicModal(modalHtml);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async submitAdmit(event, patientId) {
    event.preventDefault();
    const bed_id = document.getElementById('admit-bed-id').value;
    const reason = document.getElementById('admit-reason').value;
    const notes = document.getElementById('admit-notes').value;

    try {
      await api.patients.admit(patientId, { bed_id, reason, notes });
      showToast('Patient successfully admitted to ward!', 'success');
      App.closeActiveModal();
      App.navigate('patients');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async discharge(patientId, patientName) {
    if (!confirm(`Are you sure you want to discharge ${patientName}? This will free their bed and conclude active inpatient care.`)) {
      return;
    }

    try {
      await api.patients.discharge(patientId, { notes: 'Discharged in stable condition' });
      showToast(`${patientName} discharged successfully!`, 'success');
      App.navigate('patients');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  openRecordModal(patientId, patientName) {
    const modalHtml = `
      <div class="modal-header">
        <h3>Add Clinical Vitals / Notes for ${patientName}</h3>
        <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
      </div>
      <form onsubmit="PatientsView.submitRecord(event, '${patientId}')">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Record Type</label>
              <select id="record-type" class="form-select">
                <option value="vitals">Vital Signs Assessment</option>
                <option value="consultation">Consultation Note</option>
                <option value="diagnosis">Diagnosis</option>
                <option value="prescription">Prescription</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Blood Pressure (BP)</label>
              <input type="text" id="vital-bp" class="form-input" placeholder="e.g. 120/80 mmHg">
            </div>
            <div class="form-group">
              <label class="form-label">Heart Rate (Pulse)</label>
              <input type="text" id="vital-hr" class="form-input" placeholder="e.g. 74 bpm">
            </div>
            <div class="form-group">
              <label class="form-label">Oxygen Saturation (SpO2)</label>
              <input type="text" id="vital-spo2" class="form-input" placeholder="e.g. 98%">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Primary Diagnosis / Clinical Findings</label>
            <input type="text" id="record-diagnosis" class="form-input" placeholder="e.g. Acute Bronchitis" required>
          </div>
          <div class="form-group">
            <label class="form-label">Prescription (Rx)</label>
            <input type="text" id="record-prescription" class="form-input" placeholder="e.g. Azithromycin 250mg once daily">
          </div>
          <div class="form-group">
            <label class="form-label">Clinical Observations & Notes</label>
            <textarea id="record-notes" class="form-textarea" placeholder="Detailed notes..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save to Medical Chart</button>
        </div>
      </form>
    `;

    App.showDynamicModal(modalHtml);
  },

  async submitRecord(event, patientId) {
    event.preventDefault();
    const record_type = document.getElementById('record-type').value;
    const diagnosis = document.getElementById('record-diagnosis').value;
    const prescription = document.getElementById('record-prescription').value;
    const notes = document.getElementById('record-notes').value;
    const bp = document.getElementById('vital-bp').value;
    const hr = document.getElementById('vital-hr').value;
    const spo2 = document.getElementById('vital-spo2').value;

    const vitals = {};
    if (bp) vitals.bp = bp;
    if (hr) vitals.hr = hr;
    if (spo2) vitals.spo2 = spo2;

    try {
      await api.patients.addMedicalRecord(patientId, {
        record_type,
        diagnosis,
        prescription,
        notes,
        vitals: Object.keys(vitals).length ? vitals : null
      });
      showToast('Clinical record saved to chart!', 'success');
      App.closeActiveModal();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

window.PatientsView = PatientsView;

