import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  FaWallet,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
} from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth.js';
import Alert from '../components/common/Alert.jsx';

/**
 * Regular expression used to validate standard email address syntax.
 * Checks for non-empty local part, an "@" symbol, domain name, and valid TLD.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * LoginPage Component
 *
 * Provides a responsive, accessible login view allowing existing users to
 * authenticate using their email address and password.
 *
 * Architectural Features:
 * - Direct integration with custom `useAuth` hook for authentication actions.
 * - Pure local component state for form field management (NO Redux, NO Context API).
 * - Client-side validation for required fields and valid email format.
 * - Integration with reusable `Alert` banner for both client and server errors.
 * - Seamless post-login navigation to the requested protected route or fallback `/dashboard`.
 *
 * @returns {React.ReactElement} The rendered login page component.
 */
const LoginPage = () => {
  // ---------------------------------------------------------------------------
  // 1. HOOKS & ROUTING
  // ---------------------------------------------------------------------------
  const navigate = useNavigate();
  const location = useLocation();

  // Extract authentication operations and state from custom useAuth hook
  const { login, loading: authLoading, error: authError } = useAuth();

  // ---------------------------------------------------------------------------
  // 2. COMPONENT LOCAL STATE
  // ---------------------------------------------------------------------------
  // Form input field values
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  // Controls password visibility toggle (type="password" vs type="text")
  const [showPassword, setShowPassword] = useState(false);

  // Local client-side validation error message
  const [clientError, setClientError] = useState(null);

  // Local submitting state to guarantee immediate responsive button disable
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
   * Updates state when user types into any form input field.
   * Also clears active errors and dismissal state to provide a smooth UX.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Reset error when user resumes editing fields
    if (clientError) {
      setClientError(null);
    }
    setIsDismissed(true);
  };

  /**
   * Toggles the visibility of the password characters.
   */
  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  /**
   * Validates form input fields before dispatching login request.
   *
   * @returns {string|null} Error message string if validation fails, or null if valid.
   */
  const validateForm = () => {
    const trimmedEmail = formData.email.trim();

    if (!trimmedEmail) {
      return 'Email is required. Please enter your email address.';
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return 'Please enter a valid email address (e.g., user@example.com).';
    }

    if (!formData.password) {
      return 'Password is required. Please enter your password.';
    }

    return null;
  };

  /**
   * Form submission handler.
   * Validates inputs, calls login() from useAuth, and navigates on success.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reset dismissal flag on every submit attempt
    setIsDismissed(false);

    // 1. Run client-side validation
    const validationError = validateForm();
    if (validationError) {
      setClientError(validationError);
      return;
    }

    setClientError(null);
    setIsSubmitting(true);

    try {
      // 2. Dispatch login action via useAuth hook
      const result = await login(formData.email.trim(), formData.password);

      if (result && result.success) {
        // 3. Successful login: Navigate to origin page or default /dashboard
        const redirectPath = location.state?.from?.pathname || '/dashboard';
        navigate(redirectPath, { replace: true });
      } else if (result && !result.success && result.error) {
        // Explicitly set server error in client state if needed
        setClientError(result.error);
      }
    } catch (err) {
      // Catch unexpected errors
      setClientError(
        err.message || 'An unexpected error occurred during login. Please try again.'
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
      data-testid="login-page"
      className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white"
    >
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
        {/* Brand / Logo Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
            <FaWallet className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Sign in to your Expense Tracker account
          </p>
        </div>

        {/* Dynamic Alert Banner for validation or server error messages */}
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

        {/* Login Form */}
        <form
          data-testid="login-form"
          onSubmit={handleSubmit}
          noValidate
          className="space-y-4"
        >
          {/* Email Input Field */}
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
                data-testid="login-email-input"
                placeholder="you@example.com"
                className="block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              />
            </div>
          </div>

          {/* Password Input Field with Visibility Toggle */}
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
                autoComplete="current-password"
                disabled={isLoading}
                value={formData.password}
                onChange={handleInputChange}
                data-testid="login-password-input"
                placeholder="••••••••"
                className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              />
              <button
                type="button"
                data-testid="password-toggle-btn"
                onClick={togglePasswordVisibility}
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
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            data-testid="login-submit-btn"
            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all duration-150"
          >
            {isLoading ? (
              <>
                <FaSpinner className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span>Signing In...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Switch Link to Registration View */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors"
            >
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
