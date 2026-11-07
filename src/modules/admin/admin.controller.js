/**
 * Admin Controller
 */
const adminService = require('./admin.service');

const adminController = {
  async getOverview(req, res) {
    const overview = adminService.getOverview();
    res.json({ success: true, data: overview });
  },

  async getAuditLogs(req, res) {
    const logs = adminService.getAuditLogs({
      module: req.query.module,
      action: req.query.action,
      user_id: req.query.user_id,
      limit: req.query.limit
    });
    res.json({ success: true, count: logs.length, data: logs });
  },

  async getSettings(req, res) {
    const settings = adminService.getSettings();
    res.json({ success: true, data: settings });
  },

  async updateSettings(req, res) {
    const updated = adminService.updateSettings(req.body, req.user);
    res.json({ success: true, message: 'Settings updated successfully', data: updated });
  },

  async getBeds(req, res) {
    const beds = adminService.getBeds({
      status: req.query.status,
      ward_type: req.query.ward_type,
      department_id: req.query.department_id
    });
    res.json({ success: true, count: beds.length, data: beds });
  },

  async createBed(req, res) {
    const bed = adminService.createBed(req.body, req.user);
    res.json({ success: true, message: 'Bed added successfully', data: bed }, 201);
  },

  async updateBed(req, res) {
    const bed = adminService.updateBed(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Bed updated successfully', data: bed });
  },

  async getUsers(req, res) {
    const users = adminService.getUsers();
    res.json({ success: true, count: users.length, data: users });
  },

  async createUser(req, res) {
    try {
      const user = adminService.createUser(req.body, req.user);
      res.status(201).json({ success: true, message: 'User created successfully', data: user });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async toggleUserStatus(req, res) {
    const { is_active } = req.body;
    const result = adminService.toggleUserStatus(req.params.id, is_active, req.user);
    res.json(result);
  }
};

module.exports = adminController;

