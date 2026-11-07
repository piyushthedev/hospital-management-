/**
 * Appointment Routes
 */
const Router = require('../../core/router');
const appointmentController = require('./appointment.controller');
const { authenticate, requireRole } = require('../auth/auth.middleware');

const router = new Router();

router.get('/', authenticate, appointmentController.getAll);
router.get('/:id', authenticate, appointmentController.getById);
router.post('/', authenticate, appointmentController.create);
router.put('/:id/status', authenticate, requireRole('admin', 'doctor', 'staff'), appointmentController.updateStatus);
router.put('/:id/reschedule', authenticate, appointmentController.reschedule);
router.delete('/:id', authenticate, appointmentController.cancel);

module.exports = router;

