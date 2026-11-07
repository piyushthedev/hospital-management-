/**
 * Client-Side API & Auth Module
 */
const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('hms_token') || null;
    this.user = JSON.parse(localStorage.getItem('hms_user') || 'null');
  }

  setSession(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('hms_token', token);
    localStorage.setItem('hms_user', JSON.stringify(user));
  }

  clearSession() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('hms_token');
    localStorage.removeItem('hms_user');
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          this.clearSession();
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  }

  // --- Auth Endpoints ---
  auth = {
    login: async (email, password) => {
      const res = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (res.token && res.user) {
        this.setSession(res.token, res.user);
      }
      return res;
    },
    register: async (data) => {
      const res = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res.token && res.user) {
        this.setSession(res.token, res.user);
      }
      return res;
    },
    sendOtp: (email, purpose = 'login') => this.request('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ email, purpose })
    }),
    verifyOtp: async (email, code, purpose = 'login') => {
      const res = await this.request('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code, purpose })
      });
      if (res.token && res.user) {
        this.setSession(res.token, res.user);
      }
      return res;
    },
    loginWithBiometric: async (email, credentialId) => {
      const res = await this.request('/auth/biometric/login', {
        method: 'POST',
        body: JSON.stringify({ email, credentialId })
      });
      if (res.token && res.user) {
        this.setSession(res.token, res.user);
      }
      return res;
    },
    registerBiometric: (data = {}) => this.request('/auth/biometric/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    getMe: () => this.request('/auth/me'),
    updateProfile: (data) => this.request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
    changePassword: (oldPassword, newPassword) => this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    }),
    logout: () => {
      this.clearSession();
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
  };

  // --- Administration Endpoints ---
  admin = {
    getOverview: () => this.request('/admin/overview'),
    getSettings: () => this.request('/admin/settings'),
    updateSettings: (data) => this.request('/admin/settings', { method: 'PUT', body: JSON.stringify(data) }),
    getAuditLogs: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/admin/audit-logs${qs ? `?${qs}` : ''}`);
    },
    getBeds: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/admin/beds${qs ? `?${qs}` : ''}`);
    },
    createBed: (data) => this.request('/admin/beds', { method: 'POST', body: JSON.stringify(data) }),
    updateBed: (id, data) => this.request(`/admin/beds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getUsers: () => this.request('/admin/users'),
    createUser: (data) => this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    toggleUserStatus: (id, isActive) => this.request(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: isActive })
    })
  };

  // --- Departments Endpoints ---
  departments = {
    getAll: () => this.request('/departments'),
    getById: (id) => this.request(`/departments/${id}`),
    create: (data) => this.request('/departments', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => this.request(`/departments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => this.request(`/departments/${id}`, { method: 'DELETE' })
  };

  // --- Doctors Endpoints ---
  doctors = {
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/doctors${qs ? `?${qs}` : ''}`);
    },
    getById: (id) => this.request(`/doctors/${id}`),
    getSchedule: (id, date) => this.request(`/doctors/${id}/schedule${date ? `?date=${date}` : ''}`),
    create: (data) => this.request('/doctors', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => this.request(`/doctors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateAvailability: (id, status) => this.request(`/doctors/${id}/availability`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    }),
    delete: (id) => this.request(`/doctors/${id}`, { method: 'DELETE' })
  };

  // --- Patients Endpoints ---
  patients = {
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/patients${qs ? `?${qs}` : ''}`);
    },
    getById: (id) => this.request(`/patients/${id}`),
    create: (data) => this.request('/patients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => this.request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    admit: (id, data) => this.request(`/patients/${id}/admit`, { method: 'POST', body: JSON.stringify(data) }),
    discharge: (id, data) => this.request(`/patients/${id}/discharge`, { method: 'POST', body: JSON.stringify(data) }),
    addMedicalRecord: (id, data) => this.request(`/patients/${id}/records`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => this.request(`/patients/${id}`, { method: 'DELETE' })
  };

  // --- Appointments Endpoints ---
  appointments = {
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/appointments${qs ? `?${qs}` : ''}`);
    },
    getById: (id) => this.request(`/appointments/${id}`),
    create: (data) => this.request('/appointments', { method: 'POST', body: JSON.stringify(data) }),
    updateStatus: (id, data) => this.request(`/appointments/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
    reschedule: (id, data) => this.request(`/appointments/${id}/reschedule`, { method: 'PUT', body: JSON.stringify(data) }),
    cancel: (id, reason) => this.request(`/appointments/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) })
  };

  // --- Staff Endpoints ---
  staff = {
    getAll: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/staff${qs ? `?${qs}` : ''}`);
    },
    getRoster: () => this.request('/staff/roster'),
    getById: (id) => this.request(`/staff/${id}`),
    create: (data) => this.request('/staff', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => this.request(`/staff/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => this.request(`/staff/${id}`, { method: 'DELETE' })
  };

  // --- Billing Endpoints ---
  billing = {
    getAllInvoices: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/billing/invoices${qs ? `?${qs}` : ''}`);
    },
    getPatientAccounts: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/billing/patient-accounts${qs ? `?${qs}` : ''}`);
    },
    getInvoiceById: (id) => this.request(`/billing/invoices/${id}`),
    getReceipt: (id) => this.request(`/billing/invoices/${id}/receipt`),
    createInvoice: (data) => this.request('/billing/invoices', { method: 'POST', body: JSON.stringify(data) }),
    recordPayment: (id, data) => this.request(`/billing/invoices/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
    getSummary: () => this.request('/billing/summary')
  };

  // --- Laboratory Endpoints ---
  lab = {
    getAllTests: () => this.request('/lab/tests'),
    createTest: (data) => this.request('/lab/tests', { method: 'POST', body: JSON.stringify(data) }),
    getAllOrders: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/lab/orders${qs ? `?${qs}` : ''}`);
    },
    getOrderById: (id) => this.request(`/lab/orders/${id}`),
    createOrder: (data) => this.request('/lab/orders', { method: 'POST', body: JSON.stringify(data) }),
    updateOrderStatus: (id, data) => this.request(`/lab/orders/${id}/status`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteOrder: (id) => this.request(`/lab/orders/${id}`, { method: 'DELETE' })
  };

  // --- Pharmacy Endpoints ---
  pharmacy = {
    getMetrics: () => this.request('/pharmacy/metrics'),
    getAllMedicines: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/pharmacy/medicines${qs ? `?${qs}` : ''}`);
    },
    getMedicineById: (id) => this.request(`/pharmacy/medicines/${id}`),
    createMedicine: (data) => this.request('/pharmacy/medicines', { method: 'POST', body: JSON.stringify(data) }),
    updateMedicine: (id, data) => this.request(`/pharmacy/medicines/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    adjustStock: (id, data) => this.request(`/pharmacy/medicines/${id}/adjust-stock`, { method: 'POST', body: JSON.stringify(data) }),
    getAllPrescriptions: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return this.request(`/pharmacy/prescriptions${qs ? `?${qs}` : ''}`);
    },
    getPrescriptionById: (id) => this.request(`/pharmacy/prescriptions/${id}`),
    createPrescription: (data) => this.request('/pharmacy/prescriptions', { method: 'POST', body: JSON.stringify(data) }),
    dispensePrescription: (id) => this.request(`/pharmacy/prescriptions/${id}/dispense`, { method: 'POST' }),
    cancelPrescription: (id, reason) => this.request(`/pharmacy/prescriptions/${id}/cancel`, { method: 'PUT', body: JSON.stringify({ reason }) })
  };
}

const api = new ApiClient();
window.api = api;

