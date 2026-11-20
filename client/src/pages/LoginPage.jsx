import React from 'react';
import { Link } from 'react-router-dom';
import { FaLock, FaWallet } from 'react-icons/fa';

/**
 * LoginPage Stub Component
 *
 * Temporary placeholder for the authentication login view.
 * Will be fully expanded in Task 11 with interactive form inputs,
 * validation, and useAuth integration.
 */
const LoginPage = () => {
  return (
    <div
      data-testid="login-page"
      className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
    >
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <FaWallet className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Welcome Back</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Sign in to your Expense Tracker account
        </p>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs mb-6 text-left">
          <strong>Notice:</strong> Complete authentication form is implemented in Task 11.
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/register"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            Don't have an account? Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
