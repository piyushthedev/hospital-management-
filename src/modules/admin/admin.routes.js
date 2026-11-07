/**
 * Admin & Governance Routes
 */
const Router = require('../../core/router');
const adminController = require('./admin.controller');
const { authenticate, requireRole } = require('../auth/auth.middleware');

const router = new Router();

// Overview is viewable by admin, doctor, staff, and accountant to power their dashboard cards
router.get('/overview', authenticate, requireRole('admin', 'doctor', 'staff', 'accountant'), adminController.getOverview);

// Settings, Audit Logs, Beds, and User Accounts require Admin privilege
router.get('/settings', authenticate, requireRole('admin'), adminController.getSettings);
router.put('/settings', authenticate, requireRole('admin'), adminController.updateSettings);
router.get('/audit-logs', authenticate, requireRole('admin'), adminController.getAuditLogs);
router.get('/beds', authenticate, requireRole('admin', 'staff', 'doctor'), adminController.getBeds);
router.post('/beds', authenticate, requireRole('admin'), adminController.createBed);
router.put('/beds/:id', authenticate, requireRole('admin', 'staff'), adminController.updateBed);
router.get('/users', authenticate, requireRole('admin'), adminController.getUsers);
router.post('/users', authenticate, requireRole('admin'), adminController.createUser);
router.put('/users/:id/status', authenticate, requireRole('admin'), adminController.toggleUserStatus);

module.exports = router;

