/**
 * Appointments Scheduling View
 */
const AppointmentsView = {
  appointmentsList: [],

  async render() {
    let appointments = [];
    try {
      const res = await api.appointments.getAll();
      appointments = res.data || [];
      this.appointmentsList = appointments;
    } catch (err) {
      console.error('Failed to load appointments:', err);
    }

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--slate-900); letter-spacing: -0.02em;">Appointment Scheduling & Clinical Triage</h2>
          <p style="font-size: 0.875rem; color: var(--slate-500);">Coordinate physician consultation slots, follow-ups, and patient triage queues</p>
        </div>
        <div>
          <button class="btn btn-primary" onclick="App.openModal('bookAppointmentModal')">
            <span>➕ Book New Visit</span>
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <div class="search-input-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" id="apt-search-input" class="search-input" placeholder="Search by patient, doctor, or ID..." oninput="AppointmentsView.handleFilter()">
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <select id="apt-status-filter" class="select-filter" onchange="AppointmentsView.handleFilter()">
            <option value="">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input type="date" id="apt-date-filter" class="select-filter" onchange="AppointmentsView.handleFilter()">
          <button class="btn btn-secondary btn-sm" onclick="AppointmentsView.clearDateFilter()">Clear Date</button>
        </div>
      </div>

      <!-- Appointments Table -->
      <div class="content-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Appointment #</th>
                <th>Date & Time</th>
                <th>Patient Name</th>
                <th>Attending Doctor</th>
                <th>Department</th>
                <th>Type / Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="appointments-table-body">
              ${this.renderRows(appointments)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderRows(list) {
    if (!list || list.length === 0) {
      return `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching appointments found</td></tr>`;
    }

    return list.map(apt => `
      <tr>
        <td style="font-weight: 700; color: var(--primary);">${apt.id}</td>
        <td>
          <div style="font-weight: 600; color: var(--secondary);">${apt.appointment_date}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${apt.time_slot}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${apt.patient_name}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${apt.doctor_name}</div>
        </td>
        <td>${apt.department_name || '-'}</td>
        <td>
          <div style="font-size: 0.8rem; font-weight: 600; text-transform: capitalize;">${apt.type.replace('_', ' ')}</div>
          <div style="font-size: 0.725rem; color: var(--text-muted); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${apt.reason || '-'}</div>
        </td>
        <td>
          <span class="badge ${
            apt.status === 'completed' ? 'badge-success' :
            apt.status === 'in_progress' ? 'badge-warning' :
            apt.status === 'confirmed' ? 'badge-info' :
            apt.status === 'cancelled' ? 'badge-danger' : 'badge-neutral'
          }">${apt.status.replace('_', ' ')}</span>
        </td>
        <td>
          <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
            ${apt.status === 'scheduled' ? `
              <button class="btn btn-primary btn-sm" onclick="AppointmentsView.updateStatus('${apt.id}', 'confirmed')">
                Confirm
              </button>
            ` : ''}
            ${apt.status === 'confirmed' ? `
              <button class="btn btn-accent btn-sm" onclick="AppointmentsView.updateStatus('${apt.id}', 'in_progress')">
                Start Visit
              </button>
            ` : ''}
            ${apt.status === 'in_progress' ? `
              <button class="btn btn-primary btn-sm" onclick="AppointmentsView.openCompleteModal('${apt.id}')">
                Complete
              </button>
            ` : ''}
            ${!['completed', 'cancelled'].includes(apt.status) ? `
              <button class="btn btn-secondary btn-sm" onclick="AppointmentsView.openRescheduleModal('${apt.id}')">
                Reschedule
              </button>
              <button class="btn btn-danger btn-sm" onclick="AppointmentsView.cancel('${apt.id}')">
                Cancel
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  handleFilter() {
    const search = (document.getElementById('apt-search-input')?.value || '').toLowerCase();
    const status = document.getElementById('apt-status-filter')?.value || '';
    const date = document.getElementById('apt-date-filter')?.value || '';

    const filtered = this.appointmentsList.filter(apt => {
      const matchSearch = !search ||
        apt.patient_name.toLowerCase().includes(search) ||
        apt.doctor_name.toLowerCase().includes(search) ||
        apt.id.toLowerCase().includes(search);

      const matchStatus = !status || apt.status === status;
      const matchDate = !date || apt.appointment_date === date;

      return matchSearch && matchStatus && matchDate;
    });

    const tbody = document.getElementById('appointments-table-body');
    if (tbody) tbody.innerHTML = this.renderRows(filtered);
  },

  clearDateFilter() {
    const el = document.getElementById('apt-date-filter');
    if (el) el.value = '';
    this.handleFilter();
  },

  async updateStatus(id, newStatus) {
    try {
      await api.appointments.updateStatus(id, { status: newStatus });
      showToast(`Appointment status updated to ${newStatus}`, 'success');
      App.navigate('appointments');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  openCompleteModal(appointmentId) {
    const modalHtml = `
      <div class="modal-header">
        <h3>Complete Consultation</h3>
        <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
      </div>
      <form onsubmit="AppointmentsView.submitComplete(event, '${appointmentId}')">
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
            Completing this visit will finalize clinical notes, record prescription details, and automatically generate an invoice line item.
          </p>
          <div class="form-group">
            <label class="form-label">Doctor's Consultation Notes</label>
            <textarea id="complete-notes" class="form-textarea" placeholder="Clinical observations and advice..." required></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Prescription (Rx) & Medications</label>
            <input type="text" id="complete-prescription" class="form-input" placeholder="e.g. Lisinopril 10mg once daily; Aspirin 81mg">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Complete & Generate Bill</button>
        </div>
      </form>
    `;

    App.showDynamicModal(modalHtml);
  },

  async submitComplete(event, appointmentId) {
    event.preventDefault();
    const notes = document.getElementById('complete-notes').value;
    const prescription_notes = document.getElementById('complete-prescription').value;

    try {
      await api.appointments.updateStatus(appointmentId, {
        status: 'completed',
        notes,
        prescription_notes
      });
      showToast('Appointment completed and billing draft created!', 'success');
      App.closeActiveModal();
      App.navigate('appointments');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  openRescheduleModal(appointmentId) {
    const modalHtml = `
      <div class="modal-header">
        <h3>Reschedule Appointment</h3>
        <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
      </div>
      <form onsubmit="AppointmentsView.submitReschedule(event, '${appointmentId}')">
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">New Appointment Date</label>
            <input type="date" id="resched-date" class="form-input" required min="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label class="form-label">New Time Slot</label>
            <select id="resched-slot" class="form-select" required>
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
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Confirm Reschedule</button>
        </div>
      </form>
    `;

    App.showDynamicModal(modalHtml);
  },

  async submitReschedule(event, appointmentId) {
    event.preventDefault();
    const appointment_date = document.getElementById('resched-date').value;
    const time_slot = document.getElementById('resched-slot').value;

    try {
      await api.appointments.reschedule(appointmentId, { appointment_date, time_slot });
      showToast('Appointment rescheduled successfully!', 'success');
      App.closeActiveModal();
      App.navigate('appointments');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async cancel(appointmentId) {
    const reason = prompt('Please enter cancellation reason (optional):');
    if (reason === null) return; // User pressed cancel on prompt

    try {
      await api.appointments.cancel(appointmentId, reason);
      showToast('Appointment cancelled', 'info');
      App.navigate('appointments');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

window.AppointmentsView = AppointmentsView;

