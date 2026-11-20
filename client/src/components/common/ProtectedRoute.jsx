import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

/**
 * ProtectedRoute Component
 *
 * Route guard that ensures only authenticated users can access private routes
 * such as the Dashboard, Transactions, Accounts, Budgets, Goals, and Analytics.
 *
 * How it works:
 * 1. Checks authentication status using the custom `useAuth` hook.
 * 2. Cross-checks `localStorage` for a saved JWT token as a synchronous fallback
 *    to prevent layout flickering on page refreshes.
 * 3. If authenticated:
 *    Renders the nested child route via React Router's `<Outlet />` (or `children` prop).
 * 4. If not authenticated:
 *    Redirects the user to the `/login` route using `<Navigate to="/login" replace />`.
 *    The `replace` attribute prevents the unauthenticated URL from polluting the
 *    browser's navigation history, preventing infinite redirect loops on back navigation.
 *
 * Strict Architectural Rule:
 * Pure React custom hooks + localStorage only — NO Redux, NO Context API.
 */
const ProtectedRoute = ({ children }) => {
  // Retrieve token and loading state from the custom useAuth hook
  const { token, loading } = useAuth();

  // Fallback to localStorage check in case hook state hasn't resolved yet
  const storedToken =
    typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;

  const isAuthenticated = Boolean(token || storedToken);

  // If currently validating authentication state with no cached token,
  // show a clean loading indicator instead of prematurely redirecting to login.
  if (loading && !storedToken) {
    return (
      <div
        data-testid="protected-route-loading"
        className="min-h-screen flex items-center justify-center bg-slate-50"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Verifying session...</p>
        </div>
      </div>
    );
  }

  // If user is not authenticated, redirect to the login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated, render child components or the nested Outlet route
  return children ? children : <Outlet />;
};

export default ProtectedRoute;
