import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaWallet,
  FaUser,
  FaEnvelope,
  FaLock,
  FaMoneyBillWave,
  FaEye,
  FaEyeSlash,
  FaSpinner,
} from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth.js';
import Alert from '../components/common/Alert.jsx';

/**
 * Regular expression used to validate standard email address syntax.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Supported default currency options for new user profiles.
 */
const CURRENCY_OPTIONS = [
  { code: 'USD', symbol: '$', label: 'USD - US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR - Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP - British Pound (£)' },
  { code: 'INR', symbol: '₹', label: 'INR - Indian Rupee (₹)' },
  { code: 'CAD', symbol: '$', label: 'CAD - Canadian Dollar ($)' },
  { code: 'AUD', symbol: '$', label: 'AUD - Australian Dollar ($)' },
  { code: 'JPY', symbol: '¥', label: 'JPY - Japanese Yen (¥)' },
];

/**
 * RegisterPage Component
 *
 * Provides a user onboarding form that registers a new account, automatically seeds
 * default categories, sets up user session credentials, and redirects to the dashboard.
 *
 * Architectural Features:
 * - Direct integration with custom `useAuth` hook (`register`, `loading`, `error`).
 * - Pure local component state for form field management (NO Redux, NO Context API).
 * - Multi-rule client validation: name length, valid email regex, password min length, matching password confirmation.
 * - Integration with reusable `Alert` banner for validation and server feedback.
 * - Post-registration automatic session creation and direct redirection to `/dashboard`.
 *
 * @returns {React.ReactElement} The rendered registration page view.
 */
const RegisterPage = () => {
  // ---------------------------------------------------------------------------
  // 1. ROUTING & AUTH HOOK
  // ---------------------------------------------------------------------------
  const navigate = useNavigate();
  const { register, loading: authLoading, error: authError } = useAuth();

  // ---------------------------------------------------------------------------
  // 2. COMPONENT LOCAL STATE
  // ---------------------------------------------------------------------------
  // Form input field state values
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    currency: 'USD',
  });

  // Independent visibility toggles for password and confirm-password fields
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Local client-side validation error message
  const [clientError, setClientError] = useState(null);

  // Local submitting state flag to ensure immediate button disable
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tracks whether the active error message was dismissed by the user
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissal state whenever a new authError arrives from useAuth
  useEffect(() => {
    if (authError) {
      setIsDismissed(false);
    }
  }, [authError]);

  // Combined loading state: true when either local submit is underway or useAuth is busy
  const isLoading = authLoading || isSubmitting;

  // Active error to display: prefers local client validation errors, falls back to auth hook errors
  const activeError = !isDismissed ? clientError || authError : null;

  // ---------------------------------------------------------------------------
  // 3. EVENT HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Generic input change handler for form inputs and selects.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Reset error when user resumes editing
    if (clientError) {
      setClientError(null);
    }
    setIsDismissed(true);
  };

  /**
   * Validates registration form fields against business rules.
   *
   * @returns {string|null} First validation error encountered, or null if all pass.
   */
  const validateForm = () => {
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();

    // 1. Full name required & minimum 2 characters
    if (!trimmedName) {
      return 'Full name is required. Please enter your name.';
    }
    if (trimmedName.length < 2) {
      return 'Full name must be at least 2 characters long.';
    }

    // 2. Email required & valid email format
    if (!trimmedEmail) {
      return 'Email address is required.';
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return 'Please enter a valid email address (e.g., user@example.com).';
    }

    // 3. Password required & minimum 6 characters
    if (!formData.password) {
      return 'Password is required. Please choose a password.';
    }
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long.';
    }

    // 4. Confirm password must match password
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match. Please verify your password confirmation.';
    }

    return null;
  };

  /**
   * Form submission handler.
   * Validates form inputs, dispatches register() from useAuth, and redirects on success.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset dismissal flag on every submit attempt
    setIsDismissed(false);

    // 1. Client-side input validation
    const validationError = validateForm();
    if (validationError) {
      setClientError(validationError);
      return;
    }

    setClientError(null);
    setIsSubmitting(true);

    try {
      // 2. Dispatch register call via useAuth hook
      const result = await register(
        formData.name.trim(),
        formData.email.trim(),
        formData.password,
        formData.currency
      );

      if (result && result.success) {
        // 3. On success, user session is automatically stored; redirect to dashboard
        navigate('/dashboard', { replace: true });
      } else if (result && !result.success && result.error) {
        setClientError(result.error);
      }
    } catch (err) {
      setClientError(
        err.message || 'An unexpected error occurred during registration. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. RENDER
  // ---------------------------------------------------------------------------
  return (
    <div
      data-testid="register-page"
      className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white"
    >
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100 my-8">
        {/* Header / Brand Logo */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <FaWallet className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Create an Account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track expenses, manage budgets, and build your savings
          </p>
        </div>

        {/* Dynamic Alert Banner for errors */}
        {activeError && (
          <div className="mb-6">
            <Alert
              variant="error"
              message={activeError}
              onClose={() => {
                setClientError(null);
                setIsDismissed(true);
              }}
            />
          </div>
        )}

        {/* Registration Form */}
        <form
          data-testid="register-form"
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4"
        >
          {/* Full Name Input Field */}
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Full Name
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaUser className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                disabled={isLoading}
                value={formData.name}
                onChange={handleInputChange}
                data-testid="register-name-input"
                placeholder="John Doe"
                className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              />
            </div>
          </div>

          {/* Email Address Input Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Email Address
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaEnvelope className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                disabled={isLoading}
                value={formData.email}
                onChange={handleInputChange}
                data-testid="register-email-input"
                placeholder="you@example.com"
                className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              />
            </div>
          </div>

          {/* Password Input Field */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Password
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaLock className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={isLoading}
                value={formData.password}
                onChange={handleInputChange}
                data-testid="register-password-input"
                placeholder="••••••••"
                className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              />
              <button
                type="button"
                data-testid="register-password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={isLoading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed transition-colors focus:outline-none"
              >
                {showPassword ? (
                  <FaEyeSlash className="w-4 h-4" />
                ) : (
                  <FaEye className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Must be at least 6 characters</p>
          </div>

          {/* Confirm Password Input Field */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Confirm Password
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaLock className="w-4 h-4" aria-hidden="true" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                disabled={isLoading}
                value={formData.confirmPassword}
                onChange={handleInputChange}
                data-testid="register-confirm-password-input"
                placeholder="••••••••"
                className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              />
              <button
                type="button"
                data-testid="register-confirm-password-toggle-btn"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                disabled={isLoading}
                aria-label={
                  showConfirmPassword
                    ? 'Hide confirm password'
                    : 'Show confirm password'
                }
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 disabled:cursor-not-allowed transition-colors focus:outline-none"
              >
                {showConfirmPassword ? (
                  <FaEyeSlash className="w-4 h-4" />
                ) : (
                  <FaEye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Preferred Currency Selector */}
          <div>
            <label
              htmlFor="currency"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
            >
              Default Currency
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaMoneyBillWave className="w-4 h-4" aria-hidden="true" />
              </div>
              <select
                id="currency"
                name="currency"
                disabled={isLoading}
                value={formData.currency}
                onChange={handleInputChange}
                data-testid="register-currency-select"
                className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Can be updated anytime in settings
            </p>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            data-testid="register-submit-btn"
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-150"
          >
            {isLoading ? (
              <>
                <FaSpinner className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        {/* Switch Link to Login View */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
