import axios from 'axios';
import io from 'socket.io-client';
import { API_URL } from '../config';

export const api = axios.create({ baseURL: API_URL });

// Attach token if present
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers = { ...(cfg.headers || {}), Authorization: `Bearer ${token}` };
  return cfg;
});

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(API_URL, { autoConnect: true });
  }
  return socketInstance;
}

export const tracksApi = {
  list: () => api.get('/api/tracks'),
  create: (payload) => api.post('/api/tracks', payload),
  update: (id, payload) => api.patch(`/api/tracks/${id}`, payload),
  remove: (id) => api.delete(`/api/tracks/${id}`),
  simulate: (id) => api.post(`/api/test/simulate-slot/${id}`),
};

export const notificationsApi = {
  saveSms: (phoneNumber) => api.post('/api/notifications/sms-route', { phoneNumber }),
  getSms: () => api.get('/api/notifications/sms-route'),
  subscribe: (subscription) => api.post('/api/notifications/subscribe', { subscription }),
};

export const settingsApi = {
  setPollingInterval: (intervalMs) => api.patch('/api/settings/polling-interval', { intervalMs }),
};

export const analyticsApi = {
  demand: () => api.get('/api/analytics/demand'),
};

export const waitlistApi = {
  join: (email) => api.post('/api/waitlist', { email }),
};

export const authApi = {
  login: (payload) => api.post('/api/auth/login', payload),
  register: (payload) => api.post('/api/auth/register', payload),
};

export const wishlistApi = {
  list: () => api.get('/api/wishlist'),
  create: (payload) => api.post('/api/wishlist', payload),
  remove: (id) => api.delete(`/api/wishlist/${id}`),
  preview: (url) => api.post('/api/wishlist/preview', { url }),
};
