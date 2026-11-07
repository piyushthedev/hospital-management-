/**
 * Department Routes
 */
const Router = require('../../core/router');
const departmentController = require('./department.controller');
const { authenticate, requireRole } = require('../auth/auth.middleware');

const router = new Router();

router.get('/', authenticate, departmentController.getAll);
router.get('/:id', authenticate, departmentController.getById);
router.post('/', authenticate, requireRole('admin'), departmentController.create);
router.put('/:id', authenticate, requireRole('admin'), departmentController.update);
router.delete('/:id', authenticate, requireRole('admin'), departmentController.delete);

module.exports = router;

