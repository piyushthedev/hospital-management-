/**
 * Lab Routes
 */
const Router = require('../../core/router');
const labController = require('./lab.controller');
const { authenticate, requireRole } = require('../auth/auth.middleware');

const router = new Router();

router.get('/tests', authenticate, labController.getAllTests);
router.post('/tests', authenticate, requireRole('admin'), labController.createTest);
router.get('/orders', authenticate, labController.getAllOrders);
router.get('/orders/:id', authenticate, labController.getOrderById);
router.post('/orders', authenticate, requireRole('admin', 'doctor', 'staff'), labController.createOrder);
router.put('/orders/:id/status', authenticate, requireRole('admin', 'doctor', 'staff'), labController.updateOrderStatus);
router.delete('/orders/:id', authenticate, requireRole('admin'), labController.deleteOrder);

module.exports = router;

