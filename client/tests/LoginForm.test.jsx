/**
 * LoginForm.test.jsx
 *
 * Test suite for LoginPage component (Login View).
 *
 * Testing Strategy & Standards:
 * 1. Testing Framework: Vitest + React Testing Library (@testing-library/react).
 * 2. Scope of Testing:
 *    - Renders form controls: email input, password input, sign-in submit button, and signup link.
 *    - Validates mandatory fields: blocks submission and shows error banner if email or password is missing.
 *    - Validates email syntax: blocks submission and displays format validation error on malformed emails.
 *    - Successful authentication: invokes login handler from useAuth with trimmed email and password.
 *    - Authentication failure handling: displays server/hook error alert appropriately.
 *    - Password visibility toggling: verifies text vs password input type switching.
 * 3. Architecture Compliance:
 *    - Tests state without Redux/Context (pure hook mocked via vi.spyOn).
 *    - Wrapped in MemoryRouter for react-router-dom Link/useNavigate/useLocation support.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from '../src/pages/LoginPage.jsx';
import * as authHook from '../src/hooks/useAuth.js';

describe('LoginForm / LoginPage Component', () => {
  // Mock login function to track invocation and simulate authentication responses
  const mockLogin = vi.fn();

  // Reset all mocks prior to each individual test case to avoid state leakage
  beforeEach(() => {
    vi.restoreAllMocks();
    mockLogin.mockReset();
  });

  // ---------------------------------------------------------------------------
  // 1. RENDERING TESTS
  // ---------------------------------------------------------------------------
  it('renders email and password fields, login button, and register link', () => {
    // Setup: mock useAuth hook returning default unauthenticated state
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      login: mockLogin,
      loading: false,
      error: null,
      user: null,
      token: null,
    });

    // Render component wrapped in MemoryRouter for router context
    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    // Verify presence of main page and form container elements
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.getByTestId('login-form')).toBeInTheDocument();

    // Verify email input field exists with proper label and testid
    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toBeInTheDocument();
    expect(screen.getByTestId('login-email-input')).toBeInTheDocument();

    // Verify password input field exists with proper label and testid
    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toBeInTheDocument();
    expect(screen.getByTestId('login-password-input')).toBeInTheDocument();

    // Verify Sign In submit button exists
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    expect(submitBtn).toBeInTheDocument();
    expect(screen.getByTestId('login-submit-btn')).toBeInTheDocument();

    // Verify switch link to Registration view exists with correct href destination
    const registerLink = screen.getByRole('link', { name: /sign up here/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  // ---------------------------------------------------------------------------
  // 2. VALIDATION TESTS: EMPTY FIELDS
  // ---------------------------------------------------------------------------
  it('enforces validation: prevents form submission and displays error when email is empty', async () => {
    // Setup: mock useAuth hook
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

    // Attempt submission with completely empty fields
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    // Assert: Alert banner should display email required message
    const alertBanner = await screen.findByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();

    // Assert: login action must NOT be dispatched
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('enforces validation: prevents form submission and displays error when password is empty', async () => {
    // Setup: mock useAuth hook
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

    // Populate email but leave password empty
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });

    // Attempt submission
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    // Assert: Alert banner displays password required message
    const alertBanner = await screen.findByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();

    // Assert: login action must NOT be dispatched
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 3. VALIDATION TESTS: INVALID EMAIL FORMAT
  // ---------------------------------------------------------------------------
  it('validates invalid email format and displays error alert without submitting', async () => {
    // Setup: mock useAuth hook
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

    // Provide malformed email without @ or domain
    const emailInput = screen.getByLabelText(/email address/i);
    fireEvent.change(emailInput, { target: { value: 'not-a-valid-email' } });

    // Provide valid password
    const passwordInput = screen.getByLabelText(/^password$/i);
    fireEvent.change(passwordInput, { target: { value: 'Secret123!' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitBtn);

    // Assert: Alert banner informs user of invalid email format
    const alertBanner = await screen.findByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();

    // Assert: login action was not triggered
    expect(mockLogin).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 4. VALID CREDENTIALS SUBMISSION
  // ---------------------------------------------------------------------------
  it('submits valid credentials and triggers login action via useAuth', async () => {
    // Setup: mock login resolving successfully
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

    // Enter valid email and password credentials
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'john.doe@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'ValidPassword456' },
    });

    // Click submit
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Assert: login function is called with trimmed email and password
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledWith('john.doe@example.com', 'ValidPassword456');
    });
  });

  // ---------------------------------------------------------------------------
  // 5. AUTHENTICATION FAILURE / ERROR ALERT
  // ---------------------------------------------------------------------------
  it('displays error alert when authentication fails with invalid credentials', async () => {
    // Setup: mock login resolving with an authentication error
    mockLogin.mockResolvedValue({
      success: false,
      error: 'Invalid email or password combination.',
    });
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

    // Enter credentials
    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'wrongpass' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Assert: error alert banner appears containing server failure reason
    const alertBanner = await screen.findByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(
      screen.getByText('Invalid email or password combination.')
    ).toBeInTheDocument();
  });

  it('displays error alert when authError is supplied via useAuth state', () => {
    // Setup: simulate hook providing an ongoing error (e.g. account locked)
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      login: mockLogin,
      loading: false,
      error: 'Too many failed login attempts. Please try again in 15 minutes.',
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    );

    // Assert: Alert banner immediately shows hook error message
    const alertBanner = screen.getByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(
      screen.getByText('Too many failed login attempts. Please try again in 15 minutes.')
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 6. UI INTERACTION: PASSWORD VISIBILITY TOGGLE
  // ---------------------------------------------------------------------------
  it('toggles password input visibility between password and text when eye icon button is clicked', () => {
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
    const toggleBtn = screen.getByTestId('password-toggle-btn');

    // Default: obscured password field
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle button: reveal password characters
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');

    // Click toggle button again: obscure password characters
    fireEvent.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  // ---------------------------------------------------------------------------
  // 7. NAVIGATION ON SUCCESS
  // ---------------------------------------------------------------------------
  it('redirects to /dashboard upon successful authentication', async () => {
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
          <Route path="/dashboard" element={<div data-testid="dashboard-view">Dashboard Screen</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'validPassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Verify redirected view renders
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
    });
  });
});
