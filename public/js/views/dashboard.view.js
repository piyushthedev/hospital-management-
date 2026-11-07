/**
 * Hospital Dashboard View - Design4Users & Tubik Studio HealthTech Aesthetic
 */
const DashboardView = {
  async render() {
    let overview = { metrics: {}, recent_activity: [] };
    let todayAppointments = [];
    let doctors = [];

    try {
      if (['admin', 'doctor', 'staff', 'accountant'].includes(api.user.role)) {
        const res = await api.admin.getOverview();
        overview = res.data;
      }
      const aptRes = await api.appointments.getAll({ date: new Date().toISOString().split('T')[0] });
      todayAppointments = aptRes.data || [];
      const docRes = await api.doctors.getAll();
      doctors = docRes.data || [];
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }

    const m = overview.metrics || {};
    const pat = m.patients || { total: 0, admitted: 0, outpatient: 0 };
    const doc = m.doctors || { total: 0, available: 0, in_consultation: 0 };
    const beds = m.beds || { total: 0, occupied: 0, occupancy_rate: 0 };
    const apts = m.today_appointments || { total: 0, completed: 0, in_progress: 0, confirmed: 0 };
    const fin = m.financials || { total_revenue: 0, pending_balance: 0, total_invoiced: 0 };

    return `
      <!-- Hero Welcome Banner (Tubik HealthTech style) -->
      <div class="hero-welcome-banner">
        <div class="hero-banner-content">
          <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.6rem;">
            <span class="pulse-dot"></span>
            <span style="font-size: 0.775rem; text-transform: uppercase; font-weight: 800; letter-spacing: 0.08em; color: #7dd3fc;">Hospital Clinical Intelligence</span>
          </div>
          <h2>Welcome back, ${api.user.name} 👋</h2>
          <p>
            Metropolitan General clinical operations are currently optimal. All 6 specialty medical departments are active with 24/7 Level 1 emergency triage standing by.
          </p>
        </div>
        <div class="hero-banner-actions">
          <button class="btn btn-white" onclick="App.openModal('bookAppointmentModal')">
            <span>📅 Book Visit</span>
          </button>
          ${api.user.role !== 'patient' ? `
            <button class="btn btn-secondary" onclick="App.openModal('registerPatientModal')" style="background: rgba(255, 255, 255, 0.15); color: white; border-color: rgba(255, 255, 255, 0.25);">
              <span>👤 Register Patient</span>
            </button>
          ` : ''}
          ${['admin', 'accountant'].includes(api.user.role) ? `
            <button class="btn btn-secondary" onclick="App.openModal('createInvoiceModal')" style="background: rgba(255, 255, 255, 0.15); color: white; border-color: rgba(255, 255, 255, 0.25);">
              <span>💳 Invoice</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- 4 Hero Metric Cards with Visual Sparkline Trends -->
      <div class="grid-cards">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-title">Patient Roster</span>
            <div class="stat-icon" style="background: var(--primary-light); color: var(--primary);">👥</div>
          </div>
          <div class="stat-value">${pat.total}</div>
          <div class="stat-subtitle">
            <span class="stat-trend up">↑ Active</span>
            <span><strong>${pat.admitted}</strong> admitted in wards</span>
          </div>
          <!-- Sparkline -->
          <div style="margin-top: 1rem;">
            <svg viewBox="0 0 100 24" style="width: 100%; height: 24px; stroke: var(--primary); fill: none; stroke-width: 2.5; stroke-linecap: round;">
              <path d="M 0,16 Q 20,4 40,14 T 70,8 T 100,12" />
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-title">Attending Doctors</span>
            <div class="stat-icon" style="background: var(--emerald-light); color: var(--emerald);">🩺</div>
          </div>
          <div class="stat-value">${doc.total}</div>
          <div class="stat-subtitle">
            <span class="stat-trend up">✓ On Duty</span>
            <span><strong>${doc.available}</strong> ready for consult</span>
          </div>
          <!-- Sparkline -->
          <div style="margin-top: 1rem;">
            <svg viewBox="0 0 100 24" style="width: 100%; height: 24px; stroke: var(--emerald); fill: none; stroke-width: 2.5; stroke-linecap: round;">
              <path d="M 0,18 Q 25,12 50,6 T 80,10 T 100,4" />
            </svg>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-title">Bed Occupancy</span>
            <div class="stat-icon" style="background: var(--amber-light); color: var(--amber);">🛏️</div>
          </div>
          <div class="stat-value">${beds.occupancy_rate}%</div>
          <div class="stat-subtitle">
            <span class="stat-trend neutral">${beds.occupied}/${beds.total} Beds</span>
            <span>${beds.available || 0} beds available now</span>
          </div>
          <!-- Progress Bar -->
          <div style="margin-top: 1rem; height: 8px; background: var(--slate-100); border-radius: 9999px; overflow: hidden;">
            <div style="width: ${beds.occupancy_rate}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #d97706); border-radius: 9999px;"></div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-title">Today's Visits</span>
            <div class="stat-icon" style="background: var(--indigo-light); color: var(--indigo);">📅</div>
          </div>
          <div class="stat-value">${apts.total}</div>
          <div class="stat-subtitle">
            <span class="stat-trend up">✓ Triage</span>
            <span><strong>${apts.completed}</strong> completed visits</span>
          </div>
          <!-- ECG Pulse Wave -->
          <div style="margin-top: 1rem;">
            <svg viewBox="0 0 100 24" style="width: 100%; height: 24px; stroke: var(--indigo); fill: none; stroke-width: 2.2; stroke-linecap: round;">
              <path d="M 0,12 L 25,12 L 30,2 L 35,22 L 40,8 L 45,15 L 50,12 L 100,12" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Two-column Section: Visual Clinical Flow & Doctor Roster -->
      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
        
        <!-- Today's Appointments with HealthTech Design -->
        <div class="content-card" style="margin-bottom: 0;">
          <div class="card-header">
            <div>
              <h2>Today's Clinical Visits (${todayAppointments.length})</h2>
              <span style="font-size: 0.775rem; color: var(--slate-400);">Real-time appointment queue & consult status</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="App.navigate('appointments')">View Schedule</button>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Time Slot</th>
                  <th>Patient</th>
                  <th>Attending Physician</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                ${todayAppointments.length === 0 ? `
                  <tr><td colspan="6" style="text-align: center; color: var(--slate-400); padding: 3rem;">No appointments scheduled for today</td></tr>
                ` : todayAppointments.map(apt => `
                  <tr>
                    <td>
                      <div style="font-weight: 700; color: var(--slate-900); font-size: 0.85rem;">${apt.time_slot}</div>
                    </td>
                    <td>
                      <div style="font-weight: 700; color: var(--slate-900);">${apt.patient_name}</div>
                      <div style="font-size: 0.725rem; color: var(--slate-400);">${apt.id}</div>
                    </td>
                    <td>
                      <div style="font-weight: 600; color: var(--slate-800);">${apt.doctor_name}</div>
                    </td>
                    <td>
                      <span class="badge badge-neutral">${apt.department_name || 'General'}</span>
                    </td>
                    <td>
                      <span class="badge ${
                        apt.status === 'completed' ? 'badge-success' :
                        apt.status === 'in_progress' ? 'badge-warning' :
                        apt.status === 'confirmed' ? 'badge-info' : 'badge-neutral'
                      }">${apt.status}</span>
                    </td>
                    <td>
                      <button class="btn btn-secondary btn-sm" onclick="App.navigate('appointments')">Manage</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Specialists On-Duty Widget -->
        <div class="content-card" style="margin-bottom: 0;">
          <div class="card-header">
            <div>
              <h2>Active Specialists</h2>
              <span style="font-size: 0.775rem; color: var(--slate-400);">Clinical department coverage</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="App.navigate('doctors')">All Doctors</button>
          </div>
          <div class="card-body" style="padding: 1.25rem; max-height: 420px; overflow-y: auto;">
            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${doctors.map(d => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; border-radius: var(--radius-md); background: #fafbfc; border: 1px solid var(--slate-100); transition: var(--transition);">
                  <div style="display: flex; align-items: center; gap: 0.85rem;">
                    <div style="width: 42px; height: 42px; border-radius: var(--radius-full); background: var(--primary-light); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem; box-shadow: 0 2px 8px rgba(2, 132, 199, 0.15);">
                      ${d.name.split(' ')[1] ? d.name.split(' ')[1][0] : 'D'}
                    </div>
                    <div>
                      <div style="font-size: 0.875rem; font-weight: 800; color: var(--slate-900);">${d.name}</div>
                      <div style="font-size: 0.75rem; color: var(--slate-500);">${d.specialization}</div>
                    </div>
                  </div>
                  <div>
                    <span class="badge ${
                      d.availability_status === 'available' ? 'badge-success' :
                      d.availability_status === 'in_consultation' ? 'badge-warning' : 'badge-neutral'
                    }">${d.availability_status.replace('_', ' ')}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

      </div>

      <!-- Financial & Clinical Activity Row -->
      ${api.user.role === 'admin' ? `
        <div class="content-card">
          <div class="card-header">
            <div>
              <h2>System Security & Operational Audit Activity</h2>
              <span style="font-size: 0.775rem; color: var(--slate-400);">Immutable operational telemetry</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="App.navigate('admin')">Full Audit Log</button>
          </div>
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Authorized User</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Operational Details</th>
                </tr>
              </thead>
              <tbody>
                ${(overview.recent_activity || []).map(log => `
                  <tr>
                    <td style="color: var(--slate-400); font-size: 0.775rem;">${log.created_at}</td>
                    <td>
                      <strong>${log.user_name || 'System'}</strong> 
                      <span style="font-size: 0.7rem; color: var(--slate-400);">(${log.user_role})</span>
                    </td>
                    <td><code>${log.action}</code></td>
                    <td><span class="badge badge-neutral">${log.module}</span></td>
                    <td style="color: var(--slate-700); font-size: 0.825rem;">${log.details}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}
    `;
  }
};

window.DashboardView = DashboardView;
