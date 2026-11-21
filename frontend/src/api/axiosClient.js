import axios from 'axios';

/**
 * Pre-configured Axios client instance for Expense Tracker API requests.
 *
 * Base configuration:
 * - baseURL: import.meta.env?.VITE_API_BASE_URL || '/api' (proxied by Vite to http://localhost:5050 in development)
 * - headers: application/json default
 */
const axiosClient = axios.create({
  baseURL: import.meta.env?.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request Interceptor:
 * Extracts JWT token from localStorage and injects it into Authorization header.
 * Ensures all outgoing authenticated API calls include Bearer token.
 */
axiosClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // In environments where localStorage is unavailable, proceed without token
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor:
 * Intercepts 401 Unauthorized responses to clear stored credentials
 * and redirect unauthenticated users to the /login page.
 */
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error && error.response && error.response.status === 401) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch {
        // Ignore localStorage cleanup failures in SSR/test
      }

      if (typeof window !== 'undefined' && window.location) {
        const isPublicAuthRoute = ['/login', '/register'].includes(window.location.pathname);
        if (!isPublicAuthRoute) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
