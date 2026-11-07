/**
 * Staff Routes
 */
const Router = require('../../core/router');
const staffController = require('./staff.controller');
const { authenticate, requireRole } = require('../auth/auth.middleware');

const router = new Router();

router.get('/', authenticate, staffController.getAll);
router.get('/roster', authenticate, staffController.getRoster);
router.get('/:id', authenticate, staffController.getById);
router.post('/', authenticate, requireRole('admin'), staffController.create);
router.put('/:id', authenticate, requireRole('admin'), staffController.update);
router.delete('/:id', authenticate, requireRole('admin'), staffController.delete);

module.exports = router;

