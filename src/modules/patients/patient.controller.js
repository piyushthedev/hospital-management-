/**
 * Patient Controller
 */
const patientService = require('./patient.service');

const patientController = {
  async getAll(req, res) {
    const filters = {
      status: req.query.status,
      blood_group: req.query.blood_group,
      search: req.query.search
    };
    const list = patientService.getAll(filters);
    res.json({ success: true, count: list.length, data: list });
  },

  async getById(req, res) {
    // If user is a patient, they can only view their own record unless they are staff/doctor/admin
    if (req.user.role === 'patient') {
      const myPat = req.user.id;
      const patient = patientService.getById(req.params.id);
      if (patient.user_id !== myPat && patient.email !== req.user.email) {
        return res.error('Access forbidden: You may only view your own patient file', 403);
      }
      return res.json({ success: true, data: patient });
    }

    const patient = patientService.getById(req.params.id);
    res.json({ success: true, data: patient });
  },

  async create(req, res) {
    const created = patientService.create(req.body, req.user);
    res.json({ success: true, message: 'Patient registered successfully', data: created }, 201);
  },

  async update(req, res) {
    const updated = patientService.update(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Patient information updated', data: updated });
  },

  async admit(req, res) {
    const updated = patientService.admit(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Patient admitted successfully', data: updated });
  },

  async discharge(req, res) {
    const updated = patientService.discharge(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Patient discharged successfully', data: updated });
  },

  async addMedicalRecord(req, res) {
    const record = patientService.addMedicalRecord(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Medical record added successfully', data: record }, 201);
  },

  async delete(req, res) {
    const result = patientService.delete(req.params.id, req.user);
    res.json(result);
  }
};

module.exports = patientController;

