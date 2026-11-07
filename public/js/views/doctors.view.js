/**
 * Doctor Management & Clinical Specialist Directory View
 * Inspired by Apollo Hospitals' Find a Doctor & Specialist Experience
 */
const DoctorsView = {
  doctorsList: [],
  departmentsList: [],
  activeSpecialty: 'all',
  activeSort: 'exp_desc',
  searchQuery: '',

  // Clinical procedures & treatment tags by department / specialization
  clinicalFocusMap: {
    'DEP-CARDIO': ['Coronary Angioplasty', 'Cardiac Stenting', 'Echocardiogram', 'Heart Failure Management', 'Preventive Cardiology'],
    'DEP-NEURO': ['Stroke Intervention', 'Migraine & Headache Care', 'Epilepsy Protocols', 'Spine & Neuropathy', 'Brain Imaging'],
    'DEP-PEDIA': ['Neonatal Intensive Care', 'Pediatric Asthma', 'Immunization Schedules', 'Developmental Screening', 'Infectious Diseases'],
    'DEP-ORTHO': ['Total Knee Replacement', 'Hip Arthroscopy', 'Sports Injury Rehabilitation', 'Complex Fracture Reconstruction'],
    'DEP-EMERG': ['Level-1 Trauma Resuscitation', 'Critical Care Medicine', 'Acute Coronary Protocol', 'Emergency Triage'],
    'DEP-GENMED': ['Type-2 Diabetes Management', 'Hypertension Protocol', 'Lipid Disorder Care', 'Adult Preventive Health']
  },

  // Default doctor biographies and clinical credentials
  doctorBios: {
    'DOC-CHEN': {
      bio: 'Dr. Emily Chen is a renowned Senior Consultant Interventional Cardiologist with over 14 years of clinical excellence in treating complex coronary artery diseases, structural heart defects, and heart failure. Trained at Harvard Medical School and Brigham and Women’s Hospital, Dr. Chen has performed over 2,500 successful catheterizations and angioplasties.',
      awards: ['Fellow of the American College of Cardiology (FACC)', 'Pioneer in Radial Artery Angioplasty Award', 'Distinguished Clinical Service Medal'],
      languages: 'English, Mandarin, Spanish',
      reviews: [
        { author: 'Thomas Vance', rating: 5, date: '2 days ago', text: 'Dr. Chen is an exceptional cardiologist. She treated my wife with immense compassion and walked us through every step of the catheterization procedure. World-class physician!' },
        { author: 'Elena Rostova', rating: 5, date: '1 week ago', text: 'Very thorough checkup. Dr. Chen detected my hypertension early and changed my medications with immediate positive results.' }
      ]
    },
    'DOC-MARCUS': {
      bio: 'Dr. Marcus Reynolds is an internationally recognized Neurologist specializing in cerebrovascular disease, acute stroke thrombolysis, and refractory migraine management. He completed his residency and fellowship at Johns Hopkins University School of Medicine and is actively involved in stroke clinical trials.',
      awards: ['Johns Hopkins Neurological Excellence Fellowship', 'American Academy of Neurology Member', 'Top Clinical Researcher 2024'],
      languages: 'English, French, German',
      reviews: [
        { author: 'Sophia Martinez', rating: 5, date: '3 days ago', text: 'Dr. Reynolds diagnosed my chronic migraine triggers after years of misdiagnoses elsewhere. Truly a master in his field.' },
        { author: 'Arthur Vance', rating: 5, date: '2 weeks ago', text: 'Attentive, clear explanations, and outstanding bedside manner. Highly recommended.' }
      ]
    },
    'DOC-SARAH': {
      bio: 'Dr. Sarah Jenkins is a Senior Consultant Pediatrician and Neonatologist with over 11 years of experience in pediatric critical care, newborn developmental assessments, and childhood respiratory conditions. She completed her pediatric residency at Stanford University School of Medicine.',
      awards: ['Fellow of the American Academy of Pediatrics (FAAP)', 'Compassionate Pediatric Care Award', 'Stanford Children’s Health Alum'],
      languages: 'English, Spanish',
      reviews: [
        { author: 'Brigid O’Connor', rating: 5, date: 'Yesterday', text: 'Dr. Sarah is wonderful with kids! My son Liam was completely at ease during his checkup and allergy assessment.' },
        { author: 'David Kim', rating: 5, date: '3 weeks ago', text: 'Gentle, highly knowledgeable, and extremely patient with new parents. 10/10 recommend!' }
      ]
    },
    'DOC-KIM': {
      bio: 'Dr. David Kim is a leading Orthopedic Surgeon specializing in minimally invasive total joint replacements, athletic knee reconstructions, and advanced shoulder arthroscopy. A graduate of Columbia University College of Physicians and Surgeons, he serves as chief sports medicine consultant.',
      awards: ['American Association of Orthopaedic Surgeons (AAOS)', 'Excellence in Joint Arthroplasty', 'Sports Medicine Innovation Fellow'],
      languages: 'English, Korean',
      reviews: [
        { author: 'Michael Chang', rating: 5, date: '4 days ago', text: 'Had knee arthroscopy performed by Dr. Kim. Was back walking within 48 hours. Absolute magician of an orthopedic surgeon.' }
      ]
    },
    'DOC-RIVERA': {
      bio: 'Dr. Robert Rivera is Chief of Emergency & Trauma Care with 16 years of high-volume Level-1 trauma resuscitation, acute disaster medicine, and cardiac life support leadership. He trained at Johns Hopkins and is board certified by the American Board of Emergency Medicine.',
      awards: ['Fellow of the American College of Emergency Physicians (FACEP)', 'Emergency Leadership Medal of Honor'],
      languages: 'English, Spanish, Portuguese',
      reviews: [
        { author: 'Marian Sterling', rating: 5, date: '5 days ago', text: 'Fast, decisive, and calm under immense pressure in the emergency wing. Saved my husband during his crisis.' }
      ]
    },
    'DOC-HAYES': {
      bio: 'Dr. Laura Hayes is an established Senior Consultant in General Internal Medicine and adult preventive health with 15 years of experience. A graduate of Yale School of Medicine, she specializes in multi-system chronic conditions and diabetic care.',
      awards: ['Fellow of the American College of Physicians (FACP)', 'Preventive Medicine Leadership Award'],
      languages: 'English, Italian',
      reviews: [
        { author: 'Robert Sterling', rating: 5, date: '1 week ago', text: 'Dr. Hayes has managed my diabetes protocol with remarkable precision. Blood sugar numbers have never been better.' }
      ]
    },
    'DOC-SHARMA': {
      bio: 'Dr. Priya Sharma is an acclaimed Cardiac Electrophysiologist specializing in complex catheter ablation for atrial fibrillation and pacemaker implantations. She trained at Oxford University and has published over 30 peer-reviewed cardiovascular studies.',
      awards: ['Fellow of the Heart Rhythm Society (FHRS)', 'International Cardiac Scholar Fellow'],
      languages: 'English, Hindi, Punjabi',
      reviews: [
        { author: 'Eleanor Vance', rating: 5, date: '3 days ago', text: 'Dr. Sharma regulated my heart arrhythmia with expert guidance. Her consultation was thorough, reassuring, and meticulous.' }
      ]
    }
  },

  async render() {
    try {
      const [docRes, deptRes] = await Promise.all([
        api.doctors.getAll(),
        api.departments.getAll()
      ]);
      this.doctorsList = docRes.data || [];
      this.departmentsList = deptRes.data || [];
    } catch (err) {
      console.error('Failed to load doctors:', err);
    }

    return `
      <div class="apollo-doctor-section">
        
        <!-- Apollo Hospitals Inspired Hero Search Banner -->
        <div class="apollo-hero-banner">
          <div class="apollo-hero-badge">
            <span>🏥 Apollo Health Network</span>
            <span>•</span>
            <span>World-Class Medical Specialists</span>
          </div>
          <h1 class="apollo-hero-title">Consult with Top Medical Specialists</h1>
          <p class="apollo-hero-subtitle">
            Book in-clinic appointments or schedule priority consultations with verified senior consultants across 30+ clinical departments with zero waiting time.
          </p>

          <!-- Multi-Filter Search Bar -->
          <div class="apollo-search-wrapper">
            <div class="apollo-input-group">
              <span style="font-size: 1.1rem; color: var(--slate-400);">🔍</span>
              <input type="text" id="apollo-search-input" placeholder="Search by Doctor Name, Specialty, or Symptoms (e.g. Chest pain, Stroke, Diabetes)..." value="${this.searchQuery}" oninput="DoctorsView.handleSearch(this.value)">
            </div>

            <div class="apollo-input-group">
              <span style="font-size: 1.1rem; color: var(--slate-400);">🏥</span>
              <select id="apollo-dept-select" onchange="DoctorsView.filterBySpecialty(this.value)">
                <option value="all">All Medical Specialties</option>
                ${this.departmentsList.map(d => `<option value="${d.id}" ${this.activeSpecialty === d.id ? 'selected' : ''}>${d.name}</option>`).join('')}
              </select>
            </div>

            <div class="apollo-input-group">
              <span style="font-size: 1.1rem; color: var(--slate-400);">🟢</span>
              <select id="apollo-status-select" onchange="DoctorsView.handleSearch()">
                <option value="all">All Availabilities</option>
                <option value="available">Available Today (On Duty)</option>
                <option value="in_consultation">In Consultation</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>

            <div>
              <button class="apollo-btn-book" style="padding: 0.65rem 1.25rem;" onclick="DoctorsView.handleSearch()">
                <span>Find Doctors</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Trust Badges Ribbon (Apollo Hallmark) -->
        <div class="apollo-trust-ribbon">
          <div class="apollo-trust-item">
            <div class="apollo-trust-icon" style="background: #e0f2fe; color: #0284c7;">👨‍⚕️</div>
            <div class="apollo-trust-text">
              <strong>${this.doctorsList.length}+ Senior Specialists</strong>
              <span>Board Certified Consultants</span>
            </div>
          </div>
          <div class="apollo-trust-item">
            <div class="apollo-trust-icon" style="background: #fef3c7; color: #d97706;">⭐</div>
            <div class="apollo-trust-text">
              <strong>4.9 / 5.0 Rating</strong>
              <span>10,000+ Patient Reviews</span>
            </div>
          </div>
          <div class="apollo-trust-item">
            <div class="apollo-trust-icon" style="background: #d1fae5; color: #059669;">🏆</div>
            <div class="apollo-trust-text">
              <strong>JCI & NABH Accredited</strong>
              <span>Hospital Center of Excellence</span>
            </div>
          </div>
          <div class="apollo-trust-item">
            <div class="apollo-trust-icon" style="background: #f3e8ff; color: #7c3aed;">⚡</div>
            <div class="apollo-trust-text">
              <strong>Instant Confirmation</strong>
              <span>Zero Waiting Time Pre-Bookings</span>
            </div>
          </div>
        </div>

        <!-- Specialty Quick Filter Chips Carousel -->
        <div>
          <div style="font-size: 0.825rem; font-weight: 700; color: var(--slate-500); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.65rem;">
            Filter by Clinical Specialty:
          </div>
          <div class="apollo-specialty-chips" id="apollo-specialty-chips">
            <button class="apollo-chip ${this.activeSpecialty === 'all' ? 'active' : ''}" onclick="DoctorsView.filterBySpecialty('all')">
              <span>🌟 All Specialties</span>
              <span class="chip-count">${this.doctorsList.length}</span>
            </button>
            ${this.departmentsList.map(dept => {
              const count = this.doctorsList.filter(d => d.department_id === dept.id).length;
              let icon = '🩺';
              if (dept.name.includes('Cardio')) icon = '❤️';
              else if (dept.name.includes('Neuro')) icon = '🧠';
              else if (dept.name.includes('Pedia')) icon = '🧸';
              else if (dept.name.includes('Ortho')) icon = '🦴';
              else if (dept.name.includes('Emerg')) icon = '🚨';

              return `
                <button class="apollo-chip ${this.activeSpecialty === dept.id ? 'active' : ''}" onclick="DoctorsView.filterBySpecialty('${dept.id}')">
                  <span>${icon} ${dept.name}</span>
                  <span class="chip-count">${count}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Directory Header with Counts, Sorting, and Admin Action -->
        <div class="apollo-directory-header">
          <div class="apollo-results-count" id="apollo-results-count">
            Showing <span>${this.doctorsList.length}</span> Top Specialists at Metropolitan General
          </div>

          <div style="display: flex; gap: 0.75rem; align-items: center;">
            <div style="font-size: 0.85rem; color: var(--slate-500); font-weight: 600;">Sort by:</div>
            <select id="apollo-sort-select" class="form-select" style="width: auto; padding: 0.45rem 1rem; font-size: 0.825rem; border-radius: var(--radius-full);" onchange="DoctorsView.handleSort(this.value)">
              <option value="exp_desc">Experience: High to Low</option>
              <option value="fee_asc">Consultation Fee: Low to High</option>
              <option value="fee_desc">Consultation Fee: High to Low</option>
              <option value="name_asc">Doctor Name: A to Z</option>
            </select>

            ${api.user.role === 'admin' ? `
              <button class="btn btn-primary" onclick="DoctorsView.openAddDoctorModal()" style="border-radius: var(--radius-full); padding: 0.45rem 1rem; font-size: 0.825rem;">
                <span>➕ Register Doctor</span>
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Apollo Doctors Card Listing -->
        <div style="display: flex; flex-direction: column; gap: 1.25rem;" id="apollo-doctors-list">
          ${this.renderCards(this.getFilteredDoctors())}
        </div>

      </div>
    `;
  },

  getFilteredDoctors() {
    let list = [...this.doctorsList];

    // Specialty filter
    if (this.activeSpecialty !== 'all') {
      list = list.filter(d => d.department_id === this.activeSpecialty);
    }

    // Status filter
    const statusVal = document.getElementById('apollo-status-select')?.value || 'all';
    if (statusVal !== 'all') {
      list = list.filter(d => d.availability_status === statusVal);
    }

    // Search query
    const q = (this.searchQuery || '').trim().toLowerCase();
    if (q) {
      list = list.filter(d => {
        const nameMatch = d.name.toLowerCase().includes(q);
        const specMatch = d.specialization.toLowerCase().includes(q);
        const deptMatch = (d.department_name || '').toLowerCase().includes(q);
        const qualMatch = (d.qualification || '').toLowerCase().includes(q);
        const treatments = (this.clinicalFocusMap[d.department_id] || []).join(' ').toLowerCase();
        const treatMatch = treatments.includes(q);

        return nameMatch || specMatch || deptMatch || qualMatch || treatMatch;
      });
    }

    // Sorting
    if (this.activeSort === 'exp_desc') {
      list.sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0));
    } else if (this.activeSort === 'fee_asc') {
      list.sort((a, b) => a.consultation_fee - b.consultation_fee);
    } else if (this.activeSort === 'fee_desc') {
      list.sort((a, b) => b.consultation_fee - a.consultation_fee);
    } else if (this.activeSort === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  },

  renderCards(list) {
    if (!list || list.length === 0) {
      return `
        <div class="content-card" style="padding: 3.5rem 2rem; text-align: center; color: var(--slate-400);">
          <div style="font-size: 3rem; margin-bottom: 0.75rem;">🩺</div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--slate-800); margin-bottom: 0.35rem;">No doctors found matching your criteria</h3>
          <p style="font-size: 0.875rem; color: var(--slate-500); max-width: 480px; margin: 0 auto 1.5rem auto;">
            Try adjusting your search terms, clearing department filters, or selecting "All Specialties" to see all available physicians.
          </p>
          <button class="btn btn-secondary" onclick="DoctorsView.resetFilters()">
            <span>Reset All Filters</span>
          </button>
        </div>
      `;
    }

    return list.map(d => {
      const extra = this.doctorBios[d.id] || {
        bio: `${d.name} is a dedicated physician in the Department of ${d.department_name || 'Medicine'} with over ${d.experience_years} years of patient care experience.`,
        languages: 'English, Spanish',
        reviews: []
      };

      const treatments = this.clinicalFocusMap[d.department_id] || ['General Consultation', 'Clinical Evaluation', 'Preventive Health'];

      let statusBadgeClass = 'available';
      let statusText = '🟢 Available Today';
      if (d.availability_status === 'in_consultation') {
        statusBadgeClass = 'in_consultation';
        statusText = '🟡 In Consultation';
      } else if (d.availability_status === 'on_leave') {
        statusBadgeClass = 'on_leave';
        statusText = '🔴 On Leave';
      } else if (d.availability_status === 'off_duty') {
        statusBadgeClass = 'off_duty';
        statusText = '⚪ Off Duty';
      }

      // Initials for avatar
      const initials = d.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').slice(0, 2);

      return `
        <div class="apollo-doctor-card">
          
          <!-- Column 1: Doctor Visual Identity & Trust Badges -->
          <div class="apollo-card-avatar-col">
            <div class="apollo-doctor-avatar">
              <span>${initials}</span>
            </div>
            
            <div class="apollo-verified-pill">
              <span>✓</span>
              <span>Verified Specialist</span>
            </div>

            <div class="apollo-rating-pill">
              <span>★ 4.9</span>
              <span style="font-size: 0.7rem; color: #92400e;">(120+)</span>
            </div>

            <div class="apollo-exp-tag">
              🎓 <strong>${d.experience_years}+ Yrs</strong> Exp
            </div>
          </div>

          <!-- Column 2: Detailed Clinical Profile & Expertise -->
          <div class="apollo-card-info-col">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
                <h3 class="apollo-doc-name">${d.name}</h3>
                <span class="badge badge-info" style="font-size: 0.75rem;">${d.department_name || 'General Medicine'}</span>
              </div>
              <div class="apollo-doc-designation">Senior Consultant — ${d.specialization}</div>
              <div class="apollo-doc-degrees">🎓 ${d.qualification || 'MD, Board Certified'} • Lic #${d.license_number || 'MED-REG'}</div>
            </div>

            <!-- Key Metadata Details Strip -->
            <div class="apollo-meta-grid">
              <div class="apollo-meta-item">
                <span>📍</span>
                <span>Location: <strong>${d.room_number || 'Main Clinic Wing'}</strong></span>
              </div>
              <div class="apollo-meta-item">
                <span>🗣️</span>
                <span>Languages: <strong>${extra.languages}</strong></span>
              </div>
              <div class="apollo-meta-item">
                <span>🕒</span>
                <span>Days: <strong>${d.schedule_days}</strong></span>
              </div>
              <div class="apollo-meta-item">
                <span>⏰</span>
                <span>Hours: <strong>${d.shift_hours}</strong></span>
              </div>
            </div>

            <!-- Clinical Treatments / Procedures Tags (Apollo Style) -->
            <div>
              <div style="font-size: 0.725rem; font-weight: 700; color: var(--slate-400); text-transform: uppercase; margin-bottom: 0.35rem;">
                Clinical Focus & Key Procedures:
              </div>
              <div class="apollo-treatments-wrap">
                ${treatments.slice(0, 4).map(t => `<span class="apollo-treatment-badge">${t}</span>`).join('')}
                ${treatments.length > 4 ? `<span style="font-size: 0.725rem; color: var(--slate-400); font-weight: 600;">+${treatments.length - 4} more</span>` : ''}
              </div>
            </div>
          </div>

          <!-- Column 3: Booking & Availability Column -->
          <div class="apollo-card-action-col">
            <div>
              <div class="apollo-status-badge ${statusBadgeClass}">
                ${statusText}
              </div>

              <div class="apollo-fee-block">
                <div class="apollo-fee-amount">$${Number(d.consultation_fee).toFixed(0)}</div>
                <div class="apollo-fee-label">Consultation Fee (In-Clinic)</div>
              </div>

              <div style="font-size: 0.775rem; color: var(--slate-600); margin-top: 0.4rem; display: flex; align-items: center; gap: 0.3rem;">
                <span>⚡</span>
                <span>Next Slot: <strong>10:00 AM Today</strong></span>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
              <button class="apollo-btn-book" onclick="DoctorsView.bookWithDoctor('${d.id}')">
                <span>⚡ Book Appointment</span>
              </button>

              <button class="apollo-btn-profile" onclick="DoctorsView.openDoctorProfile('${d.id}')">
                <span>👨‍⚕️ View Profile & Schedule</span>
              </button>

              ${['admin', 'doctor'].includes(api.user.role) ? `
                <button class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 0.35rem;" onclick="DoctorsView.toggleStatus('${d.id}', '${d.availability_status}')">
                  ⚙️ Change Availability
                </button>
              ` : ''}
            </div>
          </div>

        </div>
      `;
    }).join('');
  },

  handleSearch(val) {
    if (val !== undefined) this.searchQuery = val;
    this.updateListing();
  },

  filterBySpecialty(deptId) {
    this.activeSpecialty = deptId;
    const select = document.getElementById('apollo-dept-select');
    if (select) select.value = deptId;

    // Update active chip UI
    document.querySelectorAll('.apollo-chip').forEach(chip => {
      chip.classList.toggle('active', chip.getAttribute('onclick')?.includes(`'${deptId}'`));
    });

    this.updateListing();
  },

  handleSort(sortVal) {
    this.activeSort = sortVal;
    this.updateListing();
  },

  resetFilters() {
    this.activeSpecialty = 'all';
    this.searchQuery = '';
    const input = document.getElementById('apollo-search-input');
    if (input) input.value = '';
    const deptSelect = document.getElementById('apollo-dept-select');
    if (deptSelect) deptSelect.value = 'all';
    const statusSelect = document.getElementById('apollo-status-select');
    if (statusSelect) statusSelect.value = 'all';

    this.filterBySpecialty('all');
  },

  updateListing() {
    const list = this.getFilteredDoctors();
    const container = document.getElementById('apollo-doctors-list');
    if (container) {
      container.innerHTML = this.renderCards(list);
    }
    const countEl = document.getElementById('apollo-results-count');
    if (countEl) {
      countEl.innerHTML = `Showing <span>${list.length}</span> Top Specialists at Metropolitan General`;
    }
  },

  // Direct In-Clinic Booking with this doctor pre-selected
  async bookWithDoctor(doctorId, preselectedSlot = null) {
    try {
      const [patRes, docRes] = await Promise.all([
        api.patients.getAll(),
        api.doctors.getAll()
      ]);

      const patients = patRes.data || [];
      const doctors = docRes.data || [];
      const doctor = doctors.find(d => d.id === doctorId) || doctors[0];

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const minDate = tomorrow.toISOString().split('T')[0];

      App.showDynamicModal(`
        <div class="modal-header">
          <div>
            <h3>Book Appointment with ${doctor.name}</h3>
            <span style="font-size: 0.8rem; color: var(--primary); font-weight: 700;">${doctor.specialization} • $${doctor.consultation_fee} Consultation Fee</span>
          </div>
          <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
        </div>
        <form onsubmit="DoctorsView.submitDoctorAppointment(event, '${doctor.id}')">
          <div class="modal-body">
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: var(--radius-md); padding: 0.85rem 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.75rem;">
              <div style="width: 44px; height: 44px; border-radius: 50%; background: #0284c7; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 800;">
                🩺
              </div>
              <div>
                <div style="font-weight: 800; color: var(--slate-900);">${doctor.name}</div>
                <div style="font-size: 0.775rem; color: var(--slate-600);">${doctor.qualification} • ${doctor.room_number || 'Clinical Suite'}</div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Patient Record (MRN)</label>
              <select id="book-patient-id" class="form-select" required>
                ${patients.map(p => `<option value="${p.id}">${p.name} (MRN: ${p.id})</option>`).join('')}
              </select>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Appointment Date</label>
                <input type="date" id="book-date" class="form-input" value="${minDate}" min="${new Date().toISOString().split('T')[0]}" required>
              </div>

              <div class="form-group">
                <label class="form-label">Time Slot</label>
                <select id="book-slot" class="form-select" required>
                  ${[
                    '09:00 AM - 09:30 AM',
                    '09:30 AM - 10:00 AM',
                    '10:00 AM - 10:30 AM',
                    '10:30 AM - 11:00 AM',
                    '11:00 AM - 11:30 AM',
                    '11:30 AM - 12:00 PM',
                    '02:00 PM - 02:30 PM',
                    '02:30 PM - 03:00 PM',
                    '03:00 PM - 03:30 PM',
                    '03:30 PM - 04:00 PM'
                  ].map(slot => `<option value="${slot}" ${slot === preselectedSlot ? 'selected' : ''}>${slot}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Consultation Reason / Chief Complaint</label>
              <textarea id="book-reason" class="form-textarea" rows="2" placeholder="Describe symptoms, reason for consultation, or follow-up needs" required></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Confirm Appointment</button>
          </div>
        </form>
      `);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async submitDoctorAppointment(e, doctorId) {
    e.preventDefault();
    const data = {
      patient_id: document.getElementById('book-patient-id').value,
      doctor_id: doctorId,
      appointment_date: document.getElementById('book-date').value,
      time_slot: document.getElementById('book-slot').value,
      type: 'specialist_consultation',
      reason: document.getElementById('book-reason').value
    };

    try {
      await api.appointments.create(data);
      showToast('Appointment successfully confirmed with physician!', 'success');
      App.closeActiveModal();
      App.navigate('appointments');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  // Apollo Comprehensive Doctor Profile Drawer/Modal
  async openDoctorProfile(doctorId) {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      const [docRes, schedRes] = await Promise.all([
        api.doctors.getById(doctorId),
        api.doctors.getSchedule(doctorId, todayStr)
      ]);

      const doc = docRes.data || {};
      const sched = schedRes.data?.schedule || [];
      const extra = this.doctorBios[doctorId] || {
        bio: `${doc.name} is a specialist in ${doc.department_name}.`,
        awards: ['Board Certified Specialist'],
        languages: 'English, Spanish',
        reviews: []
      };

      const treatments = this.clinicalFocusMap[doc.department_id] || ['General Consultation', 'Clinical Evaluation'];

      App.showDynamicModal(`
        <div class="modal-header" style="background: linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%); color: white; border-radius: var(--radius-xl) var(--radius-xl) 0 0; padding: 1.5rem 2rem;">
          <div style="display: flex; gap: 1.25rem; align-items: center;">
            <div style="width: 64px; height: 64px; border-radius: 50%; background: #ffffff; color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.75rem; font-weight: 800; box-shadow: 0 6px 16px rgba(0,0,0,0.2);">
              ${doc.name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <h2 style="font-size: 1.35rem; font-weight: 800; color: #ffffff;">${doc.name}</h2>
                <span style="background: rgba(255,255,255,0.2); font-size: 0.725rem; padding: 0.2rem 0.5rem; border-radius: 9999px; font-weight: 700;">✓ Verified</span>
              </div>
              <div style="font-size: 0.85rem; color: #e0f2fe; margin-top: 0.15rem;">Senior Consultant — ${doc.specialization} (${doc.department_name})</div>
              <div style="font-size: 0.775rem; color: #bae6fd;">🎓 ${doc.qualification} • ${doc.experience_years}+ Years Experience</div>
            </div>
          </div>
          <button class="modal-close-btn" style="color: white; font-size: 1.5rem;" onclick="App.closeActiveModal()">✕</button>
        </div>

        <div class="modal-body" style="padding: 1.5rem 2rem;">
          
          <!-- Modal Tab Buttons -->
          <div style="display: flex; gap: 0.5rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; margin-bottom: 1.25rem;">
            <button id="modal-tab-btn-about" class="btn btn-primary" style="border-radius: 9999px; padding: 0.35rem 1rem; font-size: 0.825rem;" onclick="DoctorsView.switchModalTab('about')">
              📖 About & Credentials
            </button>
            <button id="modal-tab-btn-schedule" class="btn btn-secondary" style="border-radius: 9999px; padding: 0.35rem 1rem; font-size: 0.825rem;" onclick="DoctorsView.switchModalTab('schedule')">
              ⏰ Today's Schedule & Slots
            </button>
            <button id="modal-tab-btn-reviews" class="btn btn-secondary" style="border-radius: 9999px; padding: 0.35rem 1rem; font-size: 0.825rem;" onclick="DoctorsView.switchModalTab('reviews')">
              ⭐ Patient Reviews (${extra.reviews?.length || 2})
            </button>
          </div>

          <!-- Tab 1: About & Bio -->
          <div id="modal-content-about">
            <div style="font-size: 0.9rem; line-height: 1.65; color: var(--slate-700); margin-bottom: 1.25rem;">
              ${extra.bio}
            </div>

            <div class="form-grid" style="margin-bottom: 1.25rem;">
              <div style="background: #f8fafc; padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 0.725rem; font-weight: 700; color: var(--slate-400); text-transform: uppercase;">Medical License</div>
                <div style="font-weight: 700; color: var(--slate-800);">${doc.license_number}</div>
              </div>
              <div style="background: #f8fafc; padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 0.725rem; font-weight: 700; color: var(--slate-400); text-transform: uppercase;">Languages Spoken</div>
                <div style="font-weight: 700; color: var(--slate-800);">${extra.languages}</div>
              </div>
              <div style="background: #f8fafc; padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 0.725rem; font-weight: 700; color: var(--slate-400); text-transform: uppercase;">Hospital Clinic Suite</div>
                <div style="font-weight: 700; color: var(--slate-800);">${doc.room_number || 'General Outpatient Clinic'}</div>
              </div>
              <div style="background: #f8fafc; padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
                <div style="font-size: 0.725rem; font-weight: 700; color: var(--slate-400); text-transform: uppercase;">Consultation Fee</div>
                <div style="font-weight: 800; color: var(--primary); font-size: 1.1rem;">$${doc.consultation_fee} USD</div>
              </div>
            </div>

            <div style="margin-bottom: 1rem;">
              <div style="font-size: 0.775rem; font-weight: 700; color: var(--slate-800); text-transform: uppercase; margin-bottom: 0.5rem;">Clinical Focus & Specialized Treatments</div>
              <div style="display: flex; flex-wrap: wrap; gap: 0.4rem;">
                ${treatments.map(t => `<span class="apollo-treatment-badge" style="font-size: 0.8rem; padding: 0.3rem 0.75rem;">${t}</span>`).join('')}
              </div>
            </div>

            ${extra.awards ? `
              <div>
                <div style="font-size: 0.775rem; font-weight: 700; color: var(--slate-800); text-transform: uppercase; margin-bottom: 0.5rem;">Honors, Fellowships & Accreditations</div>
                <div style="display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; color: var(--slate-700);">
                  ${extra.awards.map(a => `<div>🏅 <strong>${a}</strong></div>`).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Tab 2: Today's Interactive Schedule Slots -->
          <div id="modal-content-schedule" style="display: none;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
              <div style="font-size: 0.875rem; font-weight: 700; color: var(--slate-900);">
                Available Consultation Slots for Today (${todayStr}):
              </div>
              <div style="display: flex; gap: 0.75rem; font-size: 0.75rem;">
                <span style="display: flex; align-items: center; gap: 0.25rem;"><span style="width: 10px; height: 10px; background: #22c55e; border-radius: 50%;"></span> Open Slot</span>
                <span style="display: flex; align-items: center; gap: 0.25rem;"><span style="width: 10px; height: 10px; background: #ef4444; border-radius: 50%;"></span> Booked</span>
              </div>
            </div>

            <div class="apollo-slots-grid">
              ${sched.map(slot => `
                <button class="apollo-slot-btn ${slot.is_available ? 'open' : 'booked'}" 
                  ${slot.is_available ? `onclick="App.closeActiveModal(); DoctorsView.bookWithDoctor('${doc.id}', '${slot.time_slot}')"` : 'disabled'}
                  title="${slot.is_available ? 'Click to book this slot' : 'Slot already booked'}">
                  <div>${slot.time_slot.split(' - ')[0]}</div>
                  <div style="font-size: 0.7rem; font-weight: 600; margin-top: 0.15rem;">
                    ${slot.is_available ? 'Book Slot ✓' : 'Booked'}
                  </div>
                </button>
              `).join('')}
            </div>

            <div style="margin-top: 1.25rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: var(--radius-sm); padding: 0.75rem 1rem; font-size: 0.8rem; color: #166534;">
              💡 <strong>Instant Booking Tip:</strong> Click any green slot above to immediately open the booking form with this physician and time slot pre-selected!
            </div>
          </div>

          <!-- Tab 3: Verified Patient Reviews -->
          <div id="modal-content-reviews" style="display: none;">
            <div style="display: flex; align-items: center; gap: 1rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.25rem;">
              <div style="font-size: 2.25rem; font-weight: 800; color: #b45309;">4.9</div>
              <div>
                <div style="color: #d97706; font-size: 1.1rem; letter-spacing: 0.1em;">★★★★★</div>
                <div style="font-size: 0.8rem; color: #92400e; font-weight: 600;">Based on 140+ verified clinical consultations</div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 0.85rem;">
              ${(extra.reviews || []).map(r => `
                <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1rem; background: #ffffff;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
                    <strong style="color: var(--slate-900); font-size: 0.875rem;">${r.author}</strong>
                    <span style="font-size: 0.75rem; color: var(--slate-400);">${r.date}</span>
                  </div>
                  <div style="color: #f59e0b; font-size: 0.85rem; margin-bottom: 0.35rem;">${'★'.repeat(r.rating)}</div>
                  <div style="font-size: 0.85rem; color: var(--slate-700); line-height: 1.5;">${r.text}</div>
                </div>
              `).join('')}
            </div>
          </div>

        </div>

        <div class="modal-footer" style="padding: 1.25rem 2rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 1.15rem; font-weight: 800; color: var(--slate-900);">
            $${doc.consultation_fee} <span style="font-size: 0.75rem; font-weight: 600; color: var(--slate-400);">/ in-clinic visit</span>
          </div>

          <div style="display: flex; gap: 0.75rem;">
            <button class="btn btn-secondary" onclick="App.closeActiveModal()">Close</button>
            <button class="apollo-btn-book" style="width: auto; padding: 0.65rem 1.5rem;" onclick="App.closeActiveModal(); DoctorsView.bookWithDoctor('${doc.id}')">
              <span>⚡ Book Consultation</span>
            </button>
          </div>
        </div>
      `);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  switchModalTab(tab) {
    const tabAbout = document.getElementById('modal-content-about');
    const tabSchedule = document.getElementById('modal-content-schedule');
    const tabReviews = document.getElementById('modal-content-reviews');

    const btnAbout = document.getElementById('modal-tab-btn-about');
    const btnSchedule = document.getElementById('modal-tab-btn-schedule');
    const btnReviews = document.getElementById('modal-tab-btn-reviews');

    if (!tabAbout || !tabSchedule || !tabReviews) return;

    tabAbout.style.display = tab === 'about' ? 'block' : 'none';
    tabSchedule.style.display = tab === 'schedule' ? 'block' : 'none';
    tabReviews.style.display = tab === 'reviews' ? 'block' : 'none';

    btnAbout.className = `btn ${tab === 'about' ? 'btn-primary' : 'btn-secondary'}`;
    btnSchedule.className = `btn ${tab === 'schedule' ? 'btn-primary' : 'btn-secondary'}`;
    btnReviews.className = `btn ${tab === 'reviews' ? 'btn-primary' : 'btn-secondary'}`;
  },

  async toggleStatus(doctorId, currentStatus) {
    const nextMap = {
      available: 'in_consultation',
      in_consultation: 'on_leave',
      on_leave: 'off_duty',
      off_duty: 'available'
    };
    const nextStatus = nextMap[currentStatus] || 'available';

    try {
      await api.doctors.updateAvailability(doctorId, nextStatus);
      showToast(`Doctor availability changed to ${nextStatus.replace('_', ' ')}`, 'success');
      App.navigate('doctors');
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async openAddDoctorModal() {
    try {
      const res = await api.departments.getAll();
      const departments = res.data || [];

      const modalHtml = `
        <div class="modal-header">
          <h3>Register New Specialist Physician</h3>
          <button class="modal-close-btn" onclick="App.closeActiveModal()">✕</button>
        </div>
        <form onsubmit="DoctorsView.submitAddDoctor(event)">
          <div class="modal-body">
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Full Doctor Name</label>
                <input type="text" id="doc-name" class="form-input" placeholder="e.g. Dr. Robert Chen, MD" required>
              </div>
              <div class="form-group">
                <label class="form-label">Email Address</label>
                <input type="email" id="doc-email" class="form-input" placeholder="doctor.name@hospital.org" required>
              </div>
              <div class="form-group">
                <label class="form-label">Specialty Department</label>
                <select id="doc-dept" class="form-select" required>
                  ${departments.map(d => `<option value="${d.id}">${d.name}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Clinical Specialization</label>
                <input type="text" id="doc-spec" class="form-input" placeholder="e.g. Pediatric Cardiology" required>
              </div>
              <div class="form-group">
                <label class="form-label">Medical License #</label>
                <input type="text" id="doc-license" class="form-input" placeholder="e.g. MED-LIC-99001" required>
              </div>
              <div class="form-group">
                <label class="form-label">Consultation Fee ($ USD)</label>
                <input type="number" id="doc-fee" class="form-input" value="150" min="0" step="5" required>
              </div>
              <div class="form-group">
                <label class="form-label">Hospital Suite / Room</label>
                <input type="text" id="doc-room" class="form-input" placeholder="e.g. Suite 305, Wing A">
              </div>
              <div class="form-group">
                <label class="form-label">Experience (Years)</label>
                <input type="number" id="doc-exp" class="form-input" value="12" min="0">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Qualifications & Degrees</label>
              <input type="text" id="doc-qual" class="form-input" placeholder="e.g. MD, FACC, Harvard Medical School">
            </div>
            <div style="margin-top: 0.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer;">
                <input type="checkbox" id="doc-create-account" checked>
                <span>Create Doctor Portal Login (Default password: <code>Doctor123!</code>)</span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="App.closeActiveModal()">Cancel</button>
            <button type="submit" class="btn btn-primary">Register Specialist</button>
          </div>
        </form>
      `;

      App.showDynamicModal(modalHtml);
    } catch (err) {
      showToast(err.message, 'error');
    }
  },

  async submitAddDoctor(event) {
    event.preventDefault();
    const data = {
      name: document.getElementById('doc-name').value,
      email: document.getElementById('doc-email').value,
      department_id: document.getElementById('doc-dept').value,
      specialization: document.getElementById('doc-spec').value,
      license_number: document.getElementById('doc-license').value,
      consultation_fee: parseFloat(document.getElementById('doc-fee').value) || 100,
      room_number: document.getElementById('doc-room').value,
      experience_years: parseInt(document.getElementById('doc-exp').value, 10) || 0,
      qualification: document.getElementById('doc-qual').value,
      create_user_account: document.getElementById('doc-create-account').checked
    };

    try {
      await api.doctors.create(data);
      showToast('Specialist successfully registered into hospital directory!', 'success');
      App.closeActiveModal();
      App.navigate('doctors');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
};

window.DoctorsView = DoctorsView;
