import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserPlus, FaWallet } from 'react-icons/fa';

/**
 * RegisterPage Stub Component
 *
 * Temporary placeholder for the new user registration view.
 * Will be fully expanded in Task 11.
 */
const RegisterPage = () => {
  return (
    <div
      data-testid="register-page"
      className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
    >
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <FaWallet className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Create an Account</h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          Track expenses, set budgets, and achieve financial goals
        </p>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs mb-6 text-left">
          <strong>Notice:</strong> Full registration form with seed data setup is implemented in Task 11.
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/login"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            Already have an account? Sign in here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
