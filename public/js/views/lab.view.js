/**
 * Laboratory & Pathology Diagnostic View
 */
const LabView = {
  currentTab: 'orders',
  ordersList: [],
  testsList: [],

  async render() {
    try {
      const [testsRes, ordersRes] = await Promise.all([
        api.lab.getAllTests(),
        api.lab.getAllOrders()
      ]);
      this.testsList = testsRes.data || [];
      this.ordersList = ordersRes.data || [];
    } catch (err) {
      console.error('Failed to load lab data:', err);
    }

    const totalOrders = this.ordersList.length;
    const completedOrders = this.ordersList.filter(o => o.status === 'completed').length;
    const pendingOrders = totalOrders - completedOrders;
    const totalTests = this.testsList.length;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--slate-900); letter-spacing: -0.02em;">Diagnostic Laboratory & Pathology</h2>
          <p style="font-size: 0.875rem; color: var(--slate-500);">Diagnostic panels, specimen tracking, biometric assays, and pathology reports</p>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          ${['admin', 'doctor', 'staff'].includes(api.user.role) ? `
            <button class="btn btn-primary" onclick="LabView.openOrderModal()">
              <span>🧪 Order Lab Test</span>
            </button>
          ` : ''}
          ${api.user.role === 'admin' ? `
            <button class="btn btn-secondary" onclick="LabView.openCreateTestModal()">
              <span>➕ Add Test to Catalog</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Laboratory Metric Cards -->
      <div class="grid-cards" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-title">Total Orders</span>
            <div class="stat-icon" style="background: #e0f2fe; color: #0284c7;">🔬</div>
          </div>
          <div class="stat-value">${totalOrders}</div>
          <div class="stat-subtitle">All-time laboratory orders</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-title">Pending / In Analysis</span>
            <div class="stat-icon" style="background: #fef3c7; color: #d97706;">⏳</div>
          </div>
          <div class="stat-value">${pendingOrders}</div>
          <div class="stat-subtitle">Specimens undergoing diagnostics</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-title">Completed Reports</span>
            <div class="stat-icon" style="background: #d1fae5; color: #059669;">✓</div>
          </div>
          <div class="stat-value">${completedOrders}</div>
          <div class="stat-subtitle">Clinical results validated</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-title">Diagnostic Catalog</span>
            <div class="stat-icon" style="background: #f3e8ff; color: #7c3aed;">📋</div>
          </div>
          <div class="stat-value">${totalTests}</div>
          <div class="stat-subtitle">Active diagnostic assays</div>
        </div>
      </div>

      <!-- Tab Switcher -->
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
        <button id="tab-btn-orders" class="btn ${this.currentTab === 'orders' ? 'btn-primary' : 'btn-secondary'}" style="border-radius: 9999px; padding: 0.4rem 1rem; font-size: 0.825rem;" onclick="LabView.switchTab('orders')">
          Lab Orders & Diagnostic Results (${totalOrders})
        </button>
        <button id="tab-btn-catalog" class="btn ${this.currentTab === 'catalog' ? 'btn-primary' : 'btn-secondary'}" style="border-radius: 9999px; padding: 0.4rem 1rem; font-size: 0.825rem;" onclick="LabView.switchTab('catalog')">
          Diagnostic Catalog Formulary (${totalTests})
        </button>
      </div>

      <div id="lab-tab-content">
        ${this.currentTab === 'orders' ? this.renderOrdersTable() : this.renderCatalogGrid()}
      </div>
    `;
  },

  switchTab(tab) {
    this.currentTab = tab;
    const content = document.getElementById('lab-tab-content');
    const btnOrders = document.getElementById('tab-btn-orders');
    const btnCatalog = document.getElementById('tab-btn-catalog');

    if (btnOrders && btnCatalog) {
      btnOrders.className = `btn ${tab === 'orders' ? 'btn-primary' : 'btn-secondary'}`;
      btnCatalog.className = `btn ${tab === 'catalog' ? 'btn-primary' : 'btn-secondary'}`;
    }

    if (content) {
      content.innerHTML = tab === 'orders' ? this.renderOrdersTable() : this.renderCatalogGrid();
    }
  },

  renderOrdersTable() {
    if (!this.ordersList || this.ordersList.length === 0) {
      return `
        <div class="content-card" style="padding: 3rem; text-align: center; color: var(--slate-400);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🧪</div>
          <div style="font-weight: 700; color: var(--slate-700);">No laboratory orders recorded</div>
          <p style="font-size: 0.85rem; margin-top: 0.25rem;">Physicians and nurses can order blood panels, ECG, or imaging tests</p>
        </div>
      `;
    }

    return `
      <div class="content-card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Patient</th>
                <th>Diagnostic Test</th>
                <th>Prescribing Doctor</th>
                <th>Ordered At</th>
                <th>Status</th>
                <th>Result Findings</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.ordersList.map(order => {
                let badgeClass = 'badge-warning';
                let statusLabel = 'Ordered';
                if (order.status === 'sample_collected') {
                  badgeClass = 'badge-info';
                  statusLabel = 'Sample Collected';
                } else if (order.status === 'in_analysis') {
                  badgeClass = 'badge-purple';
                  statusLabel = 'In Analysis';
                } else if (order.status === 'completed') {
                  badgeClass = 'badge-success';
                  statusLabel = 'Completed';
                }

                return `
                  <tr>
                    <td><strong>${order.id}</strong></td>
                    <td>
                      <div style="font-weight: 700; color: var(--slate-800);">${order.patient_name}</div>
                      <div style="font-size: 0.75rem; color: var(--slate-400);">ID: ${order.patient_id}</div>
                    </td>
                    <td>
                      <div style="font-weight: 600; color: var(--primary);">${order.test_name}</div>
                      <div style="font-size: 0.75rem; color: var(--slate-500);">${order.test_id}</div>
                    </td>
                    <td>${order.doctor_name || 'Staff Triage'}</td>
                    <td>${order.ordered_at ? order.ordered_at.split(' ')[0] : '—'}</td>
                    <td>
                      <span class="badge ${badgeClass}">${statusLabel}</span>
                    </td>
                    <td style="max-width: 220px;">
                      ${order.result_value ? `
                        <div style="font-size: 0.825rem; font-weight: 600; color: var(--slate-800); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${order.result_value}">
                          ${order.result_value}
                        </div>
                      ` : `
                        <span style="font-size: 0.775rem; color: var(--slate-400); font-style: italic;">Awaiting laboratory results</span>
                      `}
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.4rem;">
                        <button class="btn btn-secondary btn-sm" onclick="LabView.viewOrderDetails('${order.id}')" title="View Diagnostic Details">
                          👁️ View
                        </button>
                        ${['admin', 'doctor', 'staff'].includes(api.user.role) ? `
                          <button class="btn btn-secondary btn-sm" onclick="LabView.openUpdateStatusModal('${order.id}')" title="Update Status & Enter Result">
                            ✏️ Update
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderCatalogGrid() {
    if (!this.testsList || this.testsList.length === 0) {
      return `
        <div class="content-card" style="padding: 3rem; text-align: center; color: var(--slate-400);">
          <p>No catalog tests found.</p>
        </div>
      `;
    }

    return `
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
        ${this.testsList.map(test => `
          <div class="content-card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                <span class="badge badge-info">${test.category}</span>
                <span style="font-weight: 800; color: var(--primary); font-size: 1.1rem;">$${Number(test.price).toFixed(2)}</span>
              </div>
              <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--slate-900); margin-bottom: 0.25rem;">${test.name}</h3>
              <div style="font-size: 0.775rem; color: var(--slate-400); margin-bottom: 0.75rem;">Code: <strong>${test.code}</strong> • Specimen: <strong>${test.sample_type || 'Blood'}</strong></div>
              
              <div style="background: var(--slate-50); border-radius: var(--radius-sm); padding: 0.6rem 0.75rem; font-size: 0.8rem; border: 1px solid var(--border-color); margin-bottom: 1rem;">
                <div style="font-weight: 700; color: var(--slate-600); margin-bottom: 0.2rem; font-size: 0.725rem; text-transform: uppercase; letter-spacing: 0.05em;">Reference Normal Range</div>
                <div style="color: var(--slate-700);">${test.normal_range || 'Standard diagnostic thresholds'}</div>
              </div>
            </div>

            <div style="border-top: 1px solid var(--border-color); padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.75rem; color: var(--slate-400);">Hospital Diagnostic Formulary</span>
              ${['admin', 'doctor', 'staff'].includes(api.user.role) ? `
                <button class="btn btn-secondary btn-sm" onclick="LabView.openOrderModal('${test.id}')">
                  <span>Order Test</span>
                </button>
              ` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  viewOrderDetails(orderId) {
    const order = this.ordersList.find(o => o.id === orderId);
    if (!order) return;

    App.showDynamicModal(`
      <div class="modal-header">
        <h3>Diagnostic Report: ${order.id}</h3>
        <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="border: 2px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--primary-light); padding-bottom: 0.75rem; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary);">METROPOLITAN GENERAL HOSPITAL</div>
              <div style="font-size: 0.75rem; color: var(--slate-500);">CLINICAL PATHOLOGY & LABORATORY MEDICINE</div>
            </div>
            <div style="text-align: right;">
              <span class="badge ${order.status === 'completed' ? 'badge-success' : 'badge-warning'}" style="font-size: 0.85rem; padding: 0.35rem 0.75rem;">
                ${order.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div class="form-grid" style="margin-bottom: 1.25rem;">
            <div>
              <div style="font-size: 0.75rem; color: var(--slate-400); text-transform: uppercase; font-weight: 700;">Patient</div>
              <div style="font-size: 0.95rem; font-weight: 700; color: var(--slate-900);">${order.patient_name}</div>
              <div style="font-size: 0.8rem; color: var(--slate-500);">ID: ${order.patient_id}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--slate-400); text-transform: uppercase; font-weight: 700;">Diagnostic Assay</div>
              <div style="font-size: 0.95rem; font-weight: 700; color: var(--slate-900);">${order.test_name}</div>
              <div style="font-size: 0.8rem; color: var(--slate-500);">Order Ref: ${order.id}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--slate-400); text-transform: uppercase; font-weight: 700;">Requesting Physician</div>
              <div style="font-size: 0.9rem; font-weight: 600; color: var(--slate-800);">${order.doctor_name || 'Staff Triage'}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--slate-400); text-transform: uppercase; font-weight: 700;">Date Ordered / Completed</div>
              <div style="font-size: 0.9rem; font-weight: 600; color: var(--slate-800);">${order.ordered_at} ${order.completed_at ? `/ ${order.completed_at}` : ''}</div>
            </div>
          </div>

          <div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <div style="font-size: 0.75rem; color: var(--slate-400); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Diagnostic Findings / Results</div>
            <div style="background: var(--slate-50); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 1rem; font-family: monospace; font-size: 0.9rem; color: var(--slate-800); min-height: 60px;">
              ${order.result_value || 'Sample under examination. Result pending laboratory verification.'}
            </div>
          </div>

          <div style="margin-top: 1rem;">
            <div style="font-size: 0.75rem; color: var(--slate-400); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Normal Reference Range</div>
            <div style="font-size: 0.85rem; color: var(--slate-600);">${order.normal_range || 'Standard reference parameters apply.'}</div>
          </div>

          ${order.notes ? `
            <div style="margin-top: 1rem;">
              <div style="font-size: 0.75rem; color: var(--slate-400); text-transform: uppercase; font-weight: 700; margin-bottom: 0.35rem;">Clinical Notes</div>
              <div style="font-size: 0.85rem; color: var(--slate-600);">${order.notes}</div>
            </div>
          ` : ''}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeActiveModal()">Close</button>
        ${['admin', 'doctor', 'staff'].includes(api.user.role) ? `
          <button class="btn btn-primary" onclick="App.closeActiveModal(); LabView.openUpdateStatusModal('${order.id}')">
            Update Result
          </button>
        ` : ''}
      </div>
    `);
  },

  async openOrderModal(preselectedTestId = null) {
    try {
      const [patRes, testsRes, docRes] = await Promise.all([
        api.patients.getAll(),
        api.lab.getAllTests(),
        api.doctors.getAll()
      ]);

      const patients = patRes.data || [];
      const tests = testsRes.data || [];
      const doctors = docRes.data || [];

      App.showDynamicModal(`
        <div class="modal-header">
          <h3>Order Diagnostic Laboratory Test</h3>
          <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
        </div>
        <form onsubmit="LabView.submitOrder(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Select Patient</label>
              <select id="lab-order-patient" class="form-select" required>
                ${patients.map(p => `<option value="${p.id}">${p.name} (MRN: ${p.id})</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Diagnostic Test / Panel</label>
              <select id="lab-order-test" class="form-select" required>
                ${tests.map(t => `<option value="${t.id}" ${t.id === preselectedTestId ? 'selected' : ''}>${t.name} (${t.code}) - $${t.price}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Prescribing Physician</label>
              <select id="lab-order-doctor" class="form-select">
                <option value="">Hospital Staff Triage</option>
                ${doctors.map(d => `<option value="${d.id}">${d.name} (${d.specialization})</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Clinical Indication & Notes</label>
              <textarea id="lab-order-notes" class="form-textarea" rows="3" placeholder="Reason for lab requisition, clinical symptoms, urgent pre-op check, etc."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Submit Diagnostic Order</button>
          </div>
        </form>
      `);
    } catch (err) {
      showToast(`Error initializing lab requisition: ${err.message}`, 'error');
    }
  },

  async submitOrder(e) {
    e.preventDefault();
    const data = {
      patient_id: document.getElementById('lab-order-patient').value,
      test_id: document.getElementById('lab-order-test').value,
      doctor_id: document.getElementById('lab-order-doctor').value || null,
      notes: document.getElementById('lab-order-notes').value
    };

    try {
      await api.lab.createOrder(data);
      showToast('Diagnostic test order submitted successfully!', 'success');
      App.closeActiveModal();
      App.navigate('lab');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  openUpdateStatusModal(orderId) {
    const order = this.ordersList.find(o => o.id === orderId);
    if (!order) return;

    App.showDynamicModal(`
      <div class="modal-header">
        <h3>Update Diagnostic Order: ${order.id}</h3>
        <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
      </div>
      <form onsubmit="LabView.submitUpdateStatus(event, '${order.id}')">
        <div class="modal-body">
          <div style="background: var(--slate-50); padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.85rem;">
            <strong>Patient:</strong> ${order.patient_name} • <strong>Test:</strong> ${order.test_name}
          </div>

          <div class="form-group">
            <label class="form-label">Order Status</label>
            <select id="lab-update-status" class="form-select" required>
              <option value="ordered" ${order.status === 'ordered' ? 'selected' : ''}>Ordered (Specimen pending collection)</option>
              <option value="sample_collected" ${order.status === 'sample_collected' ? 'selected' : ''}>Sample Collected (In transit to laboratory)</option>
              <option value="in_analysis" ${order.status === 'in_analysis' ? 'selected' : ''}>In Analysis (Biochemical / Microscopic test running)</option>
              <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed (Result verified & signed off)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Diagnostic Result Findings</label>
            <textarea id="lab-update-result" class="form-textarea" rows="3" placeholder="Quantitative values (e.g. WBC: 6.8 K/uL, Glucose: 92 mg/dL) or qualitative interpretation">${order.result_value || ''}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label">Laboratory Tech Notes / Interpretation</label>
            <textarea id="lab-update-notes" class="form-textarea" rows="2" placeholder="Sample quality, calibration details, or flags">${order.notes || ''}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save Diagnostic Status</button>
        </div>
      </form>
    `);
  },

  async submitUpdateStatus(e, orderId) {
    e.preventDefault();
    const data = {
      status: document.getElementById('lab-update-status').value,
      result_value: document.getElementById('lab-update-result').value,
      notes: document.getElementById('lab-update-notes').value
    };

    try {
      await api.lab.updateOrderStatus(orderId, data);
      showToast('Laboratory order status and findings saved!', 'success');
      App.closeActiveModal();
      App.navigate('lab');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  openCreateTestModal() {
    App.showDynamicModal(`
      <div class="modal-header">
        <h3>Add Diagnostic Test to Catalog</h3>
        <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
      </div>
      <form onsubmit="LabView.submitCreateTest(event)">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Test Name</label>
              <input type="text" id="test-name" class="form-input" placeholder="e.g. Troponin I High Sensitivity" required>
            </div>
            <div class="form-group">
              <label class="form-label">Catalog Code</label>
              <input type="text" id="test-code" class="form-input" placeholder="e.g. TROP-I" required>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Category</label>
              <select id="test-category" class="form-select">
                <option value="Biochemistry">Biochemistry</option>
                <option value="Hematology">Hematology</option>
                <option value="Cardiology">Cardiology</option>
                <option value="Endocrine">Endocrine</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Immunology">Immunology</option>
                <option value="Imaging">Imaging / Radiology</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Specimen Type</label>
              <select id="test-sample" class="form-select">
                <option value="Blood">Venous Blood</option>
                <option value="Serum">Serum</option>
                <option value="Plasma">Plasma</option>
                <option value="Urine">Urine</option>
                <option value="Imaging">Imaging / Diagnostic Wave</option>
                <option value="Swab">Swab / Culture</option>
              </select>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Price ($ USD)</label>
              <input type="number" id="test-price" class="form-input" min="0" step="0.01" value="55.00" required>
            </div>
            <div class="form-group">
              <label class="form-label">Reference Normal Range</label>
              <input type="text" id="test-range" class="form-input" placeholder="e.g. < 0.04 ng/mL">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Create Diagnostic Assay</button>
        </div>
      </form>
    `);
  },

  async submitCreateTest(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById('test-name').value,
      code: document.getElementById('test-code').value,
      category: document.getElementById('test-category').value,
      sample_type: document.getElementById('test-sample').value,
      price: parseFloat(document.getElementById('test-price').value),
      normal_range: document.getElementById('test-range').value
    };

    try {
      await api.lab.createTest(data);
      showToast('Diagnostic assay added to hospital formulary!', 'success');
      App.closeActiveModal();
      App.navigate('lab');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

window.LabView = LabView;

