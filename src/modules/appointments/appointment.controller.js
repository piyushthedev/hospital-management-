/**
 * Appointment Controller
 */
const appointmentService = require('./appointment.service');

const appointmentController = {
  async getAll(req, res) {
    const filters = {
      doctor_id: req.query.doctor_id,
      patient_id: req.query.patient_id,
      department_id: req.query.department_id,
      date: req.query.date,
      status: req.query.status
    };

    // If logged-in user is a patient, restrict to their appointments
    if (req.user.role === 'patient') {
      const patient = req.user;
      // Find patient ID linked to this user
      const db = require('../../core/database').getDatabase();
      const pat = db.prepare('SELECT id FROM patients WHERE user_id = ? OR email = ? COLLATE NOCASE').get(patient.id, patient.email);
      if (pat) {
        filters.patient_id = pat.id;
      }
    }

    const list = appointmentService.getAll(filters);
    res.json({ success: true, count: list.length, data: list });
  },

  async getById(req, res) {
    const apt = appointmentService.getById(req.params.id);
    res.json({ success: true, data: apt });
  },

  async create(req, res) {
    // If patient is booking, verify they are setting their own patient ID
    if (req.user.role === 'patient') {
      const db = require('../../core/database').getDatabase();
      const pat = db.prepare('SELECT id FROM patients WHERE user_id = ? OR email = ? COLLATE NOCASE').get(req.user.id, req.user.email);
      if (pat) {
        req.body.patient_id = pat.id;
      }
    }

    const created = appointmentService.create(req.body, req.user);
    res.json({ success: true, message: 'Appointment booked successfully', data: created }, 201);
  },

  async updateStatus(req, res) {
    const { status, notes, prescription_notes } = req.body;
    const updated = appointmentService.updateStatus(req.params.id, status, { notes, prescription_notes }, req.user);
    res.json({ success: true, message: `Appointment status updated to ${status}`, data: updated });
  },

  async reschedule(req, res) {
    const updated = appointmentService.reschedule(req.params.id, req.body, req.user);
    res.json({ success: true, message: 'Appointment rescheduled successfully', data: updated });
  },

  async cancel(req, res) {
    const { reason } = req.body;
    const cancelled = appointmentService.cancel(req.params.id, reason, req.user);
    res.json({ success: true, message: 'Appointment cancelled', data: cancelled });
  }
};

module.exports = appointmentController;

