/**
 * Doctor Controller
 */
const doctorService = require('./doctor.service');

const doctorController = {
  async getAll(req, res) {
    const filters = {
      department_id: req.query.department_id,
      availability_status: req.query.availability_status,
      search: req.query.search
    };
    const list = doctorService.getAll(filters);
    res.json({ success: true, count: list.length, data: list });
  },

  async getById(req, res) {
    const doctor = doctorService.getById(req.params.id);
    res.json({ success: true, data: doctor });
  },

  async getSchedule(req, res) {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const schedule = doctorService.getSchedule(req.params.id, dateStr);
    res.json({ success: true, data: schedule });
  },

  async create(req, res) {
    const created = doctorService.create(req.body, req.user);
    res.json({ success: true, message: 'Doctor registered successfully', data: created }, 201);
  },

  async update(req, res) {
    const updated = doctorService.update(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Doctor profile updated', data: updated });
  },

  async updateAvailability(req, res) {
    const { status } = req.body;
    const result = doctorService.updateAvailability(req.params.id, status, req.user);
    res.json({ success: true, message: 'Availability status updated', data: result });
  },

  async delete(req, res) {
    const result = doctorService.delete(req.params.id, req.user);
    res.json(result);
  }
};

module.exports = doctorController;

