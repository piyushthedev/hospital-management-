/**
 * Authentication Controller
 */
const authService = require('./auth.service');

const authController = {
  async login(req, res) {
    const { email, password } = req.body;
    const result = authService.login(email, password);
    res.json({
      success: true,
      message: 'Logged in successfully',
      ...result
    });
  },

  async register(req, res) {
    const result = authService.register(req.body);
    res.json(
      {
        success: true,
        message: 'Account registered successfully',
        ...result
      },
      201
    );
  },

  async getMe(req, res) {
    const user = authService.getUserById(req.user.id);
    res.json({
      success: true,
      user
    });
  },

  async updateProfile(req, res) {
    const updatedUser = authService.updateProfile(req.user.id, req.body);
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  },

  async changePassword(req, res) {
    const { oldPassword, newPassword } = req.body;
    const result = authService.changePassword(req.user.id, oldPassword, newPassword);
    res.json(result);
  },

  async sendOtp(req, res) {
    try {
      const { email, purpose } = req.body;
      const result = authService.sendOtp(email, purpose);
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async verifyOtp(req, res) {
    try {
      const { email, code, purpose } = req.body;
      const result = authService.verifyOtp(email, code, purpose);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async getBiometricChallenge(req, res) {
    try {
      const { email } = req.body;
      const challenge = authService.getBiometricChallenge(email);
      res.json({ success: true, ...challenge });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async loginWithBiometric(req, res) {
    try {
      const { email, credentialId } = req.body;
      const result = authService.loginWithBiometric(email, credentialId);
      res.json({ success: true, message: 'Authenticated with Fingerprint / Touch ID successfully', ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  },

  async registerBiometric(req, res) {
    try {
      const result = authService.registerBiometric(req.user.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
};

module.exports = authController;

