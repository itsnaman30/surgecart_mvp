const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(browserOrigin);
const defaultApiUrl = isLocalOrigin ? 'http://localhost:5000' : browserOrigin;

export const API_URL = (import.meta.env.VITE_API_URL || defaultApiUrl || '').replace(/\/+$/, '');
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_URL || '').replace(/\/+$/, '');
export const MAX_WATCHES = 3;
