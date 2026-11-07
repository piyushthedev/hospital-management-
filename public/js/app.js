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

  async openModal(modalName) {
    if (modalName === 'bookAppointmentModal') {
      try {
        const [patRes, docRes] = await Promise.all([
          api.patients.getAll(),
          api.doctors.getAll()
        ]);
        const patients = patRes.data || [];
        const doctors = docRes.data || [];

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const minDate = tomorrow.toISOString().split('T')[0];

        const modalHtml = `
          <div class="modal-header">
            <h3>Book Medical Appointment</h3>
            <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
          </div>
          <form onsubmit="App.submitBookAppointment(event)">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Patient</label>
                <select id="book-patient-id" class="form-select" required>
                  ${patients.map(p => `<option value="${p.id}">${p.name} (MRN: ${p.id})</option>`).join('')}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Physician Specialist</label>
                <select id="book-doctor-id" class="form-select" required>
                  ${doctors.map(d => `<option value="${d.id}">${d.name} - ${d.specialization} ($${d.consultation_fee})</option>`).join('')}
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
                    <option value="09:00 AM - 09:30 AM">09:00 AM - 09:30 AM</option>
                    <option value="09:30 AM - 10:00 AM">09:30 AM - 10:00 AM</option>
                    <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                    <option value="10:30 AM - 11:00 AM">10:30 AM - 11:00 AM</option>
                    <option value="11:00 AM - 11:30 AM">11:00 AM - 11:30 AM</option>
                    <option value="11:30 AM - 12:00 PM">11:30 AM - 12:00 PM</option>
                    <option value="02:00 PM - 02:30 PM">02:00 PM - 02:30 PM</option>
                    <option value="02:30 PM - 03:00 PM">02:30 PM - 03:00 PM</option>
                    <option value="03:00 PM - 03:30 PM">03:00 PM - 03:30 PM</option>
                    <option value="03:30 PM - 04:00 PM">03:30 PM - 04:00 PM</option>
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

  async submitBookAppointment(event) {
    event.preventDefault();
    const data = {
      patient_id: document.getElementById('book-patient-id').value,
      doctor_id: document.getElementById('book-doctor-id').value,
      appointment_date: document.getElementById('book-date').value,
      time_slot: document.getElementById('book-slot').value,
      type: document.getElementById('book-type').value,
      reason: document.getElementById('book-reason').value
    };

    try {
      await api.appointments.create(data);
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

