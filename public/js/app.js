/**
 * Hospital Management System - Main Application Orchestrator
 */

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}
window.showToast = showToast;

const App = {
  currentView: 'dashboard',
  views: {},

  init() {
    this.views = {
      login: window.LoginView,
      dashboard: window.DashboardView,
      patients: window.PatientsView,
      doctors: window.DoctorsView,
      appointments: window.AppointmentsView,
      departments: window.DepartmentsView,
      lab: window.LabView,
      pharmacy: window.PharmacyView,
      staff: window.StaffView,
      billing: window.BillingView,
      admin: window.AdminView
    };

    window.addEventListener('auth:expired', () => {
      showToast('Session expired. Please sign in again.', 'warning');
      this.navigate('login');
    });

    window.addEventListener('auth:logout', () => {
      showToast('Signed out of hospital portal', 'info');
      this.navigate('login');
    });

    // Close dynamic modal on backdrop click
    const dynamicModal = document.getElementById('dynamic-modal');
    if (dynamicModal) {
      dynamicModal.addEventListener('click', (e) => {
        if (e.target === dynamicModal) this.closeActiveModal();
      });
    }

    // Default route
    if (!api.isAuthenticated()) {
      this.navigate('login');
    } else {
      this.navigate('dashboard');
    }
  },

  async navigate(viewName) {
    if (!api.isAuthenticated() && viewName !== 'login') {
      viewName = 'login';
    }

    if (api.isAuthenticated() && viewName === 'login') {
      viewName = 'dashboard';
    }

    this.currentView = viewName;
    const view = this.views[viewName] || this.views.dashboard;

    const appRoot = document.getElementById('app-root');
    const viewport = document.getElementById('viewport-content');
    const topbar = document.getElementById('topbar');
    const sidebar = document.getElementById('sidebar');

    if (viewName === 'login') {
      sidebar.style.display = 'none';
      topbar.style.display = 'none';
      viewport.innerHTML = view.render();
      return;
    }

    sidebar.style.display = 'flex';
    topbar.style.display = 'flex';

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewName);
    });

    // Update Page Title
    const titleMap = {
      dashboard: 'Executive Dashboard',
      patients: 'Patient Management',
      doctors: 'Physician Management',
      appointments: 'Appointments & Scheduling',
      departments: 'Hospital Departments',
      lab: 'Diagnostic Laboratory & Pathology',
      pharmacy: 'Pharmacy & Formulary Inventory',
      staff: 'Staff & Shift Roster',
      billing: 'Billing & Invoicing',
      admin: 'Hospital Administration'
    };
    document.getElementById('page-title').textContent = titleMap[viewName] || 'Hospital Management';

    // Update User Profile in Sidebar
    const user = api.user;
    if (user) {
      document.getElementById('sidebar-user-name').textContent = user.name;
      document.getElementById('sidebar-user-role').textContent = user.role.toUpperCase();
      document.getElementById('sidebar-user-avatar').textContent = user.name.charAt(0);

      // Role switcher sync
      const switcher = document.getElementById('role-switcher-select');
      if (switcher) switcher.value = user.email;

      // Restrict tabs if patient
      const adminNav = document.querySelector('[data-view="admin"]');
      const staffNav = document.querySelector('[data-view="staff"]');
      const deptNav = document.querySelector('[data-view="departments"]');

      if (adminNav) adminNav.style.display = user.role === 'admin' ? 'flex' : 'none';
      if (staffNav) staffNav.style.display = user.role !== 'patient' ? 'flex' : 'none';
      if (deptNav) deptNav.style.display = user.role !== 'patient' ? 'flex' : 'none';
    }

    // Render View with spinner
    viewport.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 300px; color: var(--primary);">
        <div style="font-size: 1.5rem; font-weight: 700;">Loading telemetry...</div>
      </div>
    `;

    try {
      const html = await view.render();
      viewport.innerHTML = html;
    } catch (err) {
      viewport.innerHTML = `
        <div class="content-card" style="padding: 2rem; text-align: center; color: var(--danger);">
          <h3>Error loading view</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  },

  async handleRoleSwitch(targetEmail) {
    const credentialsMap = {
      'admin@hospital.org': 'Admin123!',
      'doctor.chen@hospital.org': 'Doctor123!',
      'staff.nurse@hospital.org': 'Staff123!',
      'accountant@hospital.org': 'Finance123!',
      'patient.doe@hospital.org': 'Patient123!'
    };

    const password = credentialsMap[targetEmail];
    if (!password) return;

    try {
      await api.auth.login(targetEmail, password);
      showToast(`Switched persona to ${api.user.name} (${api.user.role.toUpperCase()})`, 'success');
      this.navigate(this.currentView === 'login' ? 'dashboard' : this.currentView);
    } catch (err) {
      showToast(`Failed to switch persona: ${err.message}`, 'error');
    }
  },

  showDynamicModal(contentHtml) {
    const modal = document.getElementById('dynamic-modal');
    const container = document.getElementById('dynamic-modal-content');
    if (!modal || !container) return;

    container.innerHTML = contentHtml;
    modal.classList.add('active');
  },

  closeActiveModal() {
    const modal = document.getElementById('dynamic-modal');
    if (modal) modal.classList.remove('active');

    // Also close static modals if any
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  },

  async openModal(modalName, params = {}) {
    if (modalName === 'bookAppointmentModal') {
      try {
        const [patRes, docRes] = await Promise.all([
          api.patients.getAll(),
          api.doctors.getAll()
        ]);
        const patients = patRes.data || [];
        const doctors = docRes.data || [];
        this.cachedBookingPatients = patients;
        this.bookingPatientMode = 'existing';

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];

        const isPatientUser = api.user?.role === 'patient';
        const myPatient = isPatientUser ? (patients.find(p => p.email === api.user.email || p.user_id === api.user.id) || patients[0]) : null;

        const preselectedDoctorId = params.doctorId || (doctors[0]?.id || '');
        const preselectedSlot = params.preselectedSlot || '09:00 AM - 09:30 AM';
        const preselectedPatientId = params.patientId || (myPatient?.id || patients[0]?.id || '');

        const modalHtml = `
          <div class="modal-header">
            <div>
              <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--slate-900);">Book Medical Appointment</h3>
              <p style="margin: 2px 0 0 0; font-size: 0.775rem; color: var(--slate-500);">Schedule patient clinical consultation with verified specialists</p>
            </div>
            <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
          </div>
          <form onsubmit="App.submitBookAppointment(event)">
            <div class="modal-body">
              
              <!-- Patient Details & Selection Section -->
              <div class="form-group" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0.85rem; margin-bottom: 1.25rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
                  <label class="form-label" style="margin-bottom: 0; font-weight: 700; color: var(--slate-800);">
                    👤 Patient Information
                  </label>
                  ${!isPatientUser ? `
                    <div style="display: flex; gap: 0.25rem; background: #e2e8f0; padding: 2px; border-radius: 6px;">
                      <button type="button" id="btn-patient-mode-existing" class="btn btn-sm" 
                        style="background: white; color: var(--primary); padding: 3px 10px; font-size: 0.75rem; font-weight: 700; border-radius: 4px; border: none; cursor: pointer;" 
                        onclick="App.setBookingPatientMode('existing')">
                        Existing Patient
                      </button>
                      <button type="button" id="btn-patient-mode-new" class="btn btn-sm" 
                        style="background: transparent; color: #475569; padding: 3px 10px; font-size: 0.75rem; font-weight: 600; border-radius: 4px; border: none; cursor: pointer;" 
                        onclick="App.setBookingPatientMode('new')">
                        ➕ New Patient Intake
                      </button>
                    </div>
                  ` : ''}
                </div>

                ${isPatientUser && myPatient ? `
                  <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong style="color: var(--slate-900);">${myPatient.name}</strong> 
                      <span style="color: var(--primary); font-weight: 700;">(MRN: ${myPatient.id})</span>
                      <div style="font-size: 0.75rem; color: var(--slate-600); margin-top: 2px;">
                        📞 ${myPatient.phone} • ✉️ ${myPatient.email || api.user.email}
                      </div>
                    </div>
                    <span class="badge badge-success">Verified Profile</span>
                    <input type="hidden" id="book-patient-id" value="${myPatient.id}">
                  </div>
                ` : `
                  <!-- Existing Patient Search & Selection Pane -->
                  <div id="booking-patient-existing-pane">
                    <div class="search-input-wrapper" style="margin-bottom: 0.5rem;">
                      <span class="search-icon">🔍</span>
                      <input type="text" id="book-patient-search" class="search-input" 
                        placeholder="Type to search by Patient Name, MRN (PAT-...), Phone..." 
                        oninput="App.filterBookingPatients()">
                    </div>
                    <select id="book-patient-id" class="form-select" onchange="App.updateBookingPatientPreview()">
                      ${patients.map(p => `<option value="${p.id}" ${p.id === preselectedPatientId ? 'selected' : ''}>${p.name} (MRN: ${p.id})</option>`).join('')}
                    </select>
                    <!-- Live Patient Details Preview -->
                    <div id="book-patient-preview"></div>
                  </div>

                  <!-- New Patient Instant Intake Pane -->
                  <div id="booking-patient-new-pane" style="display: none; background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.85rem;">
                    <div style="font-size: 0.775rem; font-weight: 700; color: var(--primary); margin-bottom: 0.65rem; display: flex; align-items: center; gap: 4px;">
                      ⚡ Instant Patient Intake & Record Creation
                    </div>
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                      <div>
                        <label style="font-size: 0.725rem; font-weight: 600; color: var(--slate-600);">First Name *</label>
                        <input type="text" id="new-pat-fname" class="form-input" placeholder="e.g. John">
                      </div>
                      <div>
                        <label style="font-size: 0.725rem; font-weight: 600; color: var(--slate-600);">Last Name *</label>
                        <input type="text" id="new-pat-lname" class="form-input" placeholder="e.g. Doe">
                      </div>
                    </div>
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                      <div>
                        <label style="font-size: 0.725rem; font-weight: 600; color: var(--slate-600);">Phone Number *</label>
                        <input type="tel" id="new-pat-phone" class="form-input" placeholder="+1 (555) 000-0000">
                      </div>
                      <div>
                        <label style="font-size: 0.725rem; font-weight: 600; color: var(--slate-600);">Email Address</label>
                        <input type="email" id="new-pat-email" class="form-input" placeholder="patient@example.com">
                      </div>
                    </div>
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.5rem;">
                      <div>
                        <label style="font-size: 0.725rem; font-weight: 600; color: var(--slate-600);">Date of Birth *</label>
                        <input type="date" id="new-pat-dob" class="form-input" value="1992-05-15">
                      </div>
                      <div>
                        <label style="font-size: 0.725rem; font-weight: 600; color: var(--slate-600);">Gender *</label>
                        <select id="new-pat-gender" class="form-select">
                          <option value="Female">Female</option>
                          <option value="Male">Male</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div class="form-grid" style="grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                      <div>
                        <label style="font-size: 0.725rem; font-weight: 600; color: var(--slate-600);">Insurance Provider</label>
                        <input type="text" id="new-pat-insurance" class="form-input" placeholder="e.g. Blue Cross, Aetna">
                      </div>
                      <div>
                        <label style="font-size: 0.725rem; font-weight: 600; color: var(--slate-600);">Policy # / Claim ID</label>
                        <input type="text" id="new-pat-policy" class="form-input" placeholder="e.g. POL-992810">
                      </div>
                    </div>
                  </div>
                `}
              </div>

              <!-- Doctor Specialist Selection -->
              <div class="form-group">
                <label class="form-label" style="font-weight: 700; color: var(--slate-800);">🩺 Physician Specialist</label>
                <select id="book-doctor-id" class="form-select" required>
                  ${doctors.map(d => `
                    <option value="${d.id}" ${d.id === preselectedDoctorId ? 'selected' : ''}>
                      ${d.name} - ${d.specialization} ($${d.consultation_fee})
                    </option>
                  `).join('')}
                </select>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Date</label>
                  <input type="date" id="book-date" class="form-input" value="${minDate}" min="${new Date().toISOString().split('T')[0]}" required>
                </div>

                <div class="form-group">
                  <label class="form-label">Time Slot</label>
                  <select id="book-slot" class="form-select" required>
                    ${[
                      '09:00 AM - 09:30 AM',
                      '09:30 AM - 10:00 AM',
                      '10:00 AM - 10:30 AM',
                      '10:30 AM - 11:00 AM',
                      '11:00 AM - 11:30 AM',
                      '11:30 AM - 12:00 PM',
                      '02:00 PM - 02:30 PM',
                      '02:30 PM - 03:00 PM',
                      '03:00 PM - 03:30 PM',
                      '03:30 PM - 04:00 PM'
                    ].map(slot => `<option value="${slot}" ${slot === preselectedSlot ? 'selected' : ''}>${slot}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Consultation Type</label>
                <select id="book-type" class="form-select">
                  <option value="general_checkup">General Health Checkup</option>
                  <option value="follow_up">Follow-Up Consultation</option>
                  <option value="specialist_consultation">Specialist Consultation</option>
                  <option value="emergency">Urgent / Emergency Triage</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Symptoms / Reason for Visit</label>
                <textarea id="book-reason" class="form-textarea" placeholder="Chief complaints or symptoms..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
              <button type="submit" class="btn btn-primary">Confirm Booking</button>
            </div>
          </form>
        `;
        this.showDynamicModal(modalHtml);
        if (!isPatientUser) {
          this.updateBookingPatientPreview();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    } else if (modalName === 'registerPatientModal') {
      const modalHtml = `
        <div class="modal-header">
          <h3>Register New Patient Profile</h3>
          <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
        </div>
        <form onsubmit="App.submitRegisterPatient(event)">
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">First Name</label>
                <input type="text" id="reg-fname" class="form-input" placeholder="e.g. Eleanor" required>
              </div>
              <div class="form-group">
                <label class="form-label">Last Name</label>
                <input type="text" id="reg-lname" class="form-input" placeholder="e.g. Vance" required>
              </div>
              <div class="form-group">
                <label class="form-label">Date of Birth</label>
                <input type="date" id="reg-dob" class="form-input" required value="1985-06-15">
              </div>
              <div class="form-group">
                <label class="form-label">Gender</label>
                <select id="reg-gender" class="form-select" required>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Blood Group</label>
                <select id="reg-blood" class="form-select">
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
              <div class="form-group">
                <label class="form-label">Phone Number</label>
                <input type="tel" id="reg-phone" class="form-input" placeholder="+1 (555) 000-0000" required>
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" id="reg-email" class="form-input" placeholder="patient@example.com">
              </div>
              <div class="form-group">
                <label class="form-label">Insurance Provider</label>
                <input type="text" id="reg-insurance" class="form-input" placeholder="e.g. Blue Cross Shield, Aetna, Cigna">
              </div>
              <div class="form-group">
                <label class="form-label">Policy # / Insurance Claim ID</label>
                <input type="text" id="reg-insurance-policy" class="form-input" placeholder="e.g. POL-992810">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Residential Address</label>
              <input type="text" id="reg-address" class="form-input" placeholder="Street, City, State, Zip">
            </div>
            <div class="form-group">
              <label class="form-label">Known Allergies (if any)</label>
              <input type="text" id="reg-allergies" class="form-input" placeholder="e.g. Penicillin, Peanuts, Latex">
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Complete Registration</button>
          </div>
        </form>
      `;
      this.showDynamicModal(modalHtml);
    } else if (modalName === 'createInvoiceModal') {
      window.BillingView.openCreateInvoiceModal();
    }
  },

  setBookingPatientMode(mode) {
    this.bookingPatientMode = mode;
    const existingPane = document.getElementById('booking-patient-existing-pane');
    const newPane = document.getElementById('booking-patient-new-pane');
    const btnExisting = document.getElementById('btn-patient-mode-existing');
    const btnNew = document.getElementById('btn-patient-mode-new');

    if (mode === 'new') {
      if (existingPane) existingPane.style.display = 'none';
      if (newPane) newPane.style.display = 'block';
      if (btnExisting) { btnExisting.style.background = 'transparent'; btnExisting.style.color = '#475569'; btnExisting.style.fontWeight = '600'; }
      if (btnNew) { btnNew.style.background = 'white'; btnNew.style.color = 'var(--primary)'; btnNew.style.fontWeight = '700'; }
    } else {
      if (existingPane) existingPane.style.display = 'block';
      if (newPane) newPane.style.display = 'none';
      if (btnExisting) { btnExisting.style.background = 'white'; btnExisting.style.color = 'var(--primary)'; btnExisting.style.fontWeight = '700'; }
      if (btnNew) { btnNew.style.background = 'transparent'; btnNew.style.color = '#475569'; btnNew.style.fontWeight = '600'; }
      this.updateBookingPatientPreview();
    }
  },

  filterBookingPatients() {
    const q = (document.getElementById('book-patient-search')?.value || '').toLowerCase().trim();
    const sel = document.getElementById('book-patient-id');
    if (!sel) return;

    const filtered = (this.cachedBookingPatients || []).filter(p => {
      return !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.id && p.id.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q));
    });

    if (filtered.length === 0) {
      sel.innerHTML = '<option value="">No matching patient found — Switch to "New Patient" above</option>';
    } else {
      sel.innerHTML = filtered.map(p => `<option value="${p.id}">${p.name} (MRN: ${p.id})</option>`).join('');
    }
    this.updateBookingPatientPreview();
  },

  updateBookingPatientPreview() {
    const sel = document.getElementById('book-patient-id');
    const preview = document.getElementById('book-patient-preview');
    if (!sel || !preview) return;

    const patId = sel.value;
    const pat = (this.cachedBookingPatients || []).find(p => p.id === patId);
    if (!pat) {
      preview.innerHTML = '';
      return;
    }

    const birthYear = pat.date_of_birth ? new Date(pat.date_of_birth).getFullYear() : null;
    const age = birthYear ? `${new Date().getFullYear() - birthYear} yrs` : '';

    preview.innerHTML = `
      <div style="background: white; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0.65rem 0.85rem; margin-top: 0.5rem; font-size: 0.775rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <div style="font-weight: 800; color: var(--slate-900); font-size: 0.875rem;">${pat.name} <span style="color: var(--primary); font-size: 0.75rem; font-weight: 700;">(${pat.id})</span></div>
          <div style="color: var(--slate-600); font-size: 0.725rem; margin-top: 2px;">
            📞 ${pat.phone || 'No phone'} ${pat.email ? `• ✉️ ${pat.email}` : ''} ${age ? `• ${age}` : ''} ${pat.gender ? `• ${pat.gender}` : ''}
          </div>
        </div>
        <div>
          ${pat.insurance_provider ? `<span class="badge badge-success" style="font-size: 0.7rem;">🛡️ ${pat.insurance_provider}</span>` : `<span class="badge badge-neutral" style="font-size: 0.7rem;">Self-Pay</span>`}
        </div>
      </div>
    `;
  },

  async submitBookAppointment(event) {
    event.preventDefault();
    let patient_id = '';

    if (this.bookingPatientMode === 'new') {
      const fname = document.getElementById('new-pat-fname')?.value?.trim();
      const lname = document.getElementById('new-pat-lname')?.value?.trim();
      const phone = document.getElementById('new-pat-phone')?.value?.trim();
      const email = document.getElementById('new-pat-email')?.value?.trim() || '';
      const dob = document.getElementById('new-pat-dob')?.value || '1995-01-01';
      const gender = document.getElementById('new-pat-gender')?.value || 'Other';
      const insProvider = document.getElementById('new-pat-insurance')?.value?.trim() || '';
      const insPolicy = document.getElementById('new-pat-policy')?.value?.trim() || '';

      if (!fname || !lname || !phone) {
        showToast('Please enter patient first name, last name, and phone number', 'warning');
        return;
      }

      try {
        const createRes = await api.patients.create({
          first_name: fname,
          last_name: lname,
          phone,
          email,
          date_of_birth: dob,
          gender,
          insurance_provider: insProvider,
          insurance_policy_number: insPolicy
        });
        patient_id = createRes.data?.id;
        showToast(`Patient ${fname} ${lname} registered (${patient_id})`, 'info');
      } catch (err) {
        showToast('Failed to register new patient: ' + err.message, 'error');
        return;
      }
    } else {
      patient_id = document.getElementById('book-patient-id')?.value;
      if (!patient_id) {
        showToast('Please select a patient or switch to "New Patient"', 'warning');
        return;
      }
    }

    const doctor_id = document.getElementById('book-doctor-id').value;
    const appointment_date = document.getElementById('book-date').value;
    const time_slot = document.getElementById('book-slot').value;
    const type = document.getElementById('book-type').value;
    const reason = document.getElementById('book-reason').value || 'Routine Consultation';

    try {
      await api.appointments.create({
        patient_id,
        doctor_id,
        appointment_date,
        time_slot,
        type,
        reason
      });
      showToast('Appointment booked successfully!', 'success');
      this.closeActiveModal();
      this.navigate(this.currentView);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async submitRegisterPatient(event) {
    event.preventDefault();
    const data = {
      first_name: document.getElementById('reg-fname').value,
      last_name: document.getElementById('reg-lname').value,
      date_of_birth: document.getElementById('reg-dob').value,
      gender: document.getElementById('reg-gender').value,
      blood_group: document.getElementById('reg-blood').value,
      phone: document.getElementById('reg-phone').value,
      email: document.getElementById('reg-email').value,
      insurance_provider: document.getElementById('reg-insurance')?.value || '',
      insurance_policy_number: document.getElementById('reg-insurance-policy')?.value || '',
      address: document.getElementById('reg-address').value,
      allergies: document.getElementById('reg-allergies').value
    };

    try {
      await api.patients.create(data);
      showToast('Patient registered successfully! Billing and intake profile initialized.', 'success');
      this.closeActiveModal();
      this.navigate(this.currentView === 'billing' ? 'billing' : 'patients');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());

