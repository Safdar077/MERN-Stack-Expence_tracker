import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axiosClient from './axiosClient.js';

describe('axiosClient', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('has baseURL set to /api', () => {
    expect(axiosClient.defaults.baseURL).toBe('/api');
  });

  it('attaches Bearer token from localStorage in request interceptor', async () => {
    localStorage.setItem('token', 'fake-jwt-token-xyz');
    // Run the request interceptor directly
    const interceptor = axiosClient.interceptors.request.handlers[0];
    const config = await interceptor.fulfilled({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer fake-jwt-token-xyz');
  });

  it('does not set Authorization header when token is missing', async () => {
    const interceptor = axiosClient.interceptors.request.handlers[0];
    const config = await interceptor.fulfilled({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('clears token and user on 401 response and redirects', async () => {
    localStorage.setItem('token', 'expired-token');
    localStorage.setItem('user', JSON.stringify({ name: 'Test' }));

    const originalLocation = window.location;
    delete window.location;
    window.location = { pathname: '/dashboard', href: '/dashboard' };

    const interceptor = axiosClient.interceptors.response.handlers[0];
    const error401 = {
      response: {
        status: 401,
        data: { message: 'Unauthorized' },
      },
    };

    await expect(interceptor.rejected(error401)).rejects.toEqual(error401);

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(window.location.href).toBe('/login');

    window.location = originalLocation;
  });

  it('does not redirect if already on /login or /register on 401', async () => {
    const originalLocation = window.location;

    delete window.location;
    window.location = { pathname: '/login', href: '/login' };

    const interceptor = axiosClient.interceptors.response.handlers[0];
    const error401 = { response: { status: 401 } };

    await expect(interceptor.rejected(error401)).rejects.toEqual(error401);
    expect(window.location.href).toBe('/login');

    window.location = { pathname: '/register', href: '/register' };
    await expect(interceptor.rejected(error401)).rejects.toEqual(error401);
    expect(window.location.href).toBe('/register');

    window.location = originalLocation;
  });
});
