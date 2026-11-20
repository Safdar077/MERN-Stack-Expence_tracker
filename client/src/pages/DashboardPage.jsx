import React from 'react';
import { FaTachometerAlt } from 'react-icons/fa';

/**
 * DashboardPage Stub Component
 *
 * Friendly placeholder for the main financial overview dashboard.
 * Will be fully constructed in Task 12 with summary cards, budget progress,
 * and quick transaction logging modal.
 */
const DashboardPage = () => {
  return (
    <div data-testid="dashboard-page" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
          <FaTachometerAlt className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financial Dashboard</h1>
          <p className="text-sm text-slate-500">
            Real-time balance, monthly budget progress, and recent spending.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm text-slate-600">
          Welcome to your Expense Tracker dashboard. Full dashboard metrics and charts are being integrated in upcoming tasks.
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;
