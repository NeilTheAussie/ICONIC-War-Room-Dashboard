// Auto-detect base path — if served under /war-room, prefix API calls
const BASE = window.location.pathname.startsWith('/war-room') ? '/war-room' : '';
const API = `${BASE}/api`;

function getToken() {
  return localStorage.getItem('iconic_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('iconic_token');
    localStorage.removeItem('iconic_user');
    window.location.href = `${BASE}/login`;
    throw new Error('Unauthorized');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),

  // Users
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  setStatus: (id, status) => request(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Leads
  getLeads: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/leads${q ? '?' + q : ''}`);
  },
  addLead: (data) => request('/leads', { method: 'POST', body: JSON.stringify(data) }),
  routeLead: (id, viewer_id, notes) => request(`/leads/${id}/route`, { method: 'PATCH', body: JSON.stringify({ viewer_id, notes }) }),
  parkLead: (id, parked_until, note) => request(`/leads/${id}/park`, { method: 'PATCH', body: JSON.stringify({ parked_until, note }) }),
  unparkLead: (id) => request(`/leads/${id}/unpark`, { method: 'PATCH' }),
  startCall: (id) => request(`/leads/${id}/start-call`, { method: 'PATCH' }),
  logOutcome: (id, data) => request(`/leads/${id}/outcome`, { method: 'PATCH', body: JSON.stringify(data) }),
  importLeads: (leads) => request('/leads/import', { method: 'POST', body: JSON.stringify({ leads }) }),

  // Payments
  getPayments: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/payments${q ? '?' + q : ''}`);
  },
  getOverdue: () => request('/payments/overdue'),
  getPromises: () => request('/payments/promises'),
  updatePayment: (id, data) => request(`/payments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Subscriptions
  getSubscriptions: () => request('/subscriptions'),
  getSubHealth: () => request('/subscriptions/health'),
  reduceSub: (id, new_plan) => request(`/subscriptions/${id}/reduce`, { method: 'PATCH', body: JSON.stringify({ new_plan }) }),

  // Stats
  getToday: () => request('/stats/today'),
  getLeaderboard: (period = 'today') => request(`/stats/leaderboard?period=${period}`),
  getPnl: (month) => request(`/stats/pnl${month ? '?month=' + month : ''}`),
};

// SSE connection
export function connectSSE(onEvent) {
  const token = getToken();
  if (!token) return null;

  const es = new EventSource(`${API}/events?token=${token}`);

  // We can't pass headers with EventSource, so we'll use a workaround
  // The server needs to accept token as query param for SSE
  const events = ['viewer_status', 'lead_queued', 'lead_routed', 'lead_assigned', 'lead_on_call', 'lead_outcome', 'lead_parked', 'leads_imported', 'user_created', 'user_updated', 'payment_updated', 'subscription_updated'];

  events.forEach(evt => {
    es.addEventListener(evt, (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(evt, data);
      } catch {}
    });
  });

  es.onerror = () => {
    console.log('SSE connection error, reconnecting...');
  };

  return es;
}
