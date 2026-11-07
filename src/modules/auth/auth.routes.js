/**
 * Authentication Routes
 */
const Router = require('../../core/router');
const authController = require('./auth.controller');
const { authenticate } = require('./auth.middleware');

const router = new Router();

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/otp/send', authController.sendOtp);
router.post('/otp/verify', authController.verifyOtp);
router.post('/biometric/challenge', authController.getBiometricChallenge);
router.post('/biometric/login', authController.loginWithBiometric);
router.post('/biometric/register', authenticate, authController.registerBiometric);
router.get('/me', authenticate, authController.getMe);
router.put('/profile', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;

