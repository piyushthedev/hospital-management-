/**
 * Staff Controller
 */
const staffService = require('./staff.service');

const staffController = {
  async getAll(req, res) {
    const filters = {
      role: req.query.role,
      department_id: req.query.department_id,
      shift: req.query.shift,
      status: req.query.status,
      search: req.query.search
    };
    const list = staffService.getAll(filters);
    res.json({ success: true, count: list.length, data: list });
  },

  async getRoster(req, res) {
    const roster = staffService.getRoster();
    res.json({ success: true, data: roster });
  },

  async getById(req, res) {
    const member = staffService.getById(req.params.id);
    res.json({ success: true, data: member });
  },

  async create(req, res) {
    const created = staffService.create(req.body, req.user);
    res.json({ success: true, message: 'Staff member added successfully', data: created }, 201);
  },

  async update(req, res) {
    const updated = staffService.update(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Staff profile updated', data: updated });
  },

  async delete(req, res) {
    const result = staffService.delete(req.params.id, req.user);
    res.json(result);
  }
};

module.exports = staffController;

