const test = require('node:test');
const assert = require('node:assert');
const authService = require('../src/modules/auth/auth.service');
const { hashPassword, verifyPassword, generateToken, verifyToken } = require('../src/core/security');

test('Auth: Security utilities - hash and verify password', () => {
  const password = 'SuperSecretPassword123!';
  const hash = hashPassword(password);

  assert.ok(hash.includes(':'), 'Hash must contain salt delimiter');
  assert.strictEqual(verifyPassword(password, hash), true, 'Password must verify successfully');
  assert.strictEqual(verifyPassword('WrongPassword', hash), false, 'Wrong password must fail verification');
});

test('Auth: Security utilities - JWT generation and validation', () => {
  const payload = { id: 'USR-TEST', email: 'test@hospital.org', role: 'doctor' };
  const token = generateToken(payload, 5000);

  const decoded = verifyToken(token);
  assert.strictEqual(decoded.id, payload.id);
  assert.strictEqual(decoded.email, payload.email);
  assert.strictEqual(decoded.role, payload.role);
  assert.ok(decoded.exp > decoded.iat);
});

test('Auth: Login with seeded admin credentials', () => {
  const result = authService.login('admin@hospital.org', 'Admin123!');
  assert.ok(result.token, 'Must return token');
  assert.strictEqual(result.user.email, 'admin@hospital.org');
  assert.strictEqual(result.user.role, 'admin');
  assert.strictEqual(result.user.password_hash, undefined, 'Password hash must not be exposed');
});

test('Auth: Login fails with incorrect password', () => {
  assert.throws(
    () => authService.login('admin@hospital.org', 'WrongPassword123!'),
    /Invalid email or password/
  );
});

test('Auth: User registration and duplicate prevention', () => {
  const uniqueEmail = `test.user.${Date.now()}@hospital.org`;
  const result = authService.register({
    email: uniqueEmail,
    password: 'Password123!',
    name: 'Test Clinical Officer',
    role: 'staff',
    phone: '+1 (555) 777-8888'
  });

  assert.ok(result.token);
  assert.strictEqual(result.user.email, uniqueEmail);
  assert.strictEqual(result.user.role, 'staff');

  // Attempt duplicate registration
  assert.throws(
    () => authService.register({
      email: uniqueEmail,
      password: 'AnotherPassword123!',
      name: 'Duplicate Officer',
      role: 'staff'
    }),
    /already exists/
  );
});

test('Auth: One-time password (OTP) generation and verification login', () => {
  const email = 'admin@hospital.org';

  // 1. Send OTP
  const otpRes = authService.sendOtp(email, 'login');
  assert.strictEqual(otpRes.success, true);
  assert.ok(otpRes.code, 'Should generate 6-digit OTP');
  assert.strictEqual(otpRes.code.length, 6);

  // 2. Verify OTP & Log In
  const verifyRes = authService.verifyOtp(email, otpRes.code, 'login');
  assert.ok(verifyRes.token, 'Must return JWT token on OTP verification');
  assert.strictEqual(verifyRes.user.email, email);
  assert.strictEqual(verifyRes.user.role, 'admin');

  // 3. Consumed OTP cannot be reused
  assert.throws(
    () => authService.verifyOtp(email, otpRes.code, 'login'),
    /Invalid or expired/
  );
});

test('Auth: OTP verification fails with invalid code', () => {
  assert.throws(
    () => authService.verifyOtp('admin@hospital.org', '000000', 'login'),
    /Invalid or expired/
  );
});

test('Auth: Fingerprint / Biometric authentication with Touch ID', () => {
  const email = 'doctor.chen@hospital.org';
  const bioRes = authService.loginWithBiometric(email, 'touch-id-macbook');

  assert.ok(bioRes.token, 'Must return JWT token on biometric authentication');
  assert.strictEqual(bioRes.user.email, email);
  assert.strictEqual(bioRes.user.role, 'doctor');
  assert.strictEqual(bioRes.biometric.verified, true);
  assert.ok(bioRes.biometric.method.includes('Fingerprint'));
});

test('Auth: Biometric credential registration', () => {
  const regRes = authService.registerBiometric('USR-ADMIN', {
    credentialId: `fp-key-${Date.now()}`,
    deviceName: 'Clinic Workstation Fingerprint Reader'
  });

  assert.strictEqual(regRes.success, true);
  assert.ok(regRes.credential.id);
  assert.strictEqual(regRes.credential.deviceName, 'Clinic Workstation Fingerprint Reader');
});


