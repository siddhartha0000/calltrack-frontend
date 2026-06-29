const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('ct_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('ct_token');
    localStorage.removeItem('ct_user');
    window.location.href = '/login';
    return;
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

const get  = (path)         => request(path);
const post = (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) });
const patch= (path, body)   => request(path, { method: 'PATCH',  body: JSON.stringify(body) });
const del  = (path)         => request(path, { method: 'DELETE' });

export const api = {
  /* Auth */
  login:          (body)    => post('/api/auth/login', body),
  me:             ()        => get('/api/auth/me'),
  changePassword: (body)    => post('/api/auth/change-password', body),

  /* Leads */
  getLeads:       (params)  => get('/api/leads?' + new URLSearchParams(params || {})),
  getLeadStats:   ()        => get('/api/leads/stats'),
  getLead:        (id)      => get(`/api/leads/${id}`),
  createLead:     (body)    => post('/api/leads', body),
  updateLead:     (id,body) => patch(`/api/leads/${id}`, body),
  deleteLead:     (id)      => del(`/api/leads/${id}`),
  logCall:        (id,body) => post(`/api/leads/${id}/calls`, body),
  addNote:        (id,body) => post(`/api/leads/${id}/notes`, body),
  sendWa:         (id,body) => post(`/api/leads/${id}/whatsapp`, body),
  recordPayment:  (id,body) => post(`/api/leads/${id}/payments`, body),

  /* Users */
  getUsers:       ()        => get('/api/users'),
  getUserStats:   (id)      => get(`/api/users/${id}/stats`),
  createUser:     (body)    => post('/api/users', body),
  updateUser:     (id,body) => patch(`/api/users/${id}`, body),

  /* Reports */
  getOverview:    (params)  => get('/api/reports/overview?' + new URLSearchParams(params || {})),
  getFollowups:   ()        => get('/api/reports/followups'),
  getFeeReport:   ()        => get('/api/reports/fees'),
};
