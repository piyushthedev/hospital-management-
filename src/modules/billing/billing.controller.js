/**
 * Billing Controller
 */
const billingService = require('./billing.service');

const billingController = {
  async getAllInvoices(req, res) {
    const filters = {
      patient_id: req.query.patient_id,
      status: req.query.status,
      from_date: req.query.from_date,
      to_date: req.query.to_date,
      search: req.query.search
    };

    // If logged-in user is a patient, restrict to their invoices
    if (req.user.role === 'patient') {
      const db = require('../../core/database').getDatabase();
      const pat = db.prepare('SELECT id FROM patients WHERE user_id = ? OR email = ? COLLATE NOCASE').get(req.user.id, req.user.email);
      if (pat) {
        filters.patient_id = pat.id;
      }
    }

    const list = billingService.getAllInvoices(filters);
    res.json({ success: true, count: list.length, data: list });
  },

  async getPatientAccounts(req, res) {
    const filters = {
      patient_id: req.query.patient_id,
      insurance_provider: req.query.insurance_provider,
      search: req.query.search
    };

    if (req.user.role === 'patient') {
      const db = require('../../core/database').getDatabase();
      const pat = db.prepare('SELECT id FROM patients WHERE user_id = ? OR email = ? COLLATE NOCASE').get(req.user.id, req.user.email);
      if (pat) {
        filters.patient_id = pat.id;
      }
    }

    const accounts = billingService.getPatientBillingAccounts(filters);
    res.json({ success: true, count: accounts.length, data: accounts });
  },

  async getInvoiceById(req, res) {
    const invoice = billingService.getInvoiceById(req.params.id);

    // If user is a patient, verify ownership
    if (req.user.role === 'patient') {
      const db = require('../../core/database').getDatabase();
      const pat = db.prepare('SELECT id FROM patients WHERE user_id = ? OR email = ? COLLATE NOCASE').get(req.user.id, req.user.email);
      if (!pat || invoice.patient_id !== pat.id) {
        return res.error('Access denied: You may only view your own bills', 403);
      }
    }

    res.json({ success: true, data: invoice });
  },

  async createInvoice(req, res) {
    const created = billingService.createInvoice(req.body, req.user);
    res.json({ success: true, message: 'Invoice generated successfully', data: created }, 201);
  },

  async recordPayment(req, res) {
    const updated = billingService.recordPayment(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Payment recorded successfully', data: updated });
  },

  async getSummary(req, res) {
    const summary = billingService.getSummary();
    res.json({ success: true, data: summary });
  },

  async getReceipt(req, res) {
    const receipt = billingService.getReceipt(req.params.id);
    res.json({ success: true, data: receipt });
  }
};

module.exports = billingController;

