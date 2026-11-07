/**
 * Billing & Invoicing Service
 */
const { getDatabase } = require('../../core/database');
const { generateId } = require('../../core/security');
const eventBus = require('../../core/event-bus');

class BillingService {
  constructor() {
    this.db = getDatabase();
    this.initEventListeners();
    this.ensureRegistrationInvoices();
  }

  initEventListeners() {
    // Automatically generate invoice draft when an appointment is completed
    eventBus.on('appointment.completed', (data) => {
      try {
        const { appointmentId, patientId, patientName, doctorId, doctorName, date } = data;
        
        // Check if invoice already exists for this appointment
        const existing = this.db.prepare('SELECT id FROM invoices WHERE appointment_id = ?').get(appointmentId);
        if (existing) return;

        const doctor = this.db.prepare('SELECT consultation_fee FROM doctors WHERE id = ?').get(doctorId);
        const fee = doctor ? doctor.consultation_fee : 50.0;
        const taxRate = 0.05; // 5%
        const taxAmount = fee * taxRate;
        const totalAmount = fee + taxAmount;

        const invId = generateId('INV');
        const todayStr = new Date().toISOString().split('T')[0];

        this.db.prepare(`
          INSERT INTO invoices (
            id, patient_id, patient_name, appointment_id, issue_date, due_date,
            subtotal, tax_amount, discount_amount, total_amount, paid_amount, status, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, 0.0, 'unpaid', ?)
        `).run(
          invId,
          patientId,
          patientName,
          appointmentId,
          todayStr,
          todayStr,
          fee,
          taxAmount,
          totalAmount,
          `Generated automatically upon completion of consultation with ${doctorName}`
        );

        const itemId = generateId('ITM');
        this.db.prepare(`
          INSERT INTO invoice_items (id, invoice_id, description, item_type, quantity, unit_price, total_price)
          VALUES (?, ?, ?, 'consultation', 1, ?, ?)
        `).run(itemId, invId, `Consultation with ${doctorName}`, fee, fee);

        eventBus.emit('billing.invoice_created', { invoiceId: invId, patientId, totalAmount });
      } catch (err) {
        console.error('[BillingService] Failed to auto-generate appointment invoice:', err);
      }
    });

    // Automatically generate registration & clinical intake invoice draft when a patient is registered
    eventBus.on('patient.registered', (data) => {
      try {
        const { patientId, name } = data;
        this.createRegistrationInvoice(patientId, name);
      } catch (err) {
        console.error('[BillingService] Failed to auto-generate patient registration invoice:', err);
      }
    });
  }

