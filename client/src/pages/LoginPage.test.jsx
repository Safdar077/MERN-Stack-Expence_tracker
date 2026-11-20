import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage.jsx';
import * as authHook from '../hooks/useAuth.js';

describe('LoginPage Component', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockLogin.mockReset();
  });

  it('renders login page with form elements, labels, inputs, and switch link', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
      user: null,
      token: null,
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register|sign up/i })).toHaveAttribute('href', '/register');
  });

  it('toggles password input type between "password" and "text"', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = screen.getByTestId('password-toggle-btn');
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('validates empty email and displays Alert banner', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    const alertBanner = await screen.findByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('validates invalid email format and displays Alert banner', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    const alertBanner = await screen.findByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('validates empty password and displays Alert banner', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    const alertBanner = await screen.findByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('submits valid credentials and calls login from useAuth', async () => {
    mockLogin.mockResolvedValue({ success: true });
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('displays server error message when login fails', async () => {
    mockLogin.mockResolvedValue({ success: false, error: 'Invalid email or password' });
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'wrongpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    const alertBanner = await screen.findByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
  });

  it('displays auth hook error when provided via useAuth state', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      login: mockLogin,
      loading: false,
      error: 'Account temporarily locked',
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    const alertBanner = screen.getByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText('Account temporarily locked')).toBeInTheDocument();
  });

  it('disables inputs and button when loading is true', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      login: mockLogin,
      loading: true,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/email/i)).toBeDisabled();
    expect(screen.getByLabelText(/^password$/i)).toBeDisabled();
    const submitBtn = screen.getByRole('button', { name: /signing in/i });
    expect(submitBtn).toBeDisabled();
  });

  it('redirects to /dashboard upon successful login', async () => {
    mockLogin.mockResolvedValue({ success: true });
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Dashboard View</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'secretpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard View')).toBeInTheDocument();
    });
  });

  it('redirects to custom from location state upon successful login', async () => {
    mockLogin.mockResolvedValue({ success: true });
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: { from: { pathname: '/transactions' } },
          },
        ]}
      >
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/transactions" element={<div>Transactions View</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'secretpass' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Transactions View')).toBeInTheDocument();
    });
  });
});
