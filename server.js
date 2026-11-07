/**
 * Modular Hospital Management System - Server Entrypoint
 */
const http = require('node:http');
const path = require('node:path');
const config = require('./src/core/config');
const logger = require('./src/core/logger');
const Router = require('./src/core/router');
const { getDatabase } = require('./src/core/database');

// Import Modules
const authRoutes = require('./src/modules/auth/auth.routes');
const adminRoutes = require('./src/modules/admin/admin.routes');
const departmentRoutes = require('./src/modules/departments/department.routes');
const doctorRoutes = require('./src/modules/doctors/doctor.routes');
const patientRoutes = require('./src/modules/patients/patient.routes');
const appointmentRoutes = require('./src/modules/appointments/appointment.routes');
const staffRoutes = require('./src/modules/staff/staff.routes');
const billingRoutes = require('./src/modules/billing/billing.routes');
const labRoutes = require('./src/modules/lab/lab.routes');
const pharmacyRoutes = require('./src/modules/pharmacy/pharmacy.routes');

function createServer(customOptions = {}) {
  // Ensure DB initialized
  getDatabase(customOptions.dbPath);

  const staticDir = path.join(__dirname, 'public');
  const app = new Router({ staticDir });

  // Request logger middleware
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.url}`);
    next();
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'UP',
      system: 'Modular Hospital Management System',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Mount Domain Modules
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/doctors', doctorRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/staff', staffRoutes);
  app.use('/api/billing', billingRoutes);
  app.use('/api/lab', labRoutes);
  app.use('/api/pharmacy', pharmacyRoutes);

  const server = http.createServer((req, res) => {
    app.handle(req, res).catch(err => {
      logger.error('Unhandled server error:', err);
      if (!res.writableEnded) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      }
    });
  });

  return { server, app };
}

// Start standalone server when executed directly
if (require.main === module) {
  const { server } = createServer();
  const PORT = config.port;
  const HOST = config.host;

  server.listen(PORT, HOST, () => {
    logger.info(`🏥 Modular Hospital Management System is running at: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    logger.info(`📚 System ready: Admin, Patients, Doctors, Appointments, Departments, Staff, Billing, and Auth modules active.`);
  });
}

module.exports = { createServer };

