import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient.js';
import { emitSync, onSync } from '../utils/eventBus.js';

/**
 * useAuth Custom React Hook
 *
 * Provides pure React state management for authentication operations.
 * Adheres strictly to the architectural constraint: NO Redux, NO RTK Query, NO Context API.
 * State is managed using useState, persistent localStorage synchronization,
 * and native window event bus communication (emitSync / onSync).
 *
 * @returns {Object} Authentication state and action methods:
 *   - user: {Object|null} The authenticated user's profile ({ id, name, email, currency })
 *   - token: {string|null} JWT Bearer token
 *   - loading: {boolean} True when an authentication network call is in progress
 *   - error: {string|null} Human-readable error message from the last failed operation
 *   - login: {Function} Authenticates user credentials via email and password
 *   - register: {Function} Registers a new user account with default seed data
 *   - logout: {Function} Clears active session credentials and notifies subscriber components
 *   - fetchMe: {Function} Re-validates session against /api/auth/me and refreshes user profile
 */
export const useAuth = () => {
  // ---------------------------------------------------------------------------
  // 1. STATE INITIALIZATION
  // ---------------------------------------------------------------------------

  // Read stored JWT token directly from localStorage during initial hook render
  // to prevent unauthenticated flash when user refreshes the page.
  const [token, setToken] = useState(() => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem('token') || null : null;
    } catch {
      return null;
    }
  });

  // Read stored user profile JSON from localStorage
  const [user, setUser] = useState(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Tracks asynchronous network requests (login, register, fetchMe)
  const [loading, setLoading] = useState(false);

  // Stores error messages received from server responses or network failures
  const [error, setError] = useState(null);

  // ---------------------------------------------------------------------------
  // 2. AUTHENTICATION ACTIONS
  // ---------------------------------------------------------------------------

  /**
   * Helper function to save authenticated user credentials to both React state and localStorage.
   *
   * @param {Object} userData - User profile object
   * @param {string} authToken - JWT token string
   */
  const persistSession = useCallback((userData, authToken) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('token', authToken);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (e) {
      console.error('[useAuth] Failed to write credentials to localStorage:', e);
    }
    setToken(authToken);
    setUser(userData);
    setError(null);
  }, []);

  /**
   * Helper function to clear authentication credentials from React state and localStorage.
   */
  const clearSession = useCallback(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    } catch (e) {
      console.error('[useAuth] Failed to remove credentials from localStorage:', e);
    }
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  /**
   * Login action: Submits user credentials to POST /api/auth/login.
   *
   * On Success:
   * - Saves token and user to localStorage and React state
   * - Emits 'auth:login' event to notify all other components
   * - Returns { success: true, user, token }
   *
   * On Failure:
   * - Updates error state with the message returned by the server
   * - Returns { success: false, error }
   */
  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axiosClient.post('/auth/login', { email, password });
        const { user: userData, token: authToken } = response.data;

        persistSession(userData, authToken);

        // Notify application components of successful login via native eventBus
        emitSync('auth:login', userData);

        return { success: true, user: userData, token: authToken };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Login failed. Please check credentials.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [persistSession]
  );

  /**
   * Register action: Creates a new user profile via POST /api/auth/register.
   *
   * @param {string} name - User's full name
   * @param {string} email - Valid unique email address
   * @param {string} password - Secure password (min 6 characters)
   * @param {string} [currency='USD'] - Selected default currency (e.g. USD, EUR, INR)
   */
  const register = useCallback(
    async (name, email, password, currency = 'USD') => {
      setLoading(true);
      setError(null);

      try {
        const response = await axiosClient.post('/auth/register', {
          name,
          email,
          password,
          currency,
        });
        const { user: userData, token: authToken } = response.data;

        persistSession(userData, authToken);

        // Notify application components of successful registration
        emitSync('auth:register', userData);

        return { success: true, user: userData, token: authToken };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Registration failed. Please try again.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [persistSession]
  );

  /**
   * Logout action: Ends the current user session.
   * Cleans localStorage, resets internal state, and broadcasts 'auth:logout'.
   */
  const logout = useCallback(() => {
    clearSession();
    emitSync('auth:logout', null);
  }, [clearSession]);

  /**
   * fetchMe action: Validates existing token and retrieves updated profile via GET /api/auth/me.
   *
   * If token is invalid or expired (401), automatically clears session.
   */
  const fetchMe = useCallback(async () => {
    const currentToken =
      token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);

    if (!currentToken) {
      clearSession();
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosClient.get('/auth/me');
      const { user: userData } = response.data;

      if (userData) {
        setUser(userData);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(userData));
        }
        return userData;
      }
      return null;
    } catch (err) {
      // If server rejects token as unauthorized, purge session credentials
      if (err.response?.status === 401) {
        clearSession();
      }
      const message = err.response?.data?.message || err.message || 'Failed to fetch user profile';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [token, clearSession]);

  // ---------------------------------------------------------------------------
  // 3. REACTIVE EVENT SYNCHRONIZATION (onSync)
  // ---------------------------------------------------------------------------

  // Subscribe to global sync events across tabs or components
  useEffect(() => {
    const unsubscribe = onSync((detail) => {
      if (!detail) return;

      // When another component triggers logout, sync state immediately
      if (detail.type === 'auth:logout') {
        setToken(null);
        setUser(null);
        setError(null);
      }

      // When another component triggers login or profile update, sync state
      if (detail.type === 'auth:login' && detail.payload) {
        setUser(detail.payload);
        const storedToken =
          typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
        if (storedToken) setToken(storedToken);
      }
    });

    // Cleanup subscription when the hook unmounts
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    fetchMe,
  };
};

export default useAuth;
