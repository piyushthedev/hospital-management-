/**
 * Doctor Routes
 */
const Router = require('../../core/router');
const doctorController = require('./doctor.controller');
const { authenticate, requireRole } = require('../auth/auth.middleware');

const router = new Router();

router.get('/', authenticate, doctorController.getAll);
router.get('/:id', authenticate, doctorController.getById);
router.get('/:id/schedule', authenticate, doctorController.getSchedule);
router.post('/', authenticate, requireRole('admin'), doctorController.create);
router.put('/:id', authenticate, requireRole('admin', 'doctor'), doctorController.update);
router.put('/:id/availability', authenticate, requireRole('admin', 'doctor'), doctorController.updateAvailability);
router.delete('/:id', authenticate, requireRole('admin'), doctorController.delete);

module.exports = router;

