import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RegisterPage from './RegisterPage.jsx';
import * as authHook from '../hooks/useAuth.js';

describe('RegisterPage Component', () => {
  const mockRegister = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    mockRegister.mockReset();
  });

  it('renders registration form with all inputs, currency selector, and switch link', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      register: mockRegister,
      loading: false,
      error: null,
      user: null,
      token: null,
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('register-page')).toBeInTheDocument();
    expect(screen.getByTestId('register-form')).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByTestId('register-password-input')).toBeInTheDocument();
    expect(screen.getByTestId('register-confirm-password-input')).toBeInTheDocument();
    expect(screen.getByLabelText(/currency/i)).toBeInTheDocument();
    expect(screen.getByTestId('register-currency-select')).toHaveValue('USD');
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('validates empty name or name shorter than 2 characters', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      register: mockRegister,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    );

    // Empty name test
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    let alertBanner = await screen.findByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText(/full name is required/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();

    // 1-character name test
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    alertBanner = await screen.findByTestId('alert-banner');
    expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('validates invalid email format', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      register: mockRegister,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice Smith' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'invalid-email' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    const alertBanner = await screen.findByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('validates password length under 6 characters', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      register: mockRegister,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice Smith' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByTestId('register-password-input'), { target: { value: '12345' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    const alertBanner = await screen.findByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText(/password must be at least 6 characters/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('validates password confirmation mismatch', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      register: mockRegister,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Alice Smith' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByTestId('register-password-input'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByTestId('register-confirm-password-input'), { target: { value: 'different123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    const alertBanner = await screen.findByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('toggles password visibility when show/hide buttons are clicked', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      register: mockRegister,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    );

    const passwordInput = screen.getByTestId('register-password-input');
    const confirmInput = screen.getByTestId('register-confirm-password-input');

    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'password');

    const togglePasswordBtn = screen.getByTestId('register-password-toggle-btn');
    fireEvent.click(togglePasswordBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    const toggleConfirmBtn = screen.getByTestId('register-confirm-password-toggle-btn');
    fireEvent.click(toggleConfirmBtn);
    expect(confirmInput).toHaveAttribute('type', 'text');
  });

  it('submits valid registration form and calls register from useAuth', async () => {
    mockRegister.mockResolvedValue({ success: true });
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      register: mockRegister,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Bob Johnson' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'bob@example.com' } });
    fireEvent.change(screen.getByTestId('register-password-input'), { target: { value: 'securePass123' } });
    fireEvent.change(screen.getByTestId('register-confirm-password-input'), { target: { value: 'securePass123' } });
    fireEvent.change(screen.getByTestId('register-currency-select'), { target: { value: 'EUR' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        'Bob Johnson',
        'bob@example.com',
        'securePass123',
        'EUR'
      );
    });
  });

  it('displays server error message when registration fails', async () => {
    mockRegister.mockResolvedValue({
      success: false,
      error: 'An account with this email address already exists.',
    });
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      register: mockRegister,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Bob Johnson' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'existing@example.com' } });
    fireEvent.change(screen.getByTestId('register-password-input'), { target: { value: 'securePass123' } });
    fireEvent.change(screen.getByTestId('register-confirm-password-input'), { target: { value: 'securePass123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    const alertBanner = await screen.findByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText('An account with this email address already exists.')).toBeInTheDocument();
  });

  it('displays error from useAuth state', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      register: mockRegister,
      loading: false,
      error: 'Registration server unavailable',
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    );

    const alertBanner = screen.getByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText('Registration server unavailable')).toBeInTheDocument();
  });

  it('disables input fields and button, showing spinner when loading is true', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      register: mockRegister,
      loading: true,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <RegisterPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/full name/i)).toBeDisabled();
    expect(screen.getByLabelText(/email address/i)).toBeDisabled();
    expect(screen.getByTestId('register-password-input')).toBeDisabled();
    expect(screen.getByTestId('register-confirm-password-input')).toBeDisabled();
    expect(screen.getByTestId('register-currency-select')).toBeDisabled();
    const submitBtn = screen.getByRole('button', { name: /creating account/i });
    expect(submitBtn).toBeDisabled();
  });

  it('redirects to /dashboard upon successful registration', async () => {
    mockRegister.mockResolvedValue({ success: true });
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      register: mockRegister,
      loading: false,
      error: null,
    });

    render(
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<div>Dashboard View</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Bob Johnson' } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'bob@example.com' } });
    fireEvent.change(screen.getByTestId('register-password-input'), { target: { value: 'securePass123' } });
    fireEvent.change(screen.getByTestId('register-confirm-password-input'), { target: { value: 'securePass123' } });

    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Dashboard View')).toBeInTheDocument();
    });
  });
});
