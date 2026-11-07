/**
 * Billing Routes
 */
const Router = require('../../core/router');
const billingController = require('./billing.controller');
const { authenticate, requireRole } = require('../auth/auth.middleware');

const router = new Router();

router.get('/invoices', authenticate, billingController.getAllInvoices);
router.get('/patient-accounts', authenticate, billingController.getPatientAccounts);
router.get('/invoices/:id', authenticate, billingController.getInvoiceById);
router.get('/invoices/:id/receipt', authenticate, billingController.getReceipt);
router.post('/invoices', authenticate, requireRole('admin', 'accountant', 'staff'), billingController.createInvoice);
router.post('/invoices/:id/payments', authenticate, requireRole('admin', 'accountant', 'staff'), billingController.recordPayment);
router.get('/summary', authenticate, requireRole('admin', 'accountant'), billingController.getSummary);

module.exports = router;

