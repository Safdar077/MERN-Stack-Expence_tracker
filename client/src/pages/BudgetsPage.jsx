import React from 'react';
import { FaPiggyBank } from 'react-icons/fa';

/**
 * BudgetsPage Stub Component
 *
 * Friendly placeholder for the budgets planning and threshold warnings view.
 * Will be fully constructed in Task 15.
 */
const BudgetsPage = () => {
  return (
    <div data-testid="budgets-page" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
          <FaPiggyBank className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Monthly Budgets</h1>
          <p className="text-sm text-slate-500">
            Set overall limits and category spending thresholds to stay on budget.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm text-slate-600">
          Monthly budget controls and category limits will be rendered here.
        </p>
      </div>
    </div>
  );
};

export default BudgetsPage;
