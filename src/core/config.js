/**
 * Application Configuration
 */
const path = require('node:path');

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '0.0.0.0',
  jwtSecret: process.env.JWT_SECRET || 'hospital-mgmt-sys-super-secret-key-2026',
  jwtExpiresInMs: 24 * 60 * 60 * 1000, // 24 hours
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../data/hospital.db'),
  hospital: {
    name: 'Metropolitan General Hospital',
    code: 'MGH-HEALTH',
    phone: '+1 (555) 234-5678',
    emergencyHotline: '911 / +1 (555) 911-0000',
    email: 'info@metrogeneral.org',
    address: '742 Healthcare Boulevard, Metro City, MC 90210',
    currency: 'USD',
    currencySymbol: '$',
    totalBeds: 120
  }
};

module.exports = config;

