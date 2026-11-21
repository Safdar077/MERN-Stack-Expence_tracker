import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import * as authHook from '../../hooks/useAuth.js';

describe('ProtectedRoute component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('redirects unauthenticated users to /login', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      token: null,
      user: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page View</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page View')).toBeInTheDocument();
    expect(screen.queryByText('Protected Dashboard')).not.toBeInTheDocument();
  });

  it('renders child route via Outlet when token is present in useAuth', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      token: 'valid-jwt-token',
      user: { id: 'u1', name: 'John Doe' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page View</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Login Page View')).not.toBeInTheDocument();
  });

  it('renders child route via Outlet when token is found in localStorage fallback', () => {
    localStorage.setItem('token', 'stored-local-token');
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      token: null,
      user: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page View</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Protected Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Dashboard')).toBeInTheDocument();
  });

  it('renders children prop directly if provided when authenticated', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      token: 'jwt-token-123',
      user: { id: 'u1', name: 'John Doe' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <ProtectedRoute>
          <div>Direct Child Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    );

    expect(screen.getByText('Direct Child Content')).toBeInTheDocument();
  });
});
