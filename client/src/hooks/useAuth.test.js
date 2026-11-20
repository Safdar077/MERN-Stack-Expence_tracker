import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from './useAuth.js';
import axiosClient from '../api/axiosClient.js';
import * as eventBus from '../utils/eventBus.js';

// Mock axiosClient
vi.mock('../api/axiosClient.js', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
    },
  };
});

describe('useAuth hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes with null user and token when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('initializes with credentials from localStorage if present', () => {
    const mockUser = { id: 'u1', name: 'Zaid', email: 'zaid@example.com', currency: 'USD' };
    localStorage.setItem('token', 'stored-jwt-token');
    localStorage.setItem('user', JSON.stringify(mockUser));

    const { result } = renderHook(() => useAuth());

    expect(result.current.token).toBe('stored-jwt-token');
    expect(result.current.user).toEqual(mockUser);
  });

  it('logs in successfully, updates state and localStorage, and emits sync event', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');
    const mockUserData = { id: 'u1', name: 'Zaid', email: 'zaid@example.com', currency: 'USD' };
    const mockToken = 'new-session-jwt';

    axiosClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        token: mockToken,
        user: mockUserData,
      },
    });

    const { result } = renderHook(() => useAuth());

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('zaid@example.com', 'password123');
    });

    expect(loginResult.success).toBe(true);
    expect(result.current.user).toEqual(mockUserData);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.error).toBeNull();
    expect(localStorage.getItem('token')).toBe(mockToken);
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockUserData);
    expect(emitSpy).toHaveBeenCalledWith('auth:login', mockUserData);
  });

  it('handles login failure gracefully and sets error state', async () => {
    axiosClient.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: {
          success: false,
          message: 'Invalid email or password',
        },
      },
    });

    const { result } = renderHook(() => useAuth());

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('bad@example.com', 'wrongpassword');
    });

    expect(loginResult.success).toBe(false);
    expect(result.current.error).toBe('Invalid email or password');
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  it('registers successfully, stores credentials, and emits sync event', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');
    const mockUserData = { id: 'u2', name: 'Ahmad', email: 'ahmad@example.com', currency: 'EUR' };
    const mockToken = 'registered-token';

    axiosClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        token: mockToken,
        user: mockUserData,
      },
    });

    const { result } = renderHook(() => useAuth());

    let registerResult;
    await act(async () => {
      registerResult = await result.current.register('Ahmad', 'ahmad@example.com', 'password123', 'EUR');
    });

    expect(registerResult.success).toBe(true);
    expect(result.current.user).toEqual(mockUserData);
    expect(result.current.token).toBe(mockToken);
    expect(localStorage.getItem('token')).toBe(mockToken);
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(mockUserData);
    expect(emitSpy).toHaveBeenCalledWith('auth:register', mockUserData);
  });

  it('logs out and removes stored credentials from state and localStorage', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');
    localStorage.setItem('token', 'active-token');
    localStorage.setItem('user', JSON.stringify({ id: 'u1', name: 'Zaid' }));

    const { result } = renderHook(() => useAuth());
    expect(result.current.token).toBe('active-token');

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(emitSpy).toHaveBeenCalledWith('auth:logout', null);
  });

  it('fetches current user profile via fetchMe', async () => {
    localStorage.setItem('token', 'active-token');
    const updatedUser = { id: 'u1', name: 'Zaid Updated', email: 'zaid@example.com', currency: 'USD' };

    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        user: updatedUser,
      },
    });

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.fetchMe();
    });

    expect(result.current.user).toEqual(updatedUser);
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(updatedUser);
  });
});
