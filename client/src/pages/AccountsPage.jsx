import React from 'react';
import { FaCreditCard } from 'react-icons/fa';

/**
 * AccountsPage Stub Component
 *
 * Friendly placeholder for the accounts & cards management view.
 * Will be fully constructed in Task 14 with account cards, transfers,
 * and balance tracking.
 */
const AccountsPage = () => {
  return (
    <div data-testid="accounts-page" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
          <FaCreditCard className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Accounts & Wallets</h1>
          <p className="text-sm text-slate-500">
            Manage checking, savings, credit cards, and cash accounts.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm text-slate-600">
          Account cards and balance management will be rendered here.
        </p>
      </div>
    </div>
  );
};

export default AccountsPage;
