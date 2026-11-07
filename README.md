# 🏥 Metropolitan General - Modular Hospital Management System (HMS)

A modular, enterprise-grade Hospital Management System built with a decoupled architecture. The system supports full hospital administration, patient admissions & health records, doctor scheduling, appointment management with conflict detection, department operations, staff shift rosters, itemized billing & claim payments, diagnostic laboratory & pathology, medication formulary & pharmacy, and role-based authentication (RBAC).

Built on **Node.js** with zero external runtime dependencies using native `node:sqlite`, `node:crypto`, `node:http`, and `node:test`.

**Design Standard**: Engineered to match the **Tubik Studio / Design4Users HealthTech** UI/UX design standard ([Design4Users Healthcare & HealthTech UI/UX](https://design4users.com/ui-ux-design-healthcare-healthtech/)), featuring human-centric typography (`Plus Jakarta Sans`), soft pastel gradients, rounded elevation cards (`20px-28px`), live telemetry widgets, ECG pulse waves, SVG sparklines, bed matrix status chips, glassmorphic modals, and an instant one-click demo role switcher.

---

## 🌟 Key Highlights & Modular Capabilities

### 1. 👑 Hospital Administration & Facilities
* **Real-time Telemetry Dashboard**: Live metrics for total registered patients, admitted inpatients, active doctors, bed occupancy rate (%), daily scheduled visits, and cleared hospital revenue.
* **Bed & Ward Matrix Management**: Visual grid tracking bed availability across General, ICU, Pediatrics, Maternity, and Private Luxury Suites. Includes one-click maintenance state toggles and daily rate management.
* **Hospital Organizational Settings**: Configurable hospital naming, emergency hotline (`911 / (555) 911-0000`), visiting hours, and campus locations.
* **System Audit Trail**: Complete immutable event logging capturing user identity, role, timestamp, IP address, affected module, and specific operational action.
* **User & Role Administration**: Manage system accounts and instantly toggle user status (activate / deactivate).

### 2. 👥 Patient Management & Clinical Health Records
* **Patient Registration & Profiling**: Master Patient Index (MPI) with auto-generated Medical Record Numbers (`PAT-XXXX`), demographics, blood group, emergency contacts, insurance policies, allergies, and chronic conditions.
* **Admissions & Discharges**: Seamless inpatient admission to available beds with automated status sync (`available` ➔ `occupied`) and clinical discharge notes.
* **Electronic Medical Records (EMR)**: Chronological clinical consultation timeline tracking chief complaints, diagnoses, prescriptions (Rx), and vitals (Blood Pressure, Heart Rate, SpO2, Temperature).

### 3. 🩺 Doctor & Specialist Management
* **Physician Directory**: Department associations, license numbers, qualifications, years of experience, and per-visit consultation fees.
* **Duty Status Switcher**: Real-time state toggling (`available`, `in_consultation`, `on_leave`, `off_duty`).
* **Schedule & Availability Calendar**: Time-slot breakdown showing open and booked patient appointments.

### 4. 📅 Appointments & Conflict Prevention
* **Smart Booking Engine**: Prevents double-booking a physician in the same time slot.
* **Clinical Lifecycle Transitions**: `scheduled` ➔ `confirmed` ➔ `in_progress` ➔ `completed` (or `cancelled` / `no_show`).
* **Automated Billing Integration**: Concluding an appointment (`completed`) automatically publishes an event to generate a consultation invoice draft.

### 5. 🏥 Departments & Clinical Units
* **Specialty Directory**: Cardiology, Neurology, Pediatrics, Orthopedics, Emergency & Trauma, and General Internal Medicine.
* **Department Heads & Capacity**: Links lead doctors, floor wings, internal phone extensions, and ward bed allocations.

### 6. 💼 Staff Management & Shift Rosters
* **Healthcare Cadres**: Nurses, Receptionists, Pharmacists, Lab Technicians, Accountants, and Administrative Assistants.
* **Duty Shift Roster**: Real-time breakdown of staff on duty for Morning (07:00–15:00), Evening (15:00–23:00), Night (23:00–07:00), and Rotating shifts.

### 7. 🔬 Diagnostic Laboratory & Pathology
* **Diagnostic Test Catalog**: Standard panels across Hematology, Biochemistry, Cardiology, Endocrine, and Microbiology with reference normal ranges and specimen types.
* **Specimen Tracking Lifecycle**: `ordered` ➔ `sample_collected` ➔ `in_analysis` ➔ `completed`.
* **Clinical Diagnostic Reports**: Detailed quantitative findings, physician interpretation notes, and electronic verification.

### 8. 💊 Pharmacy & Medication Formulary
* **Drug Formulary & Inventory**: Commercial brand and generic classification, dosage forms (tablets, capsules, syrups, IVs), and automated low-stock and out-of-stock thresholds.
* **Digital Prescriptions**: Structured physician prescriptions with dosage, frequency, and treatment duration.
* **Automated Dispensation**: Instant validation of inventory stock, real-time deduction upon dispensing, and pharmacist audit trail.

### 9. 💳 Billing, Itemized Invoices & Payments
* **Comprehensive Invoicing**: Multi-category billable line items (`consultation`, `procedure`, `laboratory`, `pharmacy`, `room_charge`).
* **Automated Calculations**: Subtotal, percentage-based discounts, hospital tax rates, and final balance calculations.
* **Payment Processing**: Record partial or full payments via Credit Card, Cash, Insurance Claim, or Bank Transfer.
* **Printable Invoice Receipts**: Clean, formatted hospital receipt layout with printable breakdown.

### 10. 🔐 Authentication, OTP 2FA & Biometric Fingerprint Security
* **Multi-Factor Authentication (MFA)**:
  * **Traditional Password Authentication**: Salted key derivation (`crypto.scryptSync`) and HMAC-SHA256 cryptographically signed JWT tokens.
  * **One-Time Password (OTP) 2FA**: 6-digit cryptographic security codes with 5-minute expirations, phone number masking, and live in-app SMS/Email dispatch simulator.
  * **Biometric Fingerprint / Touch ID**: Hardware WebAuthn sensor integration and interactive animated fingerprint scanner for instant biometric login without typing credentials.
* **User Account Creation & Self-Registration**:
  * **Public Self-Registration**: New patients, nurses, and doctors can create authenticated accounts from the login screen.
  * **Administrative User Provisioning**: Admins can register system users with explicit roles (`admin`, `doctor`, `staff`, `accountant`, `patient`), phone numbers, and auto-enrolled biometric credentials.
* **Strict RBAC Guard Rails**:
  * `admin`: Complete administrative privilege across all settings, users, and clinical modules.
  * `doctor`: Manage assigned appointments, patient medical charts, clinical vitals, laboratory orders, and prescriptions.
  * `staff`: Patient registration, bed admissions/discharges, appointment triage, laboratory sample updates, and pharmacy dispensation.
  * `accountant`: Financial invoices, payment recordings, and revenue analytics.
  * `patient`: View personal medical history, scheduled visits, diagnostic results, and outstanding bills.
* **One-Click Demo Switcher**: Instant topbar switcher to test the UI under each persona.

---

## 🏗️ Architecture & Module Organization

The codebase is structured around strictly isolated domain modules communicating via an in-memory Event Bus (`src/core/event-bus.js`):

```
hospital-management-system/
├── src/
│   ├── core/                        # Core infrastructural foundation
│   │   ├── config.js                # App environment configuration
│   │   ├── database.js              # SQLite connection, schema & initial seeding
│   │   ├── event-bus.js             # Inter-module decoupled pub/sub event bus
│   │   ├── logger.js                # Structured logging utility
│   │   ├── router.js                # Custom HTTP routing & middleware engine
│   │   └── security.js              # Crypto password hashing, tokens & IDs
│   │
│   └── modules/                     # Decoupled Domain Modules
│       ├── admin/                   # Admin overview, beds, settings, audit logs
│       │   ├── admin.controller.js
│       │   ├── admin.routes.js
│       │   └── admin.service.js
│       ├── appointments/            # Scheduling & appointment lifecycles
│       │   ├── appointment.controller.js
│       │   ├── appointment.routes.js
│       │   └── appointment.service.js
│       ├── auth/                    # RBAC, login, registration, JWT middleware
│       │   ├── auth.controller.js
│       │   ├── auth.middleware.js
│       │   ├── auth.routes.js
│       │   └── auth.service.js
│       ├── billing/                 # Invoicing, line items, claims & payments
│       │   ├── billing.controller.js
│       │   ├── billing.routes.js
│       │   └── billing.service.js
│       ├── departments/             # Specialty clinical departments
│       │   ├── department.controller.js
│       │   ├── department.routes.js
│       │   └── department.service.js
│       ├── doctors/                 # Physician directory & availability
│       │   ├── doctor.controller.js
│       │   ├── doctor.routes.js
│       │   └── doctor.service.js
│       ├── lab/                     # Diagnostic catalog & laboratory orders
│       │   ├── lab.controller.js
│       │   ├── lab.routes.js
│       │   └── lab.service.js
│       ├── patients/                # Medical records, admissions & discharges
│       │   ├── patient.controller.js
│       │   ├── patient.routes.js
│       │   └── patient.service.js
│       ├── pharmacy/                # Medication inventory, prescriptions & dispensation
│       │   ├── pharmacy.controller.js
│       │   ├── pharmacy.routes.js
│       │   └── pharmacy.service.js
│       └── staff/                   # Staff directory & duty shift roster
│           ├── staff.controller.js
│           ├── staff.routes.js
│           └── staff.service.js
│
├── public/                          # Frontend Web Dashboard (SPA)
│   ├── css/
│   │   └── styles.css               # Tubik HealthTech design system & responsive layout
│   ├── js/
│   │   ├── api.js                   # Client API connector with auth interceptor
│   │   ├── app.js                   # UI navigation & modal management
│   │   └── views/                   # Modular UI views
│   │       ├── admin.view.js
│   │       ├── appointments.view.js
│   │       ├── billing.view.js
│   │       ├── dashboard.view.js
│   │       ├── departments.view.js
│   │       ├── doctors.view.js
│   │       ├── lab.view.js
│   │       ├── login.view.js
│   │       ├── patients.view.js
│   │       ├── pharmacy.view.js
│   │       └── staff.view.js
│   └── index.html                   # HTML entrypoint
│
├── tests/                           # Native Node.js Test Suite (node:test)
│   ├── admin.test.js
│   ├── appointments.test.js
│   ├── auth.test.js
│   ├── billing.test.js
│   ├── departments.test.js
│   ├── doctors.test.js
│   ├── lab.test.js
│   ├── patients.test.js
│   ├── pharmacy.test.js
│   └── staff.test.js
│
├── data/                            # Persistent SQLite database storage
│   └── hospital.db
├── package.json
└── server.js                        # HTTP server entrypoint
```

---

## 🎭 Pre-Seeded Demo Credentials

The database is seeded out-of-the-box with realistic sample records and credentials for each role:

| Role | User Persona | Email Address | Password |
| :--- | :--- | :--- | :--- |
| **Admin** | Dr. Arthur Vance (Hospital Director) | `admin@hospital.org` | `Admin123!` |
| **Doctor** | Dr. Emily Chen, MD (Cardiology) | `doctor.chen@hospital.org` | `Doctor123!` |
| **Staff / Nurse** | Clara Barton (Clinical Nurse) | `staff.nurse@hospital.org` | `Staff123!` |
| **Accountant** | Patricia Mills (Financial Officer) | `accountant@hospital.org` | `Finance123!` |
| **Patient** | Eleanor Vance (Inpatient) | `patient.doe@hospital.org` | `Patient123!` |

*(Note: In the web interface, you can also use the one-click **Persona Switcher** in the top header to instantly switch between these accounts without retyping passwords.)*

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** v20+ or v22+ (v24 recommended for native `node:sqlite`)
* Zero external package installations required!

### 1. Start the Server
```bash
npm start
```
Or directly:
```bash
node server.js
```
The server will initialize the SQLite database, seed sample catalog records, and listen on:
👉 **`http://localhost:3000`**

### 2. Run the Test Suite
The automated test suite verifies all 10 modules and core security systems using Node's native test runner:
```bash
npm test
```
All **47 tests** across 10 test suites execute and pass in under 850ms.

---

## 📡 REST API Reference

All protected endpoints require an `Authorization: Bearer <token>` header obtained from `/api/auth/login`.

### Authentication & Security
* `POST /api/auth/login` — Sign in with email & password
* `POST /api/auth/register` — Public self-registration (Patient, Staff, Doctor)
* `POST /api/auth/otp/send` — Generate and dispatch 6-digit OTP code to registered email/phone
* `POST /api/auth/otp/verify` — Validate OTP code and authenticate session
* `POST /api/auth/biometric/challenge` — Generate cryptographic challenge for WebAuthn passkey
* `POST /api/auth/biometric/login` — Authenticate via Touch ID / Fingerprint sensor
* `POST /api/auth/biometric/register` — Enroll device biometric credential *(Authenticated)*
* `GET /api/auth/me` — Retrieve current authenticated user profile
* `PUT /api/auth/profile` — Update account profile
* `POST /api/auth/change-password` — Change password

### Administration & Facilities
* `GET /api/admin/overview` — Get aggregated hospital KPI metrics & recent activity
* `GET /api/admin/settings` — Get hospital configuration parameters
* `PUT /api/admin/settings` — Update hospital configuration parameters
* `GET /api/admin/beds` — List all beds with ward filters and occupancy
* `POST /api/admin/beds` — Create a new hospital bed
* `PUT /api/admin/beds/:id` — Update bed status (`available`, `occupied`, `maintenance`)
* `GET /api/admin/users` — List all system user accounts
* `POST /api/admin/users` — Provision new system user with role assignment *(Admin)*
* `PUT /api/admin/users/:id/status` — Toggle user account active status
* `GET /api/admin/audit-logs` — Retrieve system security audit log

### Patients
* `GET /api/patients` — List patients with search (`name`, `MRN`, `phone`) & status filters
* `GET /api/patients/:id` — Full patient record with medical history, admissions, and bills
* `POST /api/patients` — Register new patient
* `PUT /api/patients/:id` — Update patient demographics & insurance
* `POST /api/patients/:id/admit` — Admit patient to an available bed
* `POST /api/patients/:id/discharge` — Discharge patient from ward
* `POST /api/patients/:id/records` — Add clinical consultation notes, prescriptions, and vitals

### Doctors
* `GET /api/doctors` — List doctors with department & availability filters
* `GET /api/doctors/:id` — Doctor profile & upcoming appointment history
* `GET /api/doctors/:id/schedule` — Daily schedule with open and booked slots
* `POST /api/doctors` — Register new physician profile *(Admin)*
* `PUT /api/doctors/:id` — Update physician profile
* `PUT /api/doctors/:id/availability` — Update status (`available`, `in_consultation`, `on_leave`, `off_duty`)

### Appointments
* `GET /api/appointments` — List appointments with date, doctor, and status filters
* `POST /api/appointments` — Book new appointment (includes conflict detection)
* `PUT /api/appointments/:id/status` — Update status (`confirmed`, `in_progress`, `completed`, `cancelled`)
* `PUT /api/appointments/:id/reschedule` — Reschedule to a different date & time slot
* `DELETE /api/appointments/:id` — Cancel an appointment

### Departments
* `GET /api/departments` — List departments with doctor, staff, and bed counts
* `GET /api/departments/:id` — Department detail with assigned personnel
* `POST /api/departments` — Create new department *(Admin)*
* `PUT /api/departments/:id` — Update department details *(Admin)*
* `DELETE /api/departments/:id` — Remove department *(Admin)*

### Staff
* `GET /api/staff` — List staff with role & shift filters
* `GET /api/staff/roster` — Duty shift roster (Morning, Evening, Night, Rotating)
* `GET /api/staff/:id` — Staff member profile
* `POST /api/staff` — Register staff member *(Admin)*
* `PUT /api/staff/:id` — Update staff member *(Admin)*

### Laboratory & Pathology
* `GET /api/lab/tests` — List diagnostic catalog tests
* `POST /api/lab/tests` — Add diagnostic test to catalog *(Admin)*
* `GET /api/lab/orders` — List laboratory orders with patient, doctor & status filters
* `GET /api/lab/orders/:id` — Diagnostic order details & findings
* `POST /api/lab/orders` — Place diagnostic test order
* `PUT /api/lab/orders/:id/status` — Update order status & enter diagnostic results
* `DELETE /api/lab/orders/:id` — Remove diagnostic order *(Admin)*

### Pharmacy & Formulary
* `GET /api/pharmacy/metrics` — Formulary counts and low-stock / pending metrics
* `GET /api/pharmacy/medicines` — List medicines with category, status & search filters
* `GET /api/pharmacy/medicines/:id` — Medicine details
* `POST /api/pharmacy/medicines` — Add new medicine to formulary *(Admin, Staff)*
* `PUT /api/pharmacy/medicines/:id` — Update medicine details
* `POST /api/pharmacy/medicines/:id/adjust-stock` — Adjust inventory quantity (+/-)
* `GET /api/pharmacy/prescriptions` — List prescriptions with status & patient filters
* `GET /api/pharmacy/prescriptions/:id` — Full prescription details with item list
* `POST /api/pharmacy/prescriptions` — Issue new prescription *(Doctor, Admin)*
* `POST /api/pharmacy/prescriptions/:id/dispense` — Dispense prescription & deduct stock *(Staff, Admin)*
* `PUT /api/pharmacy/prescriptions/:id/cancel` — Cancel prescription *(Doctor, Admin)*

### Billing & Claims
* `GET /api/billing/invoices` — List invoices with status & date filters
* `GET /api/billing/invoices/:id` — Itemized invoice detail
* `GET /api/billing/invoices/:id/receipt` — Formatted receipt object for printing
* `POST /api/billing/invoices` — Create new invoice with itemized line items
* `POST /api/billing/invoices/:id/payments` — Record payment transaction against invoice
* `GET /api/billing/summary` — Financial summary metrics (total invoiced, collected, outstanding)

---

## 🎨 Design System & UI/UX Standards

The web interface is inspired by **Tubik Studio's HealthTech Design Showcase**:
* **Typography**: Clean, contemporary `Plus Jakarta Sans` with distinct weights (`400`, `500`, `600`, `700`, `800`).
* **Color Palette**: Clinical slate neutrals (`#f8fafc` to `#0f172a`), deep healthcare blue (`#0f4c81`), gentle emerald green (`#10b981`), amber warning tags (`#f59e0b`), and soft crimson alerts (`#ef4444`).
* **Card Elevation & Glassmorphism**: Floating semi-transparent sidebar with backdrop blur, rounded card corners (`border-radius: 20px-28px`), and subtle dual-layer box shadows.
* **Micro-Visualizations**:
  * Animated real-time ECG rhythm waves (`<path class="ecg-pulse" ... />`)
  * Color-coded Bed Matrix (ICU, General, Private, Maintenance)
  * Dynamic SVG trend sparklines
* **Accessibility**: Fully responsive layout with high-contrast text and WCAG AA contrast compliance.

---

## 📄 License
This project is licensed under the MIT License.
* `PUT /api/admin/settings` — Update hospital configuration parameters
* `GET /api/admin/beds` — List all beds with ward filters and occupancy
* `POST /api/admin/beds` — Create a new hospital bed
* `PUT /api/admin/beds/:id` — Update bed status (`available`, `occupied`, `maintenance`)
* `GET /api/admin/users` — List all system user accounts
* `PUT /api/admin/users/:id/status` — Toggle user account active status
* `GET /api/admin/audit-logs` — Retrieve system security audit log

### Patients
* `GET /api/patients` — List patients with search (`name`, `MRN`, `phone`) & status filters
* `GET /api/patients/:id` — Full patient record with medical history, admissions, and bills
* `POST /api/patients` — Register new patient
* `PUT /api/patients/:id` — Update patient demographics & insurance
* `POST /api/patients/:id/admit` — Admit patient to an available bed
* `POST /api/patients/:id/discharge` — Discharge patient from ward
* `POST /api/patients/:id/records` — Add clinical consultation notes, prescriptions, and vitals

### Doctors
* `GET /api/doctors` — List doctors with department & availability filters
* `GET /api/doctors/:id` — Doctor profile & upcoming appointment history
* `GET /api/doctors/:id/schedule` — Daily schedule with open and booked slots
* `POST /api/doctors` — Register new physician profile *(Admin)*
* `PUT /api/doctors/:id` — Update physician profile
* `PUT /api/doctors/:id/availability` — Update status (`available`, `in_consultation`, `on_leave`, `off_duty`)

### Appointments
* `GET /api/appointments` — List appointments with date, doctor, and status filters
* `POST /api/appointments` — Book new appointment (includes conflict detection)
* `PUT /api/appointments/:id/status` — Update status (`confirmed`, `in_progress`, `completed`, `cancelled`)
* `PUT /api/appointments/:id/reschedule` — Reschedule to a different date & time slot
* `DELETE /api/appointments/:id` — Cancel an appointment

### Departments
* `GET /api/departments` — List departments with doctor, staff, and bed counts
* `GET /api/departments/:id` — Department detail with assigned personnel
* `POST /api/departments` — Create new department *(Admin)*
* `PUT /api/departments/:id` — Update department details *(Admin)*
* `DELETE /api/departments/:id` — Remove department *(Admin)*

### Staff
* `GET /api/staff` — List staff with role & shift filters
* `GET /api/staff/roster` — Duty shift roster (Morning, Evening, Night, Rotating)
* `GET /api/staff/:id` — Staff member profile
* `POST /api/staff` — Register staff member *(Admin)*
* `PUT /api/staff/:id` — Update staff member *(Admin)*

### Billing & Claims
* `GET /api/billing/invoices` — List invoices with status & date filters
* `GET /api/billing/patient-accounts` — List all patient accounts, insurance claims, and financial ledger
* `GET /api/billing/invoices/:id` — Itemized invoice detail
* `GET /api/billing/invoices/:id/receipt` — Formatted receipt object for printing
* `POST /api/billing/invoices` — Create new invoice with itemized line items
* `POST /api/billing/invoices/:id/payments` — Record payment transaction against invoice
* `GET /api/billing/summary` — Financial summary metrics (total invoiced, collected, outstanding)

---

## ☁️ AWS Cloud Deployment

The application is pre-configured for AWS production hosting (EC2, Lightsail, App Runner, or ECS) with zero external runtime dependencies.

### 🚀 1-Minute Launch on AWS EC2 or Lightsail via Docker Compose

1. **Launch an EC2 Instance** (Ubuntu 24.04 LTS or Amazon Linux 2023, `t4g.small` or `t3.micro`).
2. **Open Inbound Security Group Ports**:
   - `HTTP (80)` and `HTTPS (443)` from anywhere (`0.0.0.0/0`)
   - `SSH (22)` from your IP
3. **SSH into the instance**:
   ```bash
   ssh -i hospital-key.pem ubuntu@<YOUR-EC2-PUBLIC-IP>
   ```
4. **Deploy with Docker Compose**:
   ```bash
   git clone <YOUR-REPO-URL> /opt/hospital-management-system
   cd /opt/hospital-management-system
   docker compose up -d
   ```
5. **Access the portal**: Open `http://<YOUR-EC2-PUBLIC-IP>` in your browser.

### 📚 Full AWS Production Guide
Detailed instructions for Automated EC2 User Data, Let's Encrypt Free SSL/HTTPS, Nginx reverse proxy configuration, and S3 automated database backup scripts are documented in [**`deploy/AWS_DEPLOYMENT_GUIDE.md`**](deploy/AWS_DEPLOYMENT_GUIDE.md).

---

## 📄 License
This project is licensed under the MIT License.