  createRegistrationInvoice(patientId, patientName) {
    if (!patientId) return null;

    const patient = this.db.prepare('SELECT * FROM patients WHERE id = ?').get(patientId);
    if (!patient) return null;

    // Check if initial registration invoice already exists
    const existing = this.db.prepare("SELECT id FROM invoices WHERE patient_id = ? AND notes LIKE '%Registration%'").get(patientId);
    if (existing) {
      return this.getInvoiceById(existing.id);
    }

    const fee = 50.0; // Standard Hospital Registration & Clinical Intake Fee
    const taxRate = 0.05; // 5%
    const taxAmount = parseFloat((fee * taxRate).toFixed(2));
    const totalAmount = parseFloat((fee + taxAmount).toFixed(2));
    const invId = generateId('INV');
    const todayStr = new Date().toISOString().split('T')[0];

    const hasInsurance = !!(patient.insurance_provider && patient.insurance_provider.trim());
    const notes = hasInsurance 
      ? `Hospital Registration & Clinical Intake Fee - Pending Claim via ${patient.insurance_provider}${patient.insurance_policy_number ? ` (Policy #${patient.insurance_policy_number})` : ''}`
      : 'Hospital Registration & Clinical Intake Fee - Self-Pay Account';

    this.db.prepare(`
      INSERT INTO invoices (
        id, patient_id, patient_name, appointment_id, issue_date, due_date,
        subtotal, tax_amount, discount_amount, total_amount, paid_amount, status, notes
      ) VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 0.0, ?, 0.0, 'unpaid', ?)
    `).run(
      invId,
      patient.id,
      patient.name,
      todayStr,
      todayStr,
      fee,
      taxAmount,
      totalAmount,
      notes
    );

    const itemId = generateId('ITM');
    this.db.prepare(`
      INSERT INTO invoice_items (id, invoice_id, description, item_type, quantity, unit_price, total_price)
      VALUES (?, ?, ?, 'registration', 1, ?, ?)
    `).run(itemId, invId, 'Hospital Registration & Medical Records Opening', fee, fee);

    eventBus.emit('billing.invoice_created', { invoiceId: invId, patientId: patient.id, totalAmount });

    eventBus.emit('audit.log', {
      userId: 'SYSTEM',
      userName: 'Hospital Billing System',
      userRole: 'system',
      action: 'REGISTRATION_INVOICE_GENERATED',
      module: 'billing',
      details: `Initial registration invoice ${invId} ($${totalAmount}) generated for patient ${patient.name} (${patient.id})`
    });

    return this.getInvoiceById(invId);
  }

  ensureRegistrationInvoices() {
    try {
      const patientsWithoutInvoice = this.db.prepare(`
        SELECT p.id, p.name 
        FROM patients p
        WHERE NOT EXISTS (
          SELECT 1 FROM invoices i WHERE i.patient_id = p.id
        )
      `).all();

      for (const p of patientsWithoutInvoice) {
        this.createRegistrationInvoice(p.id, p.name);
      }
    } catch (err) {
      console.error('[BillingService] Failed to backfill registration invoices:', err);
    }
  }

  getPatientBillingAccounts(filters = {}) {
    let query = `
      SELECT 
        p.id as patient_id,
        p.name as patient_name,
        p.phone,
        p.email,
        p.gender,
        p.date_of_birth,
        p.blood_group,
        p.insurance_provider,
        p.insurance_policy_number,
        p.status as patient_status,
        p.created_at as registered_at,
        COALESCE(SUM(i.total_amount), 0.0) as total_invoiced,
        COALESCE(SUM(i.paid_amount), 0.0) as total_paid,
        COALESCE(SUM(CASE WHEN i.status != 'paid' THEN (i.total_amount - i.paid_amount) ELSE 0 END), 0.0) as total_due,
        COUNT(i.id) as invoice_count,
        MAX(i.issue_date) as last_invoice_date
      FROM patients p
      LEFT JOIN invoices i ON p.id = i.patient_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.patient_id) {
      query += ' AND p.id = ?';
      params.push(filters.patient_id);
    }

    if (filters.search) {
      query += ' AND (p.id LIKE ? OR p.name LIKE ? OR p.phone LIKE ? OR p.insurance_provider LIKE ? OR p.insurance_policy_number LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term, term, term);
    }

    if (filters.insurance_provider) {
      query += ' AND p.insurance_provider LIKE ?';
      params.push(`%${filters.insurance_provider}%`);
    }

    query += ' GROUP BY p.id ORDER BY p.created_at DESC';

    const rows = this.db.prepare(query).all(...params);
    return rows.map(r => ({
      ...r,
      total_invoiced: parseFloat(Number(r.total_invoiced || 0).toFixed(2)),
      total_paid: parseFloat(Number(r.total_paid || 0).toFixed(2)),
      total_due: parseFloat(Number(r.total_due || 0).toFixed(2)),
      claim_status: r.insurance_provider 
        ? (r.total_due > 0 ? 'Claim Pending Verification' : 'Claim Settled / Cleared')
        : (r.total_due > 0 ? 'Self-Pay Due' : 'Account Settled')
    }));
  }

  getAllInvoices(filters = {}) {
    let query = 'SELECT * FROM invoices WHERE 1=1';
    const params = [];

    if (filters.patient_id) {
      query += ' AND patient_id = ?';
      params.push(filters.patient_id);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.from_date) {
      query += ' AND issue_date >= ?';
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ' AND issue_date <= ?';
      params.push(filters.to_date);
    }

    if (filters.search) {
      query += ' AND (id LIKE ? OR patient_name LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term);
    }

    query += ' ORDER BY issue_date DESC, created_at DESC';
    return this.db.prepare(query).all(...params);
  }

  getInvoiceById(id) {
    const invoice = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) {
      throw new Error(`Invoice with ID '${id}' not found`);
    }

    const items = this.db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);
    const payments = this.db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC').all(id);
    const patient = this.db.prepare('SELECT id, name, phone, email, address, insurance_provider, insurance_policy_number FROM patients WHERE id = ?').get(invoice.patient_id);

    return {
      ...invoice,
      items,
      payments,
      patient
    };
  }

  createInvoice(data, user) {
    const {
      patient_id,
      appointment_id = null,
      issue_date = new Date().toISOString().split('T')[0],
      due_date = new Date().toISOString().split('T')[0],
      discount_amount = 0.0,
      notes = '',
      items = []
    } = data;

    if (!patient_id) {
      throw new Error('Patient ID is required');
    }

    const patient = this.db.prepare('SELECT id, name FROM patients WHERE id = ?').get(patient_id);
    if (!patient) throw new Error(`Patient '${patient_id}' not found`);

    if (!items || !items.length) {
      throw new Error('Invoice must include at least one billable item');
    }

    let subtotal = 0.0;
    const processedItems = items.map(item => {
      const qty = parseInt(item.quantity, 10) || 1;
      const unitPrice = parseFloat(item.unit_price) || 0.0;
      const totalPrice = qty * unitPrice;
      subtotal += totalPrice;
      return {
        id: generateId('ITM'),
        description: item.description || 'Medical Service',
        item_type: item.item_type || 'procedure',
        quantity: qty,
        unit_price: unitPrice,
        total_price: totalPrice
      };
    });

    const parsedDiscount = parseFloat(discount_amount) || 0.0;
    const taxRate = 0.05; // 5%
    const taxableAmount = Math.max(0, subtotal - parsedDiscount);
    const taxAmount = parseFloat((taxableAmount * taxRate).toFixed(2));
    const totalAmount = parseFloat((taxableAmount + taxAmount).toFixed(2));

    const invoiceId = generateId('INV');

    this.db.prepare(`
      INSERT INTO invoices (
        id, patient_id, patient_name, appointment_id, issue_date, due_date,
        subtotal, tax_amount, discount_amount, total_amount, paid_amount, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, 'unpaid', ?)
    `).run(
      invoiceId,
      patient.id,
      patient.name,
      appointment_id,
      issue_date,
      due_date,
      subtotal,
      taxAmount,
      parsedDiscount,
      totalAmount,
      notes
    );

    const insertItem = this.db.prepare(`
      INSERT INTO invoice_items (id, invoice_id, description, item_type, quantity, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of processedItems) {
      insertItem.run(item.id, invoiceId, item.description, item.item_type, item.quantity, item.unit_price, item.total_price);
    }

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'INVOICE_CREATED',
      module: 'billing',
      details: `Invoice ${invoiceId} generated for ${patient.name} totaling $${totalAmount}`
    });

