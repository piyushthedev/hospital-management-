/**
 * Lab Controller
 */
const labService = require('./lab.service');

const labController = {
  async getAllTests(req, res) {
    const tests = labService.getAllTests();
    res.json({ success: true, count: tests.length, data: tests });
  },

  async createTest(req, res) {
    const created = labService.createTest(req.body, req.user);
    res.json({ success: true, message: 'Lab test created', data: created }, 201);
  },

  async getAllOrders(req, res) {
    const filters = {
      patient_id: req.query.patient_id,
      doctor_id: req.query.doctor_id,
      status: req.query.status,
      search: req.query.search
    };

    if (req.user.role === 'patient') {
      const db = require('../../core/database').getDatabase();
      const pat = db.prepare('SELECT id FROM patients WHERE user_id = ? OR email = ? COLLATE NOCASE').get(req.user.id, req.user.email);
      if (pat) filters.patient_id = pat.id;
    }

    const orders = labService.getAllOrders(filters);
    res.json({ success: true, count: orders.length, data: orders });
  },

  async getOrderById(req, res) {
    const order = labService.getOrderById(req.params.id);
    res.json({ success: true, data: order });
  },

  async createOrder(req, res) {
    const created = labService.createOrder(req.body, req.user);
    res.json({ success: true, message: 'Lab test ordered successfully', data: created }, 201);
  },

  async updateOrderStatus(req, res) {
    const { status, result_value, notes } = req.body;
    const updated = labService.updateOrderStatus(req.params.id, status, { result_value, notes }, req.user);
    res.json({ success: true, message: `Lab order status updated to ${status}`, data: updated });
  },

  async deleteOrder(req, res) {
    const result = labService.deleteOrder(req.params.id, req.user);
    res.json(result);
  }
};

module.exports = labController;

