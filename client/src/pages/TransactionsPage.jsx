import React from 'react';
import { FaExchangeAlt } from 'react-icons/fa';

/**
 * TransactionsPage Stub Component
 *
 * Friendly placeholder for the transactions history view.
 * Will be fully constructed in Task 13 with table filters, pagination,
 * CSV export, and modal CRUD operations.
 */
const TransactionsPage = () => {
  return (
    <div data-testid="transactions-page" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
          <FaExchangeAlt className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transactions</h1>
          <p className="text-sm text-slate-500">
            View, filter, search, and export your income and expense records.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm text-slate-600">
          Transaction management table and advanced search will be rendered here.
        </p>
      </div>
    </div>
  );
};

export default TransactionsPage;
