/**
 * Patient Routes
 */
const Router = require('../../core/router');
const patientController = require('./patient.controller');
const { authenticate, requireRole } = require('../auth/auth.middleware');

const router = new Router();

router.get('/', authenticate, requireRole('admin', 'doctor', 'staff', 'accountant'), patientController.getAll);
router.get('/:id', authenticate, patientController.getById);
router.post('/', authenticate, requireRole('admin', 'staff', 'doctor'), patientController.create);
router.put('/:id', authenticate, requireRole('admin', 'staff', 'doctor'), patientController.update);
router.post('/:id/admit', authenticate, requireRole('admin', 'staff', 'doctor'), patientController.admit);
router.post('/:id/discharge', authenticate, requireRole('admin', 'staff', 'doctor'), patientController.discharge);
router.post('/:id/records', authenticate, requireRole('admin', 'doctor', 'staff'), patientController.addMedicalRecord);
router.delete('/:id', authenticate, requireRole('admin'), patientController.delete);

module.exports = router;

