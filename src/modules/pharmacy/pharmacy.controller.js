/**
 * Pharmacy Controller
 */
const pharmacyService = require('./pharmacy.service');

class PharmacyController {
  async getAllMedicines(req, res) {
    try {
      const filters = {
        category: req.query.category,
        status: req.query.status,
        search: req.query.search
      };
      const medicines = pharmacyService.getAllMedicines(filters);
      res.json({ success: true, data: medicines, count: medicines.length });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getMedicineById(req, res) {
    try {
      const medicine = pharmacyService.getMedicineById(req.params.id);
      res.json({ success: true, data: medicine });
    } catch (err) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  async createMedicine(req, res) {
    try {
      const medicine = pharmacyService.createMedicine(req.body, req.user);
      res.status(201).json({ success: true, data: medicine });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateMedicine(req, res) {
    try {
      const medicine = pharmacyService.updateMedicine(req.params.id, req.body, req.user);
      res.json({ success: true, data: medicine });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async adjustStock(req, res) {
    try {
      const medicine = pharmacyService.adjustStock(req.params.id, req.body, req.user);
      res.json({ success: true, data: medicine });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async getAllPrescriptions(req, res) {
    try {
      const filters = {
        patient_id: req.query.patient_id,
        doctor_id: req.query.doctor_id,
        status: req.query.status,
        search: req.query.search
      };
      const prescriptions = pharmacyService.getAllPrescriptions(filters);
      res.json({ success: true, data: prescriptions, count: prescriptions.length });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getPrescriptionById(req, res) {
    try {
      const prescription = pharmacyService.getPrescriptionById(req.params.id);
      res.json({ success: true, data: prescription });
    } catch (err) {
      res.status(404).json({ success: false, error: err.message });
    }
  }

  async createPrescription(req, res) {
    try {
      const prescription = pharmacyService.createPrescription(req.body, req.user);
      res.status(201).json({ success: true, data: prescription });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async dispensePrescription(req, res) {
    try {
      const prescription = pharmacyService.dispensePrescription(req.params.id, req.user);
      res.json({ success: true, data: prescription, message: 'Prescription dispensed successfully and medication inventory updated.' });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async cancelPrescription(req, res) {
    try {
      const prescription = pharmacyService.cancelPrescription(req.params.id, req.body.reason, req.user);
      res.json({ success: true, data: prescription });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async getSummaryMetrics(req, res) {
    try {
      const metrics = pharmacyService.getSummaryMetrics();
      res.json({ success: true, data: metrics });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new PharmacyController();

