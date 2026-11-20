import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';
import * as authHook from './hooks/useAuth.js';
import * as recurringHook from './hooks/useRecurring.js';
import * as budgetsHook from './hooks/useBudgets.js';

describe('App Routing', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    vi.spyOn(recurringHook, 'useRecurring').mockReturnValue({
      dueItems: [],
      markAsPaid: vi.fn(),
    });

    vi.spyOn(budgetsHook, 'useBudgets').mockReturnValue({
      warnings: [],
    });
  });

  it('renders public LoginPage on /login route', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      token: null,
      user: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });

  it('renders public RegisterPage on /register route', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      token: null,
      user: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('register-page')).toBeInTheDocument();
    expect(screen.getByText('Create an Account')).toBeInTheDocument();
  });

  it('redirects unauthenticated users from /dashboard to /login', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      token: null,
      user: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-page')).not.toBeInTheDocument();
  });

  it('renders DashboardPage within Layout when authenticated at /', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      token: 'valid-jwt-token',
      user: { name: 'Demo User', currency: 'USD' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Notification Center/i })).toBeInTheDocument();
  });

  it('renders TransactionsPage when navigating to /transactions', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      token: 'valid-jwt-token',
      user: { name: 'Demo User', currency: 'USD' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/transactions']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('transactions-page')).toBeInTheDocument();
  });

  it('redirects unknown route to / and then /dashboard when authenticated', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      token: 'valid-jwt-token',
      user: { name: 'Demo User', currency: 'USD' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/unknown-random-path']}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
  });
});