    eventBus.emit('billing.invoice_created', { invoiceId, patientId: patient.id, totalAmount });

    return this.getInvoiceById(invoiceId);
  }

  recordPayment(invoiceId, data, user) {
    const { amount, payment_method = 'credit_card', reference_number = '', notes = '' } = data;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      throw new Error('Valid payment amount greater than zero is required');
    }

    const invoice = this.db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    if (!invoice) throw new Error(`Invoice '${invoiceId}' not found`);

    const remainingDue = parseFloat((invoice.total_amount - invoice.paid_amount).toFixed(2));
    if (remainingDue <= 0) {
      throw new Error('This invoice has already been paid in full');
    }

    if (parsedAmount > remainingDue + 0.01) {
      throw new Error(`Payment amount ($${parsedAmount}) exceeds remaining balance of $${remainingDue}`);
    }

    const newPaidAmount = parseFloat((invoice.paid_amount + parsedAmount).toFixed(2));
    const isFullyPaid = newPaidAmount >= invoice.total_amount - 0.01;
    const newStatus = isFullyPaid ? 'paid' : 'partially_paid';

    const paymentId = generateId('PAY');
    const paymentDate = new Date().toISOString().replace('T', ' ').substring(0, 19);

    this.db.prepare(`
      INSERT INTO payments (id, invoice_id, amount, payment_method, reference_number, notes, payment_date, processed_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(paymentId, invoiceId, parsedAmount, payment_method, reference_number, notes, paymentDate, user?.name || 'System');

    this.db.prepare(`
      UPDATE invoices 
      SET paid_amount = ?, status = ?
      WHERE id = ?
    `).run(newPaidAmount, newStatus, invoiceId);

    eventBus.emit('audit.log', {
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      action: 'PAYMENT_RECORDED',
      module: 'billing',
      details: `Payment of $${parsedAmount} received for ${invoiceId} via ${payment_method}`
    });

    eventBus.emit('billing.payment_received', { invoiceId, paymentId, amount: parsedAmount, newStatus });

    return this.getInvoiceById(invoiceId);
  }

  getSummary() {
    const totals = this.db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0.0) as total_invoiced,
        COALESCE(SUM(paid_amount), 0.0) as total_collected,
        COALESCE(SUM(CASE WHEN status != 'paid' THEN (total_amount - paid_amount) ELSE 0 END), 0.0) as total_outstanding,
        COUNT(*) as total_invoices
      FROM invoices
    `).get();

    const statusCounts = this.db.prepare(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(total_amount), 0.0) as sum_amount
      FROM invoices
      GROUP BY status
    `).all();

    const todayStr = new Date().toISOString().split('T')[0];
    const todayPayments = this.db.prepare(`
      SELECT COALESCE(SUM(amount), 0.0) as today_collections, COUNT(*) as today_transactions
      FROM payments
      WHERE payment_date LIKE ?
    `).get(`${todayStr}%`);

    return {
      financials: {
        total_invoiced: totals.total_invoiced,
        total_collected: totals.total_collected,
        total_outstanding: totals.total_outstanding,
        today_collections: todayPayments.today_collections
      },
      counts: {
        total_invoices: totals.total_invoices,
        today_transactions: todayPayments.today_transactions,
        by_status: statusCounts
      }
    };
  }

  getReceipt(invoiceId) {
    const inv = this.getInvoiceById(invoiceId);
    const settings = this.db.prepare('SELECT key, value FROM hospital_settings').all();
    const settingsMap = {};
    settings.forEach(s => settingsMap[s.key] = s.value);

    return {
      hospital: {
        name: settingsMap.hospital_name || 'Metropolitan General Hospital',
        address: settingsMap.hospital_address || '742 Healthcare Boulevard',
        phone: settingsMap.hospital_phone || '+1 (555) 234-5678',
        email: settingsMap.hospital_email || 'billing@metrogeneral.org',
        tax_rate: settingsMap.tax_rate_percent || '5.0%'
      },
      invoice: inv
    };
  }
}

module.exports = new BillingService();

