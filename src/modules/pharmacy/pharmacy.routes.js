/**
 * Pharmacy Routes
 */
const Router = require('../../core/router');
const pharmacyController = require('./pharmacy.controller');
const { authenticate, requireRole } = require('../auth/auth.middleware');

const router = new Router();

// Summary Metrics
router.get('/metrics', authenticate, pharmacyController.getSummaryMetrics);

// Medicine Inventory
router.get('/medicines', authenticate, pharmacyController.getAllMedicines);
router.get('/medicines/:id', authenticate, pharmacyController.getMedicineById);
router.post('/medicines', authenticate, requireRole('admin', 'staff'), pharmacyController.createMedicine);
router.put('/medicines/:id', authenticate, requireRole('admin', 'staff'), pharmacyController.updateMedicine);
router.post('/medicines/:id/adjust-stock', authenticate, requireRole('admin', 'staff'), pharmacyController.adjustStock);

// Prescriptions
router.get('/prescriptions', authenticate, pharmacyController.getAllPrescriptions);
router.get('/prescriptions/:id', authenticate, pharmacyController.getPrescriptionById);
router.post('/prescriptions', authenticate, requireRole('admin', 'doctor'), pharmacyController.createPrescription);
router.post('/prescriptions/:id/dispense', authenticate, requireRole('admin', 'staff'), pharmacyController.dispensePrescription);
router.put('/prescriptions/:id/cancel', authenticate, requireRole('admin', 'doctor'), pharmacyController.cancelPrescription);

module.exports = router;

