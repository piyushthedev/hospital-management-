/**
 * SQLite Database Connection & Schema Initialization
 * Powered by Node.js native node:sqlite DatabaseSync
 */
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const config = require('./config');
const logger = require('./logger');
const { hashPassword } = require('./security');

let dbInstance = null;

function getDatabase(customPath = null) {
  if (dbInstance) {
    return dbInstance;
  }

  const targetPath = customPath || config.dbPath;

  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  logger.info(`Connecting to SQLite database at: ${targetPath}`);
  dbInstance = new DatabaseSync(targetPath);

  // Enable foreign keys, busy timeout, and WAL mode for reliability
  dbInstance.exec('PRAGMA foreign_keys = ON;');
  dbInstance.exec('PRAGMA busy_timeout = 5000;');
  if (targetPath !== ':memory:') {
    dbInstance.exec('PRAGMA journal_mode = WAL;');
  }

  initSchema(dbInstance);
  seedInitialData(dbInstance);

  return dbInstance;
}

function initSchema(db) {
  logger.info('Initializing database schema...');
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      avatar TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Departments table
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      head_doctor_id TEXT,
      head_doctor_name TEXT,
      floor TEXT,
      phone_extension TEXT,
      capacity INTEGER DEFAULT 20,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Doctors table
    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      department_id TEXT NOT NULL,
      department_name TEXT,
      specialization TEXT NOT NULL,
      license_number TEXT UNIQUE NOT NULL,
      qualification TEXT,
      experience_years INTEGER DEFAULT 0,
      consultation_fee REAL DEFAULT 50.0,
      availability_status TEXT DEFAULT 'available',
      schedule_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri',
      shift_hours TEXT DEFAULT '09:00 - 17:00',
      room_number TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Beds and Rooms table
    CREATE TABLE IF NOT EXISTS beds (
      id TEXT PRIMARY KEY,
      room_number TEXT NOT NULL,
      bed_number TEXT NOT NULL,
      department_id TEXT,
      department_name TEXT,
      ward_type TEXT NOT NULL,
      status TEXT DEFAULT 'available',
      daily_rate REAL DEFAULT 150.0,
      current_patient_id TEXT,
      current_patient_name TEXT,
      admitted_at TEXT
    );

    -- Patients table
    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      gender TEXT NOT NULL,
      blood_group TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      address TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      insurance_provider TEXT,
      insurance_policy_number TEXT,
      status TEXT DEFAULT 'outpatient',
      bed_id TEXT,
      allergies TEXT,
      chronic_conditions TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Patient Admissions
    CREATE TABLE IF NOT EXISTS patient_admissions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      bed_id TEXT NOT NULL,
      admission_date TEXT NOT NULL,
      discharge_date TEXT,
      reason TEXT,
      doctor_id TEXT,
      status TEXT DEFAULT 'admitted',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Medical Records table
    CREATE TABLE IF NOT EXISTS medical_records (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      doctor_id TEXT,
      doctor_name TEXT,
      appointment_id TEXT,
      record_type TEXT NOT NULL,
      diagnosis TEXT,
      prescription TEXT,
      symptoms TEXT,
      vitals TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Appointments table
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      department_id TEXT NOT NULL,
      department_name TEXT,
      appointment_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      reason TEXT,
      type TEXT DEFAULT 'general_checkup',
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      prescription_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- Staff table
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL,
      department_id TEXT,
      department_name TEXT,
      shift TEXT DEFAULT 'morning',
      status TEXT DEFAULT 'active',
      joining_date TEXT,
      salary REAL DEFAULT 0.0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Invoices table
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      appointment_id TEXT,
      issue_date TEXT NOT NULL,
      due_date TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0.0,
      tax_amount REAL NOT NULL DEFAULT 0.0,
      discount_amount REAL NOT NULL DEFAULT 0.0,
      total_amount REAL NOT NULL DEFAULT 0.0,
      paid_amount REAL NOT NULL DEFAULT 0.0,
      status TEXT DEFAULT 'unpaid',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Invoice Line Items table
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      description TEXT NOT NULL,
      item_type TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL
    );

    -- Payments table
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_method TEXT NOT NULL,
      reference_number TEXT,
      notes TEXT,
      payment_date TEXT NOT NULL,
      processed_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- System Audit Logs
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Hospital Settings
    CREATE TABLE IF NOT EXISTS hospital_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT
    );

    -- Laboratory Catalog Tests
    CREATE TABLE IF NOT EXISTS lab_tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      normal_range TEXT,
      sample_type TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Laboratory Orders & Diagnostic Results
    CREATE TABLE IF NOT EXISTS lab_orders (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      doctor_id TEXT,
      doctor_name TEXT,
      test_id TEXT NOT NULL,
      test_name TEXT NOT NULL,
      status TEXT DEFAULT 'ordered',
      result_value TEXT,
      normal_range TEXT,
      notes TEXT,
      ordered_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    -- Pharmacy & Medicine Inventory
    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      generic_name TEXT,
      category TEXT NOT NULL,
      dosage_form TEXT NOT NULL,
      unit_price REAL NOT NULL,
      stock_quantity INTEGER NOT NULL DEFAULT 0,
      reorder_level INTEGER NOT NULL DEFAULT 20,
      expiry_date TEXT,
      status TEXT DEFAULT 'in_stock',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Prescriptions
    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      doctor_id TEXT NOT NULL,
      doctor_name TEXT NOT NULL,
      appointment_id TEXT,
      diagnosis TEXT,
      status TEXT DEFAULT 'pending',
      dispensed_by TEXT,
      dispensed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Prescription Items
    CREATE TABLE IF NOT EXISTS prescription_items (
      id TEXT PRIMARY KEY,
      prescription_id TEXT NOT NULL,
      medicine_id TEXT NOT NULL,
      medicine_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      dispensed_quantity INTEGER DEFAULT 0
    );

    -- One-Time Password (OTP) Verification
    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      phone TEXT,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Biometric / Fingerprint Credentials
    CREATE TABLE IF NOT EXISTS biometric_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      credential_id TEXT UNIQUE NOT NULL,
      device_name TEXT DEFAULT 'Touch ID / Fingerprint Sensor',
      public_key TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);
}

