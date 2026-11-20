import React from 'react';
import { FaBullseye } from 'react-icons/fa';

/**
 * GoalsPage Stub Component
 *
 * Friendly placeholder for the financial savings goals view.
 * Will be fully constructed in Task 16 with progress bars and contribution modals.
 */
const GoalsPage = () => {
  return (
    <div data-testid="goals-page" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
          <FaBullseye className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financial Goals</h1>
          <p className="text-sm text-slate-500">
            Set and track savings targets for emergencies, vacations, and large purchases.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm text-slate-600">
          Savings goals tracker and target milestones will be rendered here.
        </p>
      </div>
    </div>
  );
};

export default GoalsPage;
