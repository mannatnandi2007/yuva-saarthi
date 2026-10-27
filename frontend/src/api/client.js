/**
 * Yuva Saarthi — Resilient API Client
 * Phase 4: Cold-start tolerance, auth interceptor, and retry helpers.
 */

import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach token and user context dynamically on every request
apiClient.interceptors.request.use((config) => {
  try {
    const rawSession = localStorage.getItem('user_session') || localStorage.getItem('supabase.auth.token');
    if (rawSession) {
      const parsed = typeof rawSession === 'string' && rawSession.startsWith('{')
        ? JSON.parse(rawSession)
        : null;
      const token = parsed?.access_token || parsed?.session_id;
      if (token && token.length > 20) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Send X-Dev-User-Id header ONLY during local development (Phase 6 / 8 security requirement)
      if (import.meta.env.DEV && parsed?.user_id) {
        config.headers['X-Dev-User-Id'] = parsed.user_id;
      }
    }
  } catch (err) {
    // Non-fatal if parsing session fails
  }
  return config;
});

// Response interceptor with exponential backoff retry for network/5xx cold-start drops
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config || !config.retry) {
      return Promise.reject(error);
    }

    config.__retryCount = config.__retryCount || 0;
    if (config.__retryCount >= (config.retryCount || 2)) {
      return Promise.reject(error);
    }

    config.__retryCount += 1;
    const backoffDelay = (config.retryDelay || 1000) * Math.pow(2, config.__retryCount - 1);
    await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    return apiClient(config);
  }
);

/**
 * Ping backend on startup to detect and handle cold-start instances (e.g. Render/HuggingFace/Fly).
 * @param {Function} onStatusChange Callback (status: 'checking' | 'warming' | 'ready' | 'error')
 */
export async function pingBackendWarmup(onStatusChange) {
  if (onStatusChange) onStatusChange('checking');
  const maxAttempts = 3;
  let delay = 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1 && onStatusChange) {
        onStatusChange('warming');
      }
      const res = await axios.get(`${API_BASE_URL}/`, { timeout: 10000 });
      if (res.status === 200) {
        if (onStatusChange) onStatusChange('ready');
        return true;
      }
    } catch (err) {
      if (attempt === maxAttempts) {
        if (onStatusChange) onStatusChange('error');
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 1.5;
    }
  }
  return false;
}

export default apiClient;