function seedInitialData(db) {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const todayStr = new Date().toISOString().split('T')[0];

  if (userCount === 0) {
    logger.info('Seeding initial hospital core catalog...');
    const defaultPasswordHash = hashPassword('Admin123!');
    const doctorPasswordHash = hashPassword('Doctor123!');
    const staffPasswordHash = hashPassword('Staff123!');
    const patientPasswordHash = hashPassword('Patient123!');
    const accountantPasswordHash = hashPassword('Finance123!');

    // 1. Seed Users
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, phone, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);

  insertUser.run('USR-ADMIN', 'admin@hospital.org', defaultPasswordHash, 'Dr. Arthur Vance (Hospital Director)', 'admin', '+1 (555) 100-0001');
  insertUser.run('USR-DOC1', 'doctor.chen@hospital.org', doctorPasswordHash, 'Dr. Emily Chen, MD', 'doctor', '+1 (555) 100-0002');
  insertUser.run('USR-DOC2', 'doctor.marcus@hospital.org', doctorPasswordHash, 'Dr. Marcus Reynolds, MD', 'doctor', '+1 (555) 100-0003');
  insertUser.run('USR-DOC3', 'doctor.sarah@hospital.org', doctorPasswordHash, 'Dr. Sarah Jenkins, MD', 'doctor', '+1 (555) 100-0004');
  insertUser.run('USR-STAFF1', 'staff.nurse@hospital.org', staffPasswordHash, 'Nurse Clara Barton', 'staff', '+1 (555) 100-0005');
  insertUser.run('USR-STAFF2', 'reception@hospital.org', staffPasswordHash, 'James Wilson (Reception)', 'staff', '+1 (555) 100-0006');
  insertUser.run('USR-ACCT', 'accountant@hospital.org', accountantPasswordHash, 'Patricia Mills (Billing)', 'accountant', '+1 (555) 100-0007');
  insertUser.run('USR-PAT1', 'patient.doe@hospital.org', patientPasswordHash, 'Eleanor Vance', 'patient', '+1 (555) 200-0001');

  // 2. Seed Departments
  const insertDept = db.prepare(`
    INSERT INTO departments (id, name, code, description, head_doctor_id, head_doctor_name, floor, phone_extension, capacity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertDept.run('DEP-CARDIO', 'Cardiology', 'CARD', 'Comprehensive heart and cardiovascular disease treatment and surgery', 'DOC-CHEN', 'Dr. Emily Chen, MD', '3rd Floor - Wing A', 'Ext 301', 30);
  insertDept.run('DEP-NEURO', 'Neurology', 'NEUR', 'Advanced brain, spine and central nervous system disorders care', 'DOC-MARCUS', 'Dr. Marcus Reynolds, MD', '4th Floor - Wing B', 'Ext 401', 25);
  insertDept.run('DEP-PEDIA', 'Pediatrics', 'PEDI', 'Specialized medical care and wellness for infants, children and teens', 'DOC-SARAH', 'Dr. Sarah Jenkins, MD', '2nd Floor - Wing C', 'Ext 201', 35);
  insertDept.run('DEP-ORTHO', 'Orthopedics', 'ORTH', 'Bone, joint, ligament, and musculoskeletal reconstruction surgery', null, 'Dr. David Kim', '1st Floor - Wing B', 'Ext 105', 20);
  insertDept.run('DEP-EMERG', 'Emergency & Trauma', 'EMRG', '24/7 Level 1 Emergency care, trauma triage and rapid resuscitation', null, 'Dr. Robert Rivera', 'Ground Floor', 'Ext 911', 40);
  insertDept.run('DEP-GENMED', 'General Internal Medicine', 'GMED', 'Adult primary care, chronic disease management, and wellness', null, 'Dr. Laura Hayes', '1st Floor - Wing A', 'Ext 101', 30);

  // 3. Seed Doctors
  const insertDoctor = db.prepare(`
    INSERT INTO doctors (id, user_id, name, email, phone, department_id, department_name, specialization, license_number, qualification, experience_years, consultation_fee, availability_status, schedule_days, shift_hours, room_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertDoctor.run('DOC-CHEN', 'USR-DOC1', 'Dr. Emily Chen, MD', 'doctor.chen@hospital.org', '+1 (555) 100-0002', 'DEP-CARDIO', 'Cardiology', 'Interventional Cardiology', 'MED-LIC-88219', 'MD, FACC, Harvard Medical School', 14, 150.0, 'available', 'Mon,Tue,Wed,Thu,Fri', '08:00 - 16:00', 'Suite 302');
  insertDoctor.run('DOC-MARCUS', 'USR-DOC2', 'Dr. Marcus Reynolds, MD', 'doctor.marcus@hospital.org', '+1 (555) 100-0003', 'DEP-NEURO', 'Neurology', 'Cerebrovascular & Stroke Specialist', 'MED-LIC-44120', 'MD, Johns Hopkins University', 18, 175.0, 'available', 'Mon,Wed,Fri', '09:00 - 17:00', 'Suite 405');
  insertDoctor.run('DOC-SARAH', 'USR-DOC3', 'Dr. Sarah Jenkins, MD', 'doctor.sarah@hospital.org', '+1 (555) 100-0004', 'DEP-PEDIA', 'Pediatrics', 'Pediatric Intensive Care & Neonatology', 'MED-LIC-61902', 'MD, FAAP, Stanford University', 11, 120.0, 'in_consultation', 'Mon,Tue,Thu,Fri', '08:30 - 16:30', 'Suite 204');
  insertDoctor.run('DOC-KIM', null, 'Dr. David Kim, MD', 'david.kim@hospital.org', '+1 (555) 100-0010', 'DEP-ORTHO', 'Orthopedics', 'Joint Replacement & Sports Medicine', 'MED-LIC-32918', 'MD, Columbia University', 12, 160.0, 'available', 'Tue,Thu,Sat', '09:00 - 17:00', 'Suite 112');
  insertDoctor.run('DOC-RIVERA', null, 'Dr. Robert Rivera, MD', 'robert.rivera@hospital.org', '+1 (555) 100-0012', 'DEP-EMERG', 'Emergency & Trauma', 'Emergency Medicine & Acute Trauma Care', 'MED-LIC-99124', 'MD, FACEP, Johns Hopkins University', 16, 140.0, 'available', 'Mon,Tue,Wed,Thu,Sat', '07:00 - 15:00', 'Trauma Bay 1');
  insertDoctor.run('DOC-HAYES', null, 'Dr. Laura Hayes, MD', 'laura.hayes@hospital.org', '+1 (555) 100-0015', 'DEP-GENMED', 'General Internal Medicine', 'Internal Medicine & Preventive Care', 'MED-LIC-77401', 'MD, FACP, Yale School of Medicine', 15, 130.0, 'available', 'Mon,Tue,Wed,Thu,Fri', '08:30 - 16:30', 'Suite 101');
  insertDoctor.run('DOC-SHARMA', null, 'Dr. Priya Sharma, MD', 'priya.sharma@hospital.org', '+1 (555) 100-0018', 'DEP-CARDIO', 'Cardiology', 'Cardiac Electrophysiology & Arrhythmia', 'MED-LIC-55291', 'MD, FHRS, Oxford University', 13, 165.0, 'available', 'Tue,Wed,Fri,Sat', '09:00 - 17:00', 'Suite 305');

  // 4. Seed Beds & Rooms
  const insertBed = db.prepare(`
    INSERT INTO beds (id, room_number, bed_number, department_id, department_name, ward_type, status, daily_rate, current_patient_id, current_patient_name, admitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertBed.run('BED-ICU-101', 'ICU-1', 'Bed-A', 'DEP-CARDIO', 'Cardiology', 'ICU', 'occupied', 450.0, 'PAT-1001', 'Eleanor Vance', '2026-11-05 14:00:00');
  insertBed.run('BED-ICU-102', 'ICU-1', 'Bed-B', 'DEP-CARDIO', 'Cardiology', 'ICU', 'available', 450.0, null, null, null);
  insertBed.run('BED-GEN-201', 'Ward-2A', 'Bed-1', 'DEP-GENMED', 'General Internal Medicine', 'General', 'occupied', 150.0, 'PAT-1002', 'Robert Sterling', '2026-11-06 09:30:00');
  insertBed.run('BED-GEN-202', 'Ward-2A', 'Bed-2', 'DEP-GENMED', 'General Internal Medicine', 'General', 'available', 150.0, null, null, null);
  insertBed.run('BED-PVT-301', 'Suite-301', 'Bed-1', 'DEP-NEURO', 'Neurology', 'Private', 'available', 300.0, null, null, null);
  insertBed.run('BED-PED-401', 'Pedia-4', 'Bed-1', 'DEP-PEDIA', 'Pediatrics', 'Pediatrics', 'maintenance', 180.0, null, null, null);

  // 5. Seed Patients
  const insertPatient = db.prepare(`
    INSERT INTO patients (id, user_id, first_name, last_name, name, date_of_birth, gender, blood_group, phone, email, address, emergency_contact_name, emergency_contact_phone, insurance_provider, insurance_policy_number, status, bed_id, allergies, chronic_conditions)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPatient.run('PAT-1001', 'USR-PAT1', 'Eleanor', 'Vance', 'Eleanor Vance', '1982-04-14', 'Female', 'O+', '+1 (555) 200-0001', 'patient.doe@hospital.org', '124 Maple Street, Metro City', 'Thomas Vance (Spouse)', '+1 (555) 200-0099', 'Blue Cross Shield', 'BC-8891234-A', 'admitted', 'BED-ICU-101', 'Penicillin, Shellfish', 'Hypertension, Mild Asthma');
  insertPatient.run('PAT-1002', null, 'Robert', 'Sterling', 'Robert Sterling', '1965-09-22', 'Male', 'A+', '+1 (555) 200-0002', 'robert.sterling@example.com', '58 Pine Avenue, Metro City', 'Marian Sterling (Wife)', '+1 (555) 200-0088', 'Aetna Health Care', 'AET-771203', 'admitted', 'BED-GEN-201', 'Sulfa drugs', 'Type 2 Diabetes');
  insertPatient.run('PAT-1003', null, 'Sophia', 'Martinez', 'Sophia Martinez', '1995-11-03', 'Female', 'B+', '+1 (555) 200-0003', 'sophia.m@example.com', '91 Oak Boulevard, Metro City', 'Carlos Martinez (Father)', '+1 (555) 200-0077', 'UnitedHealthcare', 'UHC-456102', 'outpatient', null, 'None known', 'None');
  insertPatient.run('PAT-1004', null, 'Liam', 'O’Connor', 'Liam O’Connor', '2016-07-19', 'Male', 'AB+', '+1 (555) 200-0004', 'oconnor.family@example.com', '33 Elm Terrace, Metro City', 'Brigid O’Connor (Mother)', '+1 (555) 200-0066', 'Cigna Global', 'CGN-99821', 'outpatient', null, 'Peanuts', 'Pediatric Allergic Rhinitis');

  // 6. Seed Patient Admissions
  const insertAdmission = db.prepare(`
    INSERT INTO patient_admissions (id, patient_id, bed_id, admission_date, reason, doctor_id, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertAdmission.run('ADM-101', 'PAT-1001', 'BED-ICU-101', '2026-11-05 14:00:00', 'Acute Coronary Syndrome observation', 'DOC-CHEN', 'admitted', 'Continuous telemetry monitoring required.');
  insertAdmission.run('ADM-102', 'PAT-1002', 'BED-GEN-201', '2026-11-06 09:30:00', 'Diabetic ketoacidosis stabilization', 'DOC-MARCUS', 'admitted', 'IV insulin protocol active.');

  // 7. Seed Medical Records
  const insertRecord = db.prepare(`
    INSERT INTO medical_records (id, patient_id, doctor_id, doctor_name, appointment_id, record_type, diagnosis, prescription, symptoms, vitals, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRecord.run('REC-101', 'PAT-1001', 'DOC-CHEN', 'Dr. Emily Chen, MD', null, 'consultation', 'Ischemic Heart Disease with Mild Angina', 'Atorvastatin 40mg once daily; Metoprolol 25mg twice daily', 'Chest tightness on exertion, shortness of breath', JSON.stringify({ bp: '138/88 mmHg', hr: '76 bpm', temp: '98.6 F', spo2: '98%' }), 'Echocardiogram scheduled. Advised low-sodium cardiac diet.');
  insertRecord.run('REC-102', 'PAT-1002', 'DOC-MARCUS', 'Dr. Marcus Reynolds, MD', null, 'diagnosis', 'Type 2 Diabetes Mellitus with Peripheral Neuropathy', 'Metformin 1000mg twice daily; Gabapentin 300mg at bedtime', 'Numbness and tingling in feet bilaterally', JSON.stringify({ bp: '124/80 mmHg', hr: '72 bpm', temp: '98.4 F', spo2: '99%' }), 'Blood sugar logs to be reviewed weekly.');

  // 8. Seed Appointments
  const insertApt = db.prepare(`
    INSERT INTO appointments (id, patient_id, patient_name, doctor_id, doctor_name, department_id, department_name, appointment_date, time_slot, reason, type, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const todayStr = new Date().toISOString().split('T')[0];
  insertApt.run('APT-1001', 'PAT-1001', 'Eleanor Vance', 'DOC-CHEN', 'Dr. Emily Chen, MD', 'DEP-CARDIO', 'Cardiology', todayStr, '10:00 AM - 10:30 AM', 'Cardiac follow-up & ECG evaluation', 'follow_up', 'confirmed', 'Patient currently in ICU Bed A');
  insertApt.run('APT-1002', 'PAT-1003', 'Sophia Martinez', 'DOC-MARCUS', 'Dr. Marcus Reynolds, MD', 'DEP-NEURO', 'Neurology', todayStr, '11:30 AM - 12:00 PM', 'Persistent migraine headaches and visual aura', 'specialist_consultation', 'scheduled', 'First-time consultation');
  insertApt.run('APT-1003', 'PAT-1004', 'Liam O’Connor', 'DOC-SARAH', 'Dr. Sarah Jenkins, MD', 'DEP-PEDIA', 'Pediatrics', todayStr, '02:00 PM - 02:30 PM', 'Routine pediatric health check & vaccination', 'general_checkup', 'in_progress', 'Parent present in clinic');

  // 9. Seed Staff
  const insertStaff = db.prepare(`
    INSERT INTO staff (id, user_id, name, email, phone, role, department_id, department_name, shift, status, joining_date, salary)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertStaff.run('STF-101', 'USR-STAFF1', 'Nurse Clara Barton', 'staff.nurse@hospital.org', '+1 (555) 100-0005', 'nurse', 'DEP-CARDIO', 'Cardiology', 'morning', 'active', '2023-01-15', 72000.0);
  insertStaff.run('STF-102', 'USR-STAFF2', 'James Wilson', 'reception@hospital.org', '+1 (555) 100-0006', 'receptionist', 'DEP-EMERG', 'Emergency & Trauma', 'morning', 'active', '2024-03-01', 48000.0);
  insertStaff.run('STF-103', 'USR-ACCT', 'Patricia Mills', 'accountant@hospital.org', '+1 (555) 100-0007', 'accountant', null, 'Administration', 'morning', 'active', '2022-08-10', 65000.0);
  insertStaff.run('STF-104', null, 'Michael Chang', 'michael.chang@hospital.org', '+1 (555) 100-0020', 'pharmacist', null, 'Pharmacy Services', 'rotating', 'active', '2023-06-01', 88000.0);
  insertStaff.run('STF-105', null, 'Elena Rostova', 'elena.rostova@hospital.org', '+1 (555) 100-0021', 'lab_technician', null, 'Pathology & Lab', 'evening', 'active', '2023-11-15', 58000.0);

  // 10. Seed Invoices & Invoice Items
  const insertInv = db.prepare(`
    INSERT INTO invoices (id, patient_id, patient_name, appointment_id, issue_date, due_date, subtotal, tax_amount, discount_amount, total_amount, paid_amount, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertInv.run('INV-1001', 'PAT-1001', 'Eleanor Vance', 'APT-1001', todayStr, todayStr, 600.0, 30.0, 0.0, 630.0, 630.0, 'paid', 'Covered partly by Blue Cross Shield');
  insertInv.run('INV-1002', 'PAT-1002', 'Robert Sterling', null, todayStr, todayStr, 350.0, 17.5, 50.0, 317.5, 150.0, 'partially_paid', 'Outstanding balance due upon discharge');
  insertInv.run('INV-1003', 'PAT-1003', 'Sophia Martinez', 'APT-1002', todayStr, todayStr, 175.0, 8.75, 0.0, 183.75, 0.0, 'unpaid', 'Neurology specialist consultation fee');

  const insertItem = db.prepare(`
    INSERT INTO invoice_items (id, invoice_id, description, item_type, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertItem.run('ITM-1', 'INV-1001', 'Cardiology Comprehensive Consultation', 'consultation', 1, 150.0, 150.0);
  insertItem.run('ITM-2', 'INV-1001', 'ICU Specialized Ward Bed (1 Day)', 'room_charge', 1, 450.0, 450.0);
  insertItem.run('ITM-3', 'INV-1002', 'General Ward Bed (2 Days)', 'room_charge', 2, 150.0, 300.0);
  insertItem.run('ITM-4', 'INV-1002', 'Blood Glucose Profile & HbA1c Lab Panel', 'laboratory', 1, 50.0, 50.0);
  insertItem.run('ITM-5', 'INV-1003', 'Neurology Specialist Consultation', 'consultation', 1, 175.0, 175.0);

  // 11. Seed Payments
  const insertPayment = db.prepare(`
    INSERT INTO payments (id, invoice_id, amount, payment_method, reference_number, notes, payment_date, processed_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPayment.run('PAY-1001', 'INV-1001', 630.0, 'insurance', 'INS-CLAIM-7729', 'Processed via Blue Cross portal', todayStr, 'Patricia Mills');
  insertPayment.run('PAY-1002', 'INV-1002', 150.0, 'credit_card', 'TXN-CARD-4491', 'Initial co-pay on admission', todayStr, 'James Wilson');

  // 12. Seed Hospital Settings
  const insertSetting = db.prepare(`
    INSERT OR REPLACE INTO hospital_settings (key, value, description)
    VALUES (?, ?, ?)
  `);

  insertSetting.run('hospital_name', config.hospital.name, 'Official Hospital Organization Name');
  insertSetting.run('hospital_code', config.hospital.code, 'Internal Identification Code');
  insertSetting.run('hospital_phone', config.hospital.phone, 'Main Inquiries Phone');
  insertSetting.run('emergency_hotline', config.hospital.emergencyHotline, 'Emergency Triage & Ambulance Hotline');
  insertSetting.run('hospital_email', config.hospital.email, 'Official Contact Email');
  insertSetting.run('hospital_address', config.hospital.address, 'Physical Campus Location');
  insertSetting.run('currency_symbol', config.hospital.currencySymbol, 'Billing Currency Symbol');
  insertSetting.run('tax_rate_percent', '5.0', 'Standard Service Tax Percentage');
  insertSetting.run('visitor_hours', '09:00 AM - 08:00 PM', 'General Ward Visiting Hours');

  // 13. Seed Initial Audit Log
  const insertLog = db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, user_role, action, module, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLog.run('LOG-1', 'USR-ADMIN', 'Dr. Arthur Vance', 'admin', 'SYSTEM_INITIALIZATION', 'admin', 'Hospital database schema initialized and initial catalog seeded.', '127.0.0.1');
  }

  // Ensure Core Specialist Doctors are always seeded
  const insertExtraDoctor = db.prepare(`
    INSERT OR IGNORE INTO doctors (id, user_id, name, email, phone, department_id, department_name, specialization, license_number, qualification, experience_years, consultation_fee, availability_status, schedule_days, shift_hours, room_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertExtraDoctor.run('DOC-CHEN', 'USR-DOC1', 'Dr. Emily Chen, MD', 'doctor.chen@hospital.org', '+1 (555) 100-0002', 'DEP-CARDIO', 'Cardiology', 'Interventional Cardiology', 'MED-LIC-88219', 'MD, FACC, Harvard Medical School', 14, 150.0, 'available', 'Mon,Tue,Wed,Thu,Fri', '08:00 - 16:00', 'Suite 302');
  insertExtraDoctor.run('DOC-MARCUS', 'USR-DOC2', 'Dr. Marcus Reynolds, MD', 'doctor.marcus@hospital.org', '+1 (555) 100-0003', 'DEP-NEURO', 'Neurology', 'Cerebrovascular & Stroke Specialist', 'MED-LIC-44120', 'MD, Johns Hopkins University', 18, 175.0, 'available', 'Mon,Wed,Fri', '09:00 - 17:00', 'Suite 405');
  insertExtraDoctor.run('DOC-SARAH', 'USR-DOC3', 'Dr. Sarah Jenkins, MD', 'doctor.sarah@hospital.org', '+1 (555) 100-0004', 'DEP-PEDIA', 'Pediatrics', 'Pediatric Intensive Care & Neonatology', 'MED-LIC-61902', 'MD, FAAP, Stanford University', 11, 120.0, 'in_consultation', 'Mon,Tue,Thu,Fri', '08:30 - 16:30', 'Suite 204');
  insertExtraDoctor.run('DOC-KIM', null, 'Dr. David Kim, MD', 'david.kim@hospital.org', '+1 (555) 100-0010', 'DEP-ORTHO', 'Orthopedics', 'Joint Replacement & Sports Medicine', 'MED-LIC-32918', 'MD, Columbia University', 12, 160.0, 'available', 'Tue,Thu,Sat', '09:00 - 17:00', 'Suite 112');
  insertExtraDoctor.run('DOC-RIVERA', null, 'Dr. Robert Rivera, MD', 'robert.rivera@hospital.org', '+1 (555) 100-0012', 'DEP-EMERG', 'Emergency & Trauma', 'Emergency Medicine & Acute Trauma Care', 'MED-LIC-99124', 'MD, FACEP, Johns Hopkins University', 16, 140.0, 'available', 'Mon,Tue,Wed,Thu,Sat', '07:00 - 15:00', 'Trauma Bay 1');
  insertExtraDoctor.run('DOC-HAYES', null, 'Dr. Laura Hayes, MD', 'laura.hayes@hospital.org', '+1 (555) 100-0015', 'DEP-GENMED', 'General Internal Medicine', 'Internal Medicine & Preventive Care', 'MED-LIC-77401', 'MD, FACP, Yale School of Medicine', 15, 130.0, 'available', 'Mon,Tue,Wed,Thu,Fri', '08:30 - 16:30', 'Suite 101');
  insertExtraDoctor.run('DOC-SHARMA', null, 'Dr. Priya Sharma, MD', 'priya.sharma@hospital.org', '+1 (555) 100-0018', 'DEP-CARDIO', 'Cardiology', 'Cardiac Electrophysiology & Arrhythmia', 'MED-LIC-55291', 'MD, FHRS, Oxford University', 13, 165.0, 'available', 'Tue,Wed,Fri,Sat', '09:00 - 17:00', 'Suite 305');

  // Ensure Laboratory Catalog Tests are always seeded with baseline catalog
  const insertLabTest = db.prepare(`
    INSERT OR IGNORE INTO lab_tests (id, name, code, category, price, normal_range, sample_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertLabTest.run('LAB-CBC', 'Complete Blood Count (CBC)', 'CBC', 'Hematology', 45.0, 'WBC: 4.5-11.0 K/uL, RBC: 4.3-5.9 M/uL, Hb: 13.5-17.5 g/dL', 'Blood');
  insertLabTest.run('LAB-LIPID', 'Comprehensive Lipid Panel', 'LIPID', 'Biochemistry', 65.0, 'Total Chol < 200 mg/dL, HDL > 40 mg/dL, LDL < 100 mg/dL', 'Serum');
  insertLabTest.run('LAB-HBA1C', 'Hemoglobin A1c Glycated Panel', 'HBA1C', 'Endocrine', 50.0, 'Non-diabetic: < 5.7%, Pre-diabetic: 5.7-6.4%', 'Blood');
  insertLabTest.run('LAB-CMP', 'Comprehensive Metabolic Panel (CMP)', 'CMP', 'Biochemistry', 75.0, 'Glucose: 70-99 mg/dL, BUN: 7-20 mg/dL, Cr: 0.6-1.2 mg/dL', 'Serum');
  insertLabTest.run('LAB-ECG', '12-Lead Diagnostic Electrocardiogram', 'ECG-12', 'Cardiology', 120.0, 'Normal Sinus Rhythm (60-100 bpm)', 'Imaging');

  const insertLabOrder = db.prepare(`
    INSERT OR IGNORE INTO lab_orders (id, patient_id, patient_name, doctor_id, doctor_name, test_id, test_name, status, result_value, normal_range, notes, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLabOrder.run('LBO-101', 'PAT-1001', 'Eleanor Vance', 'DOC-CHEN', 'Dr. Emily Chen, MD', 'LAB-LIPID', 'Comprehensive Lipid Panel', 'completed', 'Total Chol: 215 mg/dL (Borderline High), HDL: 42 mg/dL, LDL: 135 mg/dL', 'Total Chol < 200, LDL < 100', 'Elevated LDL noted. Dietary modification recommended.', todayStr);
  insertLabOrder.run('LBO-102', 'PAT-1002', 'Robert Sterling', 'DOC-MARCUS', 'Dr. Marcus Reynolds, MD', 'LAB-HBA1C', 'Hemoglobin A1c Glycated Panel', 'completed', 'HbA1c: 7.8% (Elevated)', '< 5.7%', 'Consistent with Type 2 Diabetes; continue oral hypoglycemics.', todayStr);
  insertLabOrder.run('LBO-103', 'PAT-1003', 'Sophia Martinez', 'DOC-MARCUS', 'Dr. Marcus Reynolds, MD', 'LAB-CMP', 'Comprehensive Metabolic Panel (CMP)', 'ordered', null, 'Glucose: 70-99 mg/dL', 'Routine baseline workup before initiating therapy', null);

  // Ensure Pharmacy & Medicines are always seeded with baseline catalog
  const insertMedicine = db.prepare(`
    INSERT OR IGNORE INTO medicines (id, name, generic_name, category, dosage_form, unit_price, stock_quantity, reorder_level, expiry_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertMedicine.run('MED-ATOR', 'Lipitor 20mg', 'Atorvastatin Calcium', 'Cardiovascular', 'Tablet', 1.25, 450, 50, '2028-05-30', 'in_stock');
  insertMedicine.run('MED-METF', 'Glucophage 500mg', 'Metformin Hydrochloride', 'Endocrine', 'Tablet', 0.85, 620, 60, '2027-12-15', 'in_stock');
  insertMedicine.run('MED-AMOX', 'Amoxil 500mg', 'Amoxicillin Trihydrate', 'Antibiotics', 'Capsule', 1.50, 320, 40, '2027-08-20', 'in_stock');
  insertMedicine.run('MED-LISN', 'Prinivil 10mg', 'Lisinopril', 'Cardiovascular', 'Tablet', 0.95, 280, 50, '2028-03-10', 'in_stock');
  insertMedicine.run('MED-OMEP', 'Prilosec 20mg', 'Omeprazole Delayed-Release', 'Gastrointestinal', 'Capsule', 1.10, 18, 30, '2027-10-31', 'low_stock');
  insertMedicine.run('MED-PARA', 'Tylenol Extra Strength 500mg', 'Acetaminophen / Paracetamol', 'Analgesics', 'Tablet', 0.40, 850, 100, '2028-11-30', 'in_stock');

  const insertPrescription = db.prepare(`
    INSERT OR IGNORE INTO prescriptions (id, patient_id, patient_name, doctor_id, doctor_name, appointment_id, diagnosis, status, dispensed_by, dispensed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPrescription.run('RX-1001', 'PAT-1001', 'Eleanor Vance', 'DOC-CHEN', 'Dr. Emily Chen, MD', 'APT-1001', 'Ischemic Heart Disease and Dyslipidemia', 'dispensed', 'Michael Chang (Pharmacist)', todayStr);
  insertPrescription.run('RX-1002', 'PAT-1002', 'Robert Sterling', 'DOC-MARCUS', 'Dr. Marcus Reynolds, MD', null, 'Type 2 Diabetes Glycemic Control', 'pending', null, null);

  const insertRxItem = db.prepare(`
    INSERT OR IGNORE INTO prescription_items (id, prescription_id, medicine_id, medicine_name, dosage, frequency, duration_days, quantity, unit_price, dispensed_quantity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertRxItem.run('RXI-1', 'RX-1001', 'MED-ATOR', 'Lipitor 20mg (Atorvastatin)', '20mg', 'Once daily at bedtime', 30, 30, 1.25, 30);
  insertRxItem.run('RXI-2', 'RX-1001', 'MED-LISN', 'Prinivil 10mg (Lisinopril)', '10mg', 'Once daily in the morning', 30, 30, 0.95, 30);
  insertRxItem.run('RXI-3', 'RX-1002', 'MED-METF', 'Glucophage 500mg (Metformin)', '500mg', 'Twice daily with meals', 30, 60, 0.85, 0);

  // Seed default biometric credentials for demo personas
  const insertBiometric = db.prepare(`
    INSERT OR IGNORE INTO biometric_credentials (id, user_id, credential_id, device_name)
    VALUES (?, ?, ?, ?)
  `);

  insertBiometric.run('BIO-1', 'USR-ADMIN', 'fp-cred-admin', 'Apple Touch ID / MacBook Pro');
  insertBiometric.run('BIO-2', 'USR-DOC1', 'fp-cred-doc1', 'Hospital Workstation Biometric Reader');
  insertBiometric.run('BIO-3', 'USR-STAFF1', 'fp-cred-staff1', 'Nurse Station Touch Sensor');
  insertBiometric.run('BIO-4', 'USR-ACCT', 'fp-cred-acct', 'Financial Terminal Biometric');
  insertBiometric.run('BIO-5', 'USR-PAT1', 'fp-cred-pat1', 'Patient Mobile Device Biometric');

  logger.info('Hospital initial data seeding completed successfully!');
}

function closeDatabase() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    logger.info('Database connection closed.');
  }
}

module.exports = {
  getDatabase,
  closeDatabase
};
