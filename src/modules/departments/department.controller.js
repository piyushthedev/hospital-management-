/**
 * Department Controller
 */
const departmentService = require('./department.service');

const departmentController = {
  async getAll(req, res) {
    const list = departmentService.getAll();
    res.json({ success: true, count: list.length, data: list });
  },

  async getById(req, res) {
    const dept = departmentService.getById(req.params.id);
    res.json({ success: true, data: dept });
  },

  async create(req, res) {
    const created = departmentService.create(req.body, req.user);
    res.json({ success: true, message: 'Department created successfully', data: created }, 201);
  },

  async update(req, res) {
    const updated = departmentService.update(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Department updated successfully', data: updated });
  },

  async delete(req, res) {
    const result = departmentService.delete(req.params.id, req.user);
    res.json(result);
  }
};

module.exports = departmentController;

