/**
 * Pharmacy & Medication Inventory View
 */
const PharmacyView = {
  currentTab: 'inventory',
  medicinesList: [],
  prescriptionsList: [],
  metrics: {},

  async render() {
    try {
      const [medRes, rxRes, metricsRes] = await Promise.all([
        api.pharmacy.getAllMedicines(),
        api.pharmacy.getAllPrescriptions(),
        api.pharmacy.getMetrics()
      ]);

      this.medicinesList = medRes.data || [];
      this.prescriptionsList = rxRes.data || [];
      this.metrics = metricsRes.data || {};
    } catch (err) {
      console.error('Failed to load pharmacy data:', err);
    }

    const m = this.metrics;

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--slate-900); letter-spacing: -0.02em;">Pharmacy & Medication Formulary</h2>
          <p style="font-size: 0.875rem; color: var(--slate-500);">Inventory stock levels, formulary management, low-stock reorder triggers, and clinical dispensation</p>
        </div>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          ${['admin', 'doctor'].includes(api.user.role) ? `
            <button class="btn btn-primary" onclick="PharmacyView.openCreatePrescriptionModal()">
              <span>📝 Write Prescription</span>
            </button>
          ` : ''}
          ${['admin', 'staff'].includes(api.user.role) ? `
            <button class="btn btn-secondary" onclick="PharmacyView.openAddMedicineModal()">
              <span>➕ Add Medication</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Pharmacy Metric Cards -->
      <div class="grid-cards" style="margin-bottom: 1.5rem;">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-title">Formulary Drugs</span>
            <div class="stat-icon" style="background: #e0f2fe; color: #0284c7;">💊</div>
          </div>
          <div class="stat-value">${m.totalMedicines || this.medicinesList.length}</div>
          <div class="stat-subtitle">${m.inStock || 0} items at normal levels</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-title">Low Stock Alerts</span>
            <div class="stat-icon" style="background: #fef3c7; color: #d97706;">⚠️</div>
          </div>
          <div class="stat-value" style="color: ${m.lowStock > 0 ? 'var(--warning)' : 'inherit'};">${m.lowStock || 0}</div>
          <div class="stat-subtitle">Items at or below reorder threshold</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-title">Out of Stock</span>
            <div class="stat-icon" style="background: #fee2e2; color: #dc2626;">🚫</div>
          </div>
          <div class="stat-value" style="color: ${m.outOfStock > 0 ? 'var(--danger)' : 'inherit'};">${m.outOfStock || 0}</div>
          <div class="stat-subtitle">Depleted inventory requiring order</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-title">Pending Dispensation</span>
            <div class="stat-icon" style="background: #f3e8ff; color: #7c3aed;">📦</div>
          </div>
          <div class="stat-value">${m.pendingPrescriptions || 0}</div>
          <div class="stat-subtitle">Awaiting pharmacist verification</div>
        </div>
      </div>

      <!-- Tab Switcher -->
      <div style="display: flex; gap: 0.5rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
        <button id="pharm-tab-btn-inventory" class="btn ${this.currentTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}" style="border-radius: 9999px; padding: 0.4rem 1rem; font-size: 0.825rem;" onclick="PharmacyView.switchTab('inventory')">
          Medication Formulary Inventory (${this.medicinesList.length})
        </button>
        <button id="pharm-tab-btn-prescriptions" class="btn ${this.currentTab === 'prescriptions' ? 'btn-primary' : 'btn-secondary'}" style="border-radius: 9999px; padding: 0.4rem 1rem; font-size: 0.825rem;" onclick="PharmacyView.switchTab('prescriptions')">
          Prescriptions & Dispensing Queue (${this.prescriptionsList.length})
        </button>
      </div>

      <div id="pharmacy-tab-content">
        ${this.currentTab === 'inventory' ? this.renderInventoryTable() : this.renderPrescriptionsTable()}
      </div>
    `;
  },

  switchTab(tab) {
    this.currentTab = tab;
    const content = document.getElementById('pharmacy-tab-content');
    const btnInv = document.getElementById('pharm-tab-btn-inventory');
    const btnRx = document.getElementById('pharm-tab-btn-prescriptions');

    if (btnInv && btnRx) {
      btnInv.className = `btn ${tab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`;
      btnRx.className = `btn ${tab === 'prescriptions' ? 'btn-primary' : 'btn-secondary'}`;
    }

    if (content) {
      content.innerHTML = tab === 'inventory' ? this.renderInventoryTable() : this.renderPrescriptionsTable();
    }
  },

  renderInventoryTable() {
    if (!this.medicinesList || this.medicinesList.length === 0) {
      return `
        <div class="content-card" style="padding: 3rem; text-align: center; color: var(--slate-400);">
          <p>No medications recorded in the formulary.</p>
        </div>
      `;
    }

    return `
      <div class="content-card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Commercial / Generic Name</th>
                <th>Category</th>
                <th>Dosage Form</th>
                <th>Unit Price</th>
                <th>Stock Quantity</th>
                <th>Reorder Level</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.medicinesList.map(med => {
                let badgeClass = 'badge-success';
                let statusLabel = 'In Stock';
                if (med.status === 'low_stock') {
                  badgeClass = 'badge-warning';
                  statusLabel = 'Low Stock';
                } else if (med.status === 'out_of_stock') {
                  badgeClass = 'badge-danger';
                  statusLabel = 'Out of Stock';
                }

                return `
                  <tr>
                    <td>
                      <div style="font-weight: 700; color: var(--slate-800);">${med.name}</div>
                      <div style="font-size: 0.75rem; color: var(--slate-500);">${med.generic_name || '—'}</div>
                    </td>
                    <td>
                      <span class="badge badge-info">${med.category}</span>
                    </td>
                    <td>${med.dosage_form}</td>
                    <td><strong>$${Number(med.unit_price).toFixed(2)}</strong></td>
                    <td>
                      <span style="font-weight: 800; font-size: 1rem; color: ${med.stock_quantity <= med.reorder_level ? 'var(--danger)' : 'var(--slate-800)'};">
                        ${med.stock_quantity}
                      </span>
                    </td>
                    <td style="color: var(--slate-500);">${med.reorder_level} units</td>
                    <td>
                      <span class="badge ${badgeClass}">${statusLabel}</span>
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.4rem;">
                        ${['admin', 'staff'].includes(api.user.role) ? `
                          <button class="btn btn-secondary btn-sm" onclick="PharmacyView.openAdjustStockModal('${med.id}')" title="Adjust Stock Quantity">
                            📦 Stock
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

  renderPrescriptionsTable() {
    if (!this.prescriptionsList || this.prescriptionsList.length === 0) {
      return `
        <div class="content-card" style="padding: 3rem; text-align: center; color: var(--slate-400);">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📋</div>
          <div style="font-weight: 700; color: var(--slate-700);">No prescriptions on file</div>
          <p style="font-size: 0.85rem; margin-top: 0.25rem;">Physicians can write digital prescriptions linked to patients</p>
        </div>
      `;
    }

    return `
      <div class="content-card">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Rx ID</th>
                <th>Patient</th>
                <th>Prescribing Physician</th>
                <th>Diagnosis</th>
                <th>Prescribed Medication Items</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.prescriptionsList.map(rx => {
                let badgeClass = 'badge-warning';
                let statusLabel = 'Pending';
                if (rx.status === 'dispensed') {
                  badgeClass = 'badge-success';
                  statusLabel = 'Dispensed';
                } else if (rx.status === 'cancelled') {
                  badgeClass = 'badge-secondary';
                  statusLabel = 'Cancelled';
                }

                return `
                  <tr>
                    <td><strong>${rx.id}</strong></td>
                    <td>
                      <div style="font-weight: 700; color: var(--slate-800);">${rx.patient_name}</div>
                      <div style="font-size: 0.75rem; color: var(--slate-400);">ID: ${rx.patient_id}</div>
                    </td>
                    <td>${rx.doctor_name}</td>
                    <td style="max-width: 180px;">
                      <div style="font-size: 0.825rem; color: var(--slate-700); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${rx.diagnosis || ''}">
                        ${rx.diagnosis || 'General prescription'}
                      </div>
                    </td>
                    <td>
                      <div style="font-size: 0.8rem; color: var(--slate-800);">
                        ${(rx.items || []).map(i => `<div>• <strong>${i.medicine_name}</strong> (${i.quantity} qty, ${i.dosage})</div>`).join('')}
                      </div>
                    </td>
                    <td>
                      <span class="badge ${badgeClass}">${statusLabel}</span>
                      ${rx.dispensed_by ? `
                        <div style="font-size: 0.7rem; color: var(--slate-400); margin-top: 0.2rem;">By: ${rx.dispensed_by.split(' ')[0]}</div>
                      ` : ''}
                    </td>
                    <td>
                      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="PharmacyView.viewRxDetails('${rx.id}')" title="View Prescription">
                          👁️ View
                        </button>
                        ${rx.status === 'pending' && ['admin', 'staff'].includes(api.user.role) ? `
                          <button class="btn btn-primary btn-sm" onclick="PharmacyView.dispenseRx('${rx.id}')" title="Dispense & Deduct Stock">
                            ✓ Dispense
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

  viewRxDetails(rxId) {
    const rx = this.prescriptionsList.find(p => p.id === rxId);
    if (!rx) return;

    App.showDynamicModal(`
      <div class="modal-header">
        <h3>Digital Prescription: ${rx.id}</h3>
        <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
      </div>
      <div class="modal-body">
        <div style="border: 2px solid var(--border-color); border-radius: var(--radius-md); padding: 1.5rem; background: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--primary-light); padding-bottom: 0.75rem; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 1.25rem; font-weight: 800; color: var(--primary);">METROPOLITAN HOSPITAL PHARMACY</div>
              <div style="font-size: 0.75rem; color: var(--slate-500);">OFFICIAL CLINICAL PRESCRIPTION ORDER</div>
            </div>
            <div style="text-align: right;">
              <span class="badge ${rx.status === 'dispensed' ? 'badge-success' : 'badge-warning'}" style="font-size: 0.85rem; padding: 0.35rem 0.75rem;">
                ${rx.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div class="form-grid" style="margin-bottom: 1.25rem;">
            <div>
              <div style="font-size: 0.75rem; color: var(--slate-400); text-transform: uppercase; font-weight: 700;">Patient</div>
              <div style="font-size: 0.95rem; font-weight: 700; color: var(--slate-900);">${rx.patient_name}</div>
              <div style="font-size: 0.8rem; color: var(--slate-500);">MRN: ${rx.patient_id}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--slate-400); text-transform: uppercase; font-weight: 700;">Physician</div>
              <div style="font-size: 0.95rem; font-weight: 700; color: var(--slate-900);">${rx.doctor_name}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--slate-400); text-transform: uppercase; font-weight: 700;">Clinical Diagnosis</div>
              <div style="font-size: 0.9rem; font-weight: 600; color: var(--slate-800);">${rx.diagnosis || 'Standard therapy'}</div>
            </div>
            <div>
              <div style="font-size: 0.75rem; color: var(--slate-400); text-transform: uppercase; font-weight: 700;">Issue Date / Dispensed</div>
              <div style="font-size: 0.9rem; font-weight: 600; color: var(--slate-800);">${rx.created_at?.split(' ')[0]} ${rx.dispensed_at ? `(Dispensed: ${rx.dispensed_at})` : ''}</div>
            </div>
          </div>

          <div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <div style="font-size: 0.75rem; color: var(--slate-400); text-transform: uppercase; font-weight: 700; margin-bottom: 0.5rem;">Prescribed Medication(s)</div>
            <table class="data-table" style="font-size: 0.85rem;">
              <thead>
                <tr>
                  <th>Medication</th>
                  <th>Dosage</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                ${(rx.items || []).map(item => `
                  <tr>
                    <td><strong>${item.medicine_name}</strong></td>
                    <td>${item.dosage}</td>
                    <td>${item.frequency}</td>
                    <td>${item.duration_days} days</td>
                    <td><span class="badge badge-info">${item.quantity}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          ${rx.dispensed_by ? `
            <div style="margin-top: 1.25rem; background: var(--slate-50); border-radius: var(--radius-sm); padding: 0.75rem 1rem; font-size: 0.8rem; color: var(--slate-600); border: 1px solid var(--border-color);">
              ✓ Dispensed by <strong>${rx.dispensed_by}</strong> on ${rx.dispensed_at}
            </div>
          ` : ''}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="App.closeActiveModal()">Close</button>
        ${rx.status === 'pending' && ['admin', 'staff'].includes(api.user.role) ? `
          <button class="btn btn-primary" onclick="App.closeActiveModal(); PharmacyView.dispenseRx('${rx.id}')">
            Dispense Medication
          </button>
        ` : ''}
      </div>
    `);
  },

  async dispenseRx(rxId) {
    if (!confirm(`Confirm dispensation of Prescription ${rxId}? Inventory stock will be automatically deducted.`)) {
      return;
    }

    try {
      await api.pharmacy.dispensePrescription(rxId);
      showToast('Prescription dispensed successfully! Inventory updated.', 'success');
      App.navigate('pharmacy');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  openAdjustStockModal(medId) {
    const med = this.medicinesList.find(m => m.id === medId);
    if (!med) return;

    App.showDynamicModal(`
      <div class="modal-header">
        <h3>Adjust Stock: ${med.name}</h3>
        <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
      </div>
      <form onsubmit="PharmacyView.submitAdjustStock(event, '${med.id}')">
        <div class="modal-body">
          <div style="background: var(--slate-50); padding: 0.75rem 1rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.85rem;">
            <strong>Current Stock:</strong> <span style="font-size: 1.1rem; font-weight: 800; color: var(--primary);">${med.stock_quantity} units</span> • <strong>Reorder Level:</strong> ${med.reorder_level} units
          </div>

          <div class="form-group">
            <label class="form-label">Stock Quantity Adjustment (+/-)</label>
            <input type="number" id="adj-amount" class="form-input" placeholder="e.g. +50 for new shipment or -10 for write-off" required>
            <div style="font-size: 0.75rem; color: var(--slate-400); margin-top: 0.25rem;">Positive integer adds to stock; negative number subtracts from stock</div>
          </div>

          <div class="form-group">
            <label class="form-label">Adjustment Reason</label>
            <select id="adj-reason" class="form-select">
              <option value="New Formulary Shipment Received">New Formulary Shipment Received</option>
              <option value="Routine Inventory Audit Reconciliation">Routine Inventory Audit Reconciliation</option>
              <option value="Direct Ward Emergency Supply Transfer">Direct Ward Emergency Supply Transfer</option>
              <option value="Expired / Damaged Batch Disposal">Expired / Damaged Batch Disposal</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Update Stock Level</button>
        </div>
      </form>
    `);
  },

  async submitAdjustStock(e, medId) {
    e.preventDefault();
    const adjustment = parseInt(document.getElementById('adj-amount').value, 10);
    const reason = document.getElementById('adj-reason').value;

    try {
      await api.pharmacy.adjustStock(medId, { adjustment, reason });
      showToast('Medication inventory stock updated!', 'success');
      App.closeActiveModal();
      App.navigate('pharmacy');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  openAddMedicineModal() {
    App.showDynamicModal(`
      <div class="modal-header">
        <h3>Add Medication to Formulary</h3>
        <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
      </div>
      <form onsubmit="PharmacyView.submitAddMedicine(event)">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Commercial Brand Name</label>
              <input type="text" id="med-name" class="form-input" placeholder="e.g. Zithromax 250mg" required>
            </div>
            <div class="form-group">
              <label class="form-label">Generic / Active Chemical</label>
              <input type="text" id="med-generic" class="form-input" placeholder="e.g. Azithromycin" required>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Therapeutic Category</label>
              <select id="med-category" class="form-select">
                <option value="Cardiovascular">Cardiovascular</option>
                <option value="Antibiotics">Antibiotics</option>
                <option value="Analgesics">Analgesics & Pain Relief</option>
                <option value="Endocrine">Endocrine & Diabetes</option>
                <option value="Gastrointestinal">Gastrointestinal</option>
                <option value="Respiratory">Respiratory</option>
                <option value="General">General Care</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Dosage Form</label>
              <select id="med-form" class="form-select">
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup / Liquid">Syrup / Liquid</option>
                <option value="IV Injection">IV Injection</option>
                <option value="Ointment">Ointment / Cream</option>
                <option value="Inhaler">Inhaler</option>
              </select>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Unit Price ($ USD)</label>
              <input type="number" id="med-price" class="form-input" min="0" step="0.01" value="1.50" required>
            </div>
            <div class="form-group">
              <label class="form-label">Initial Stock Quantity</label>
              <input type="number" id="med-stock" class="form-input" min="0" value="200" required>
            </div>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Reorder Level Threshold</label>
              <input type="number" id="med-reorder" class="form-input" min="5" value="30" required>
            </div>
            <div class="form-group">
              <label class="form-label">Expiry Date</label>
              <input type="date" id="med-expiry" class="form-input" value="2028-12-31">
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Add to Formulary</button>
        </div>
      </form>
    `);
  },

  async submitAddMedicine(e) {
    e.preventDefault();
    const data = {
      name: document.getElementById('med-name').value,
      generic_name: document.getElementById('med-generic').value,
      category: document.getElementById('med-category').value,
      dosage_form: document.getElementById('med-form').value,
      unit_price: parseFloat(document.getElementById('med-price').value),
      stock_quantity: parseInt(document.getElementById('med-stock').value, 10),
      reorder_level: parseInt(document.getElementById('med-reorder').value, 10),
      expiry_date: document.getElementById('med-expiry').value
    };

    try {
      await api.pharmacy.createMedicine(data);
      showToast('Medication registered into formulary!', 'success');
      App.closeActiveModal();
      App.navigate('pharmacy');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async openCreatePrescriptionModal() {
    try {
      const [patRes, medRes] = await Promise.all([
        api.patients.getAll(),
        api.pharmacy.getAllMedicines()
      ]);

      const patients = patRes.data || [];
      const medicines = medRes.data || [];

      App.showDynamicModal(`
        <div class="modal-header">
          <h3>Write Digital Prescription</h3>
          <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
        </div>
        <form onsubmit="PharmacyView.submitCreatePrescription(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Select Patient</label>
              <select id="rx-patient" class="form-select" required>
                ${patients.map(p => `<option value="${p.id}">${p.name} (MRN: ${p.id})</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Diagnosis & Indication</label>
              <input type="text" id="rx-diagnosis" class="form-input" placeholder="e.g. Acute bronchitis, Hypertension stage 1" required>
            </div>

            <div style="border-top: 1px solid var(--border-color); padding-top: 1rem; margin-top: 1rem;">
              <div style="font-weight: 700; font-size: 0.9rem; color: var(--slate-800); margin-bottom: 0.5rem;">Medication Item</div>
              <div class="form-group">
                <label class="form-label">Drug Selection</label>
                <select id="rx-med-id" class="form-select" required>
                  ${medicines.map(m => `<option value="${m.id}">${m.name} (${m.category}) - Stock: ${m.stock_quantity}</option>`).join('')}
                </select>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Dosage Instructions</label>
                  <input type="text" id="rx-dosage" class="form-input" value="1 tablet" placeholder="e.g. 500mg" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Frequency</label>
                  <select id="rx-freq" class="form-select">
                    <option value="Once daily in morning">Once daily in morning</option>
                    <option value="Twice daily with meals">Twice daily with meals</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Every 6 hours as needed">Every 6 hours as needed</option>
                    <option value="At bedtime">At bedtime</option>
                  </select>
                </div>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Duration (Days)</label>
                  <input type="number" id="rx-duration" class="form-input" min="1" max="90" value="14" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Total Dispense Quantity</label>
                  <input type="number" id="rx-quantity" class="form-input" min="1" max="180" value="14" required>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Sign & Issue Prescription</button>
          </div>
        </form>
      `);
    } catch (err) {
      showToast(`Error initializing prescription: ${err.message}`, 'error');
    }
  },

  async submitCreatePrescription(e) {
    e.preventDefault();
    const data = {
      patient_id: document.getElementById('rx-patient').value,
      diagnosis: document.getElementById('rx-diagnosis').value,
      items: [
        {
          medicine_id: document.getElementById('rx-med-id').value,
          dosage: document.getElementById('rx-dosage').value,
          frequency: document.getElementById('rx-freq').value,
          duration_days: parseInt(document.getElementById('rx-duration').value, 10),
          quantity: parseInt(document.getElementById('rx-quantity').value, 10)
        }
      ]
    };

    try {
      await api.pharmacy.createPrescription(data);
      showToast('Digital prescription written and queued for pharmacy!', 'success');
      App.closeActiveModal();
      App.navigate('pharmacy');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

window.PharmacyView = PharmacyView;

