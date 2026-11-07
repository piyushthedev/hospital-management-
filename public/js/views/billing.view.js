/**
 * Billing & Claims View
 * Comprehensive patient accounts, insurance claims, itemized invoices, and collections
 */
const BillingView = {
  activeTab: 'accounts', // 'accounts' | 'invoices'
  accountsList: [],
  invoicesList: [],

  async render() {
    let invoices = [];
    let accounts = [];
    let summary = { financials: {}, counts: {} };

    try {
      const [invRes, accRes] = await Promise.all([
        api.billing.getAllInvoices(),
        api.billing.getPatientAccounts()
      ]);

      invoices = invRes.data || [];
      accounts = accRes.data || [];
      this.invoicesList = invoices;
      this.accountsList = accounts;

      if (['admin', 'accountant'].includes(api.user.role)) {
        const sumRes = await api.billing.getSummary();
        summary = sumRes.data || summary;
      }
    } catch (err) {
      console.error('Failed to load billing:', err);
    }

    const fin = summary.financials || {};

    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--slate-900); letter-spacing: -0.02em;">Hospital Billing & Insurance Claims</h2>
          <p style="font-size: 0.875rem; color: var(--slate-500);">Live patient billing accounts, insurance claim verifications, clinical invoices, and cleared collections</p>
        </div>
        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          ${['admin', 'accountant', 'staff'].includes(api.user.role) ? `
            <button class="btn btn-secondary" onclick="App.openModal('registerPatientModal')">
              <span>➕ Register Patient</span>
            </button>
            <button class="btn btn-primary" onclick="BillingView.openCreateInvoiceModal()">
              <span>📑 Generate Invoice</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Financial Metric Cards -->
      ${['admin', 'accountant'].includes(api.user.role) ? `
        <div class="grid-cards" style="margin-bottom: 1.5rem;">
          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-title">Total Invoiced</span>
              <div class="stat-icon" style="background: #e0f2fe; color: #0284c7;">📑</div>
            </div>
            <div class="stat-value">$${Number(fin.total_invoiced || 0).toLocaleString()}</div>
            <div class="stat-subtitle">${summary.counts?.total_invoices || 0} hospital invoices generated</div>
          </div>

          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-title">Total Collected</span>
              <div class="stat-icon" style="background: #d1fae5; color: #059669;">💰</div>
            </div>
            <div class="stat-value">$${Number(fin.total_collected || 0).toLocaleString()}</div>
            <div class="stat-subtitle">Cleared hospital revenue</div>
          </div>

          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-title">Outstanding Claims / Balances</span>
              <div class="stat-icon" style="background: #fee2e2; color: #dc2626;">⏳</div>
            </div>
            <div class="stat-value">$${Number(fin.total_outstanding || 0).toLocaleString()}</div>
            <div class="stat-subtitle">Pending patient co-pays & insurer claims</div>
          </div>

          <div class="stat-card">
            <div class="stat-card-header">
              <span class="stat-title">Today's Collections</span>
              <div class="stat-icon" style="background: #fef3c7; color: #d97706;">⚡</div>
            </div>
            <div class="stat-value">$${Number(fin.today_collections || 0).toLocaleString()}</div>
            <div class="stat-subtitle">${summary.counts?.today_transactions || 0} transactions cleared today</div>
          </div>
        </div>
      ` : ''}

      <!-- Tab Navigation -->
      <div style="display: flex; gap: 0.5rem; border-bottom: 2px solid var(--border-color); margin-bottom: 1.25rem;">
        <button id="tab-btn-accounts" class="btn ${this.activeTab === 'accounts' ? 'btn-primary' : 'btn-secondary'}" 
          style="border-radius: 8px 8px 0 0; border-bottom: none; font-weight: 700; padding: 0.65rem 1.25rem;"
          onclick="BillingView.switchTab('accounts')">
          🏥 Patient Accounts & Claims Ledger <span style="background: rgba(0,0,0,0.12); padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 6px;">${accounts.length}</span>
        </button>
        <button id="tab-btn-invoices" class="btn ${this.activeTab === 'invoices' ? 'btn-primary' : 'btn-secondary'}" 
          style="border-radius: 8px 8px 0 0; border-bottom: none; font-weight: 700; padding: 0.65rem 1.25rem;"
          onclick="BillingView.switchTab('invoices')">
          📑 Itemized Invoices & Receipts <span style="background: rgba(0,0,0,0.12); padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; margin-left: 6px;">${invoices.length}</span>
        </button>
      </div>

      <!-- Tab 1: Patient Accounts & Claims Ledger -->
      <div id="billing-tab-accounts" style="display: ${this.activeTab === 'accounts' ? 'block' : 'none'};">
        <div class="filter-bar">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input type="text" id="accounts-search-input" class="search-input" 
              placeholder="Search by Patient name, MRN, phone, insurance provider, policy #..." 
              oninput="BillingView.handleAccountsFilter()">
          </div>
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <select id="accounts-insurance-filter" class="select-filter" onchange="BillingView.handleAccountsFilter()">
              <option value="">All Insurance Types</option>
              <option value="insured">Insured Patients (With Claim ID)</option>
              <option value="self_pay">Self-Pay Accounts</option>
            </select>
            <select id="accounts-status-filter" class="select-filter" onchange="BillingView.handleAccountsFilter()">
              <option value="">All Balances</option>
              <option value="due">With Balance / Claim Due</option>
              <option value="cleared">Fully Cleared / Settled</option>
            </select>
          </div>
        </div>

        <div class="content-card">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>MRN / ID</th>
                  <th>Patient Name & Demographics</th>
                  <th>Insurance & Claim Policy</th>
                  <th>Total Invoiced</th>
                  <th>Cleared Collections</th>
                  <th>Outstanding Due</th>
                  <th>Claim / Account Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="accounts-table-body">
                ${this.renderAccountRows(accounts)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tab 2: Itemized Invoices & Receipts -->
      <div id="billing-tab-invoices" style="display: ${this.activeTab === 'invoices' ? 'block' : 'none'};">
        <div class="filter-bar">
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input type="text" id="billing-search-input" class="search-input" 
              placeholder="Search by Invoice # or Patient name..." 
              oninput="BillingView.handleInvoicesFilter()">
          </div>
          <div style="display: flex; gap: 0.5rem;">
            <select id="billing-status-filter" class="select-filter" onchange="BillingView.handleInvoicesFilter()">
              <option value="">All Invoice Statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid (Cleared)</option>
            </select>
          </div>
        </div>

        <div class="content-card">
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Issue Date</th>
                  <th>Patient Name</th>
                  <th>Subtotal</th>
                  <th>Tax / Discount</th>
                  <th>Total Amount</th>
                  <th>Paid Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody id="invoices-table-body">
                ${this.renderInvoiceRows(invoices)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  switchTab(tab) {
    this.activeTab = tab;
    const tabAccounts = document.getElementById('billing-tab-accounts');
    const tabInvoices = document.getElementById('billing-tab-invoices');
    const btnAccounts = document.getElementById('tab-btn-accounts');
    const btnInvoices = document.getElementById('tab-btn-invoices');

    if (tab === 'accounts') {
      if (tabAccounts) tabAccounts.style.display = 'block';
      if (tabInvoices) tabInvoices.style.display = 'none';
      if (btnAccounts) { btnAccounts.className = 'btn btn-primary'; }
      if (btnInvoices) { btnInvoices.className = 'btn btn-secondary'; }
    } else {
      if (tabAccounts) tabAccounts.style.display = 'none';
      if (tabInvoices) tabInvoices.style.display = 'block';
      if (btnAccounts) { btnAccounts.className = 'btn btn-secondary'; }
      if (btnInvoices) { btnInvoices.className = 'btn btn-primary'; }
    }
  },

  viewPatientInvoices(patientName, patientId) {
    this.switchTab('invoices');
    const searchInput = document.getElementById('billing-search-input');
    if (searchInput) {
      searchInput.value = patientName || patientId;
      this.handleInvoicesFilter();
    }
  },

  renderAccountRows(list) {
    if (!list || list.length === 0) {
      return `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching patient billing accounts found</td></tr>`;
    }

    return list.map(acc => {
      const isInsured = !!(acc.insurance_provider && acc.insurance_provider.trim());
      const hasBalance = acc.total_due > 0.01;
      
      const statusBadge = isInsured
        ? (hasBalance 
            ? `<span class="badge badge-warning" style="display: inline-flex; align-items: center; gap: 4px;">🛡️ Claim Pending</span>`
            : `<span class="badge badge-success" style="display: inline-flex; align-items: center; gap: 4px;">✅ Claim Settled</span>`)
        : (hasBalance
            ? `<span class="badge badge-danger">Due: $${acc.total_due.toFixed(2)}</span>`
            : `<span class="badge badge-success">Zero Balance</span>`);

      return `
        <tr>
          <td style="font-weight: 700; color: var(--primary);">${acc.patient_id}</td>
          <td>
            <div style="font-weight: 700; color: var(--slate-900); font-size: 0.95rem;">${acc.patient_name}</div>
            <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 2px;">
              📞 ${acc.phone} ${acc.email ? `• ✉️ ${acc.email}` : ''}
            </div>
            <div style="font-size: 0.725rem; color: var(--text-muted);">
              ${acc.gender || ''} ${acc.blood_group ? `• Blood: <strong>${acc.blood_group}</strong>` : ''} • Reg: ${acc.registered_at ? acc.registered_at.substring(0, 10) : 'Recent'}
            </div>
          </td>
          <td>
            ${isInsured ? `
              <div style="display: flex; align-items: center; gap: 0.35rem;">
                <span style="font-size: 1rem;">🛡️</span>
                <strong style="color: var(--secondary); font-size: 0.875rem;">${acc.insurance_provider}</strong>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">
                Policy: <strong style="color: var(--primary);">${acc.insurance_policy_number || 'Claim on File'}</strong>
              </div>
            ` : `
              <span class="badge badge-neutral" style="font-size: 0.75rem;">Self-Pay Account</span>
            `}
          </td>
          <td style="font-weight: 700; color: var(--slate-800);">$${Number(acc.total_invoiced || 0).toFixed(2)}</td>
          <td style="font-weight: 600; color: var(--accent);">$${Number(acc.total_paid || 0).toFixed(2)}</td>
          <td>
            <div style="font-weight: 700; color: ${hasBalance ? 'var(--danger)' : 'var(--accent)'}; font-size: 0.95rem;">
              $${Number(acc.total_due || 0).toFixed(2)}
            </div>
            <div style="font-size: 0.725rem; color: var(--text-muted);">
              ${acc.invoice_count} invoice${acc.invoice_count === 1 ? '' : 's'} on record
            </div>
          </td>
          <td>${statusBadge}</td>
          <td>
            <div style="display: flex; gap: 0.35rem; flex-wrap: wrap;">
              ${['admin', 'accountant', 'staff'].includes(api.user.role) ? `
                <button class="btn btn-secondary btn-sm" onclick="BillingView.openCreateInvoiceModal('${acc.patient_id}')" title="Generate New Invoice for Patient">
                  ➕ Bill
                </button>
              ` : ''}
              <button class="btn btn-primary btn-sm" onclick="BillingView.viewPatientInvoices('${acc.patient_name}', '${acc.patient_id}')" title="View Invoices for this Patient">
                📑 Invoices (${acc.invoice_count})
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderInvoiceRows(list) {
    if (!list || list.length === 0) {
      return `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">No matching invoices found</td></tr>`;
    }

    return list.map(inv => {
      const balance = (inv.total_amount - inv.paid_amount).toFixed(2);
      return `
        <tr>
          <td style="font-weight: 700; color: var(--primary);">${inv.id}</td>
          <td>${inv.issue_date}</td>
          <td>
            <div style="font-weight: 600; color: var(--slate-900);">${inv.patient_name}</div>
            <div style="font-size: 0.725rem; color: var(--text-muted);">${inv.patient_id}</div>
          </td>
          <td>$${inv.subtotal.toFixed(2)}</td>
          <td style="font-size: 0.775rem; color: var(--text-muted);">
            +$${inv.tax_amount.toFixed(2)} tax / -$${inv.discount_amount.toFixed(2)} disc
          </td>
          <td style="font-weight: 700; color: var(--secondary);">$${inv.total_amount.toFixed(2)}</td>
          <td>
            <div style="font-weight: 600; color: ${inv.status === 'paid' ? 'var(--accent)' : 'var(--text-main)'};">
              $${inv.paid_amount.toFixed(2)}
            </div>
            ${inv.status !== 'paid' ? `
              <div style="font-size: 0.7rem; color: var(--danger);">Due: $${balance}</div>
            ` : ''}
          </td>
          <td>
            <span class="badge ${
              inv.status === 'paid' ? 'badge-success' :
              inv.status === 'partially_paid' ? 'badge-warning' : 'badge-danger'
            }">${inv.status.replace('_', ' ')}</span>
          </td>
          <td>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-secondary btn-sm" onclick="BillingView.viewReceipt('${inv.id}')">
                🧾 Receipt
              </button>
              ${inv.status !== 'paid' && ['admin', 'accountant', 'staff'].includes(api.user.role) ? `
                <button class="btn btn-primary btn-sm" onclick="BillingView.openPaymentModal('${inv.id}', '${balance}')">
                  💳 Pay
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  handleAccountsFilter() {
    const search = (document.getElementById('accounts-search-input')?.value || '').toLowerCase();
    const insFilter = document.getElementById('accounts-insurance-filter')?.value || '';
    const statusFilter = document.getElementById('accounts-status-filter')?.value || '';

    const filtered = this.accountsList.filter(acc => {
      const matchSearch = !search ||
        (acc.patient_name && acc.patient_name.toLowerCase().includes(search)) ||
        (acc.patient_id && acc.patient_id.toLowerCase().includes(search)) ||
        (acc.phone && acc.phone.includes(search)) ||
        (acc.email && acc.email.toLowerCase().includes(search)) ||
        (acc.insurance_provider && acc.insurance_provider.toLowerCase().includes(search)) ||
        (acc.insurance_policy_number && acc.insurance_policy_number.toLowerCase().includes(search));

      const isInsured = !!(acc.insurance_provider && acc.insurance_provider.trim());
      const matchIns = !insFilter ||
        (insFilter === 'insured' && isInsured) ||
        (insFilter === 'self_pay' && !isInsured);

      const hasBalance = acc.total_due > 0.01;
      const matchStatus = !statusFilter ||
        (statusFilter === 'due' && hasBalance) ||
        (statusFilter === 'cleared' && !hasBalance);

      return matchSearch && matchIns && matchStatus;
    });

    const tbody = document.getElementById('accounts-table-body');
    if (tbody) tbody.innerHTML = this.renderAccountRows(filtered);
  },

  handleInvoicesFilter() {
    const search = (document.getElementById('billing-search-input')?.value || '').toLowerCase();
    const status = document.getElementById('billing-status-filter')?.value || '';

    const filtered = this.invoicesList.filter(inv => {
      const matchSearch = !search ||
        inv.id.toLowerCase().includes(search) ||
        (inv.patient_name && inv.patient_name.toLowerCase().includes(search)) ||
        (inv.patient_id && inv.patient_id.toLowerCase().includes(search));

      const matchStatus = !status || inv.status === status;
      return matchSearch && matchStatus;
    });

    const tbody = document.getElementById('invoices-table-body');
    if (tbody) tbody.innerHTML = this.renderInvoiceRows(filtered);
  },

  async viewReceipt(invoiceId) {
    try {
      const res = await api.billing.getReceipt(invoiceId);
      const { hospital, invoice } = res.data;

      const modalHtml = `
        <div class="modal-header">
          <h3>Hospital Invoice & Payment Receipt</h3>
          <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
        </div>
        <div class="modal-body" id="receipt-print-area">
          
          <div class="receipt-header">
            <div>
              <h2 style="font-size: 1.25rem; font-weight: 800; color: var(--primary);">${hospital.name}</h2>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${hospital.address}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${hospital.phone} • ${hospital.email}</div>
            </div>
            <div style="text-align: right;">
              <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--secondary);">${invoice.id}</h3>
              <div style="font-size: 0.8rem; color: var(--text-muted);">Issue Date: ${invoice.issue_date}</div>
              <div><span class="badge ${invoice.status === 'paid' ? 'badge-success' : 'badge-danger'}">${invoice.status.toUpperCase()}</span></div>
            </div>
          </div>

          <div style="margin-bottom: 1.25rem; font-size: 0.85rem;">
            <strong>Billed To:</strong> ${invoice.patient_name} (MRN: ${invoice.patient_id})<br>
            ${invoice.patient?.insurance_provider ? `Insurance Provider: <strong>${invoice.patient.insurance_provider}</strong> (Policy: ${invoice.patient.insurance_policy_number || 'Verified'})` : 'Self-Pay Account'}
            ${invoice.notes ? `<div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 4px;"><em>Details: ${invoice.notes}</em></div>` : ''}
          </div>

          <table class="data-table" style="margin-bottom: 1rem;">
            <thead>
              <tr>
                <th>Service / Item</th>
                <th>Category</th>
                <th style="text-align: right;">Qty</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(invoice.items || []).map(item => `
                <tr>
                  <td><strong>${item.description}</strong></td>
                  <td><span class="badge badge-neutral">${item.item_type}</span></td>
                  <td style="text-align: right;">${item.quantity}</td>
                  <td style="text-align: right;">$${item.unit_price.toFixed(2)}</td>
                  <td style="text-align: right; font-weight: 600;">$${item.total_price.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="receipt-totals">
            <div class="receipt-total-row"><span>Subtotal:</span> <span>$${invoice.subtotal.toFixed(2)}</span></div>
            <div class="receipt-total-row"><span>Discount:</span> <span>-$${invoice.discount_amount.toFixed(2)}</span></div>
            <div class="receipt-total-row"><span>Tax (5%):</span> <span>+$${invoice.tax_amount.toFixed(2)}</span></div>
            <div class="receipt-total-row grand-total"><span>Total Due:</span> <span>$${invoice.total_amount.toFixed(2)}</span></div>
            <div class="receipt-total-row" style="color: var(--accent); font-weight: 700;"><span>Amount Paid:</span> <span>$${invoice.paid_amount.toFixed(2)}</span></div>
            <div class="receipt-total-row" style="color: var(--danger); font-weight: 700;"><span>Balance Remaining:</span> <span>$${(invoice.total_amount - invoice.paid_amount).toFixed(2)}</span></div>
          </div>

          <!-- Payment Transactions Breakdown -->
          ${invoice.payments?.length ? `
            <div style="margin-top: 1.5rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
              <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--secondary); margin-bottom: 0.5rem;">Recorded Payments</h4>
              ${invoice.payments.map(p => `
                <div style="display: flex; justify-content: space-between; font-size: 0.775rem; color: var(--text-muted); margin-bottom: 0.25rem;">
                  <span>${p.payment_date} via <strong>${p.payment_method}</strong> (Ref: ${p.reference_number || 'N/A'})</span>
                  <span style="font-weight: 600; color: var(--accent);">$${p.amount.toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="window.print()">🖨️ Print Receipt</button>
          <button class="btn btn-primary" onclick="App.closeActiveModal()">Close</button>
        </div>
      `;

      App.showDynamicModal(modalHtml);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  openPaymentModal(invoiceId, balance) {
    const modalHtml = `
      <div class="modal-header">
        <h3>Record Payment for ${invoiceId}</h3>
        <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
      </div>
      <form onsubmit="BillingView.submitPayment(event, '${invoiceId}')">
        <div class="modal-body">
          <div style="background: #f8fafc; padding: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1rem;">
            <div style="font-size: 0.85rem; color: var(--text-muted);">Outstanding Balance Due</div>
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--danger);">$${balance}</div>
          </div>

          <div class="form-group">
            <label class="form-label">Payment Amount ($)</label>
            <input type="number" id="pay-amount" class="form-input" value="${balance}" min="1" max="${balance}" step="0.01" required>
          </div>

          <div class="form-group">
            <label class="form-label">Payment Method</label>
            <select id="pay-method" class="form-select" required>
              <option value="credit_card">Credit Card (Visa / Mastercard / Amex)</option>
              <option value="cash">Cash (Hospital Cashier)</option>
              <option value="insurance">Insurance Claim Settlement</option>
              <option value="bank_transfer">Direct Bank / ACH Transfer</option>
              <option value="debit_card">Debit Card</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Transaction / Reference Number</label>
            <input type="text" id="pay-ref" class="form-input" placeholder="e.g. TXN-88201 or Check #">
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Process & Clear Payment</button>
        </div>
      </form>
    `;

    App.showDynamicModal(modalHtml);
  },

  async submitPayment(event, invoiceId) {
    event.preventDefault();
    const amount = parseFloat(document.getElementById('pay-amount').value);
    const payment_method = document.getElementById('pay-method').value;
    const reference_number = document.getElementById('pay-ref').value;

    try {
      await api.billing.recordPayment(invoiceId, { amount, payment_method, reference_number });
      showToast('Payment successfully applied!', 'success');
      App.closeActiveModal();
      App.navigate('billing');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async openCreateInvoiceModal(preselectedPatientId = null) {
    try {
      const res = await api.patients.getAll();
      const patients = res.data || [];

      const modalHtml = `
        <div class="modal-header">
          <h3>Generate Patient Invoice</h3>
          <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
        </div>
        <form onsubmit="BillingView.submitCreateInvoice(event)">
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Select Patient</label>
              <select id="inv-patient-id" class="form-select" required>
                ${patients.map(p => `
                  <option value="${p.id}" ${preselectedPatientId === p.id ? 'selected' : ''}>
                    ${p.name} (${p.id})${p.insurance_provider ? ` - [Insured: ${p.insurance_provider}]` : ''}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Discount Amount ($)</label>
              <input type="number" id="inv-discount" class="form-input" value="0" min="0" step="5">
            </div>

            <!-- Dynamic Line Items -->
            <div style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <label class="form-label" style="margin-bottom: 0;">Billable Items</label>
                <button type="button" class="btn btn-secondary btn-sm" onclick="BillingView.addInvoiceRow()">+ Add Item</button>
              </div>

              <div id="invoice-items-rows" style="display: flex; flex-direction: column; gap: 0.5rem;">
                <div class="invoice-item-row" style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 0.5rem; align-items: center;">
                  <input type="text" class="form-input inv-item-desc" placeholder="Service description..." value="Specialist Clinical Consultation" required>
                  <select class="form-select inv-item-type">
                    <option value="consultation">Consultation</option>
                    <option value="procedure">Procedure</option>
                    <option value="laboratory">Lab Test</option>
                    <option value="pharmacy">Pharmacy</option>
                    <option value="room_charge">Room/Bed</option>
                  </select>
                  <input type="number" class="form-input inv-item-price" placeholder="Price ($)" value="150" min="1" step="5" required>
                  <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button>
                </div>
              </div>
            </div>

            <div class="form-group" style="margin-top: 1rem;">
              <label class="form-label">Invoice Notes</label>
              <textarea id="inv-notes" class="form-textarea" placeholder="Payment terms, insurer claim details, or instructions..."></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Invoice</button>
          </div>
        </form>
      `;

      App.showDynamicModal(modalHtml);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  addInvoiceRow() {
    const container = document.getElementById('invoice-items-rows');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'invoice-item-row';
    row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 0.5rem; align-items: center;';
    row.innerHTML = `
      <input type="text" class="form-input inv-item-desc" placeholder="Service description..." required>
      <select class="form-select inv-item-type">
        <option value="procedure">Procedure</option>
        <option value="laboratory">Lab Test</option>
        <option value="pharmacy">Pharmacy</option>
        <option value="consultation">Consultation</option>
        <option value="room_charge">Room/Bed</option>
      </select>
      <input type="number" class="form-input inv-item-price" placeholder="Price ($)" value="50" min="1" step="5" required>
      <button type="button" class="btn btn-danger btn-sm" onclick="this.parentElement.remove()">✕</button>
    `;
    container.appendChild(row);
  },

  async submitCreateInvoice(event) {
    event.preventDefault();
    const patient_id = document.getElementById('inv-patient-id').value;
    const discount_amount = parseFloat(document.getElementById('inv-discount').value) || 0;
    const notes = document.getElementById('inv-notes').value;

    const rows = document.querySelectorAll('.invoice-item-row');
    const items = [];
    rows.forEach(row => {
      const desc = row.querySelector('.inv-item-desc').value;
      const type = row.querySelector('.inv-item-type').value;
      const price = parseFloat(row.querySelector('.inv-item-price').value) || 0;
      if (desc && price > 0) {
        items.push({
          description: desc,
          item_type: type,
          quantity: 1,
          unit_price: price
        });
      }
    });

    if (items.length === 0) {
      showToast('Please add at least one billable item', 'warning');
      return;
    }

    try {
      await api.billing.createInvoice({ patient_id, discount_amount, notes, items });
      showToast('Invoice generated successfully!', 'success');
      App.closeActiveModal();
      App.navigate('billing');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

window.BillingView = BillingView;
