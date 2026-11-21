import React from 'react';
import {
  FaEdit,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaSpinner,
  FaReceipt,
  FaUndo,
} from 'react-icons/fa';
import CategoryIcon from './CategoryIcon.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

/**
 * TransactionTable Component
 *
 * Full-featured paginated table rendering transaction history with:
 * 1. Category Icon & Colored Badge: Visual categorization for every record.
 * 2. Category Name & Note: Descriptive classification with optional user note.
 * 3. Formatted Date: Clean, readable date display formatted via `formatDate`.
 * 4. Account Name Pill: Identifies source account (Cash Wallet, Savings, Checking, etc.).
 * 5. Type Badge & Colored Monetary Amount:
 *    - Green `+$X.XX` for Income
 *    - Red `-$X.XX` for Expense
 *    - Formatted according to user's currency preference.
 * 6. Action Controls: Edit (`FaEdit`) and Delete (`FaTrash`) buttons.
 * 7. Empty State: Illustrative fallback banner when no transactions match active filters,
 *    equipped with a "Reset Filters" action button.
 * 8. Loading Skeleton / Spinner: Displays visual loading feedback during network requests.
 * 9. Pagination Controls: Previous & Next buttons, page indicators, and page limit selector.
 *
 * Strict Architectural Compliance:
 * - NO Redux, NO Context API.
 * - Uses react-icons exclusively.
 *
 * @param {Object} props
 * @param {Array} [props.transactions=[]] - Array of transaction objects
 * @param {boolean} [props.loading=false] - Network loading state indicator
 * @param {number} [props.totalCount=0] - Total number of transactions matching filter in database
 * @param {number} [props.page=1] - Current active page number
 * @param {number} [props.totalPages=1] - Total computed pages from server
 * @param {number} [props.limit=10] - Items per page limit
 * @param {string} [props.currency='USD'] - Active user currency symbol or code
 * @param {Function} props.onPageChange - Callback when user navigates page: (newPage)
 * @param {Function} props.onLimitChange - Callback when user adjusts items per page: (newLimit)
 * @param {Function} props.onEdit - Callback when user clicks Edit on a transaction: (tx)
 * @param {Function} props.onDelete - Callback when user clicks Delete on a transaction: (tx)
 * @param {Function} props.onResetFilters - Callback when user clicks Reset Filters in empty state
 */
const TransactionTable = ({
  transactions = [],
  loading = false,
  totalCount = 0,
  page = 1,
  totalPages = 1,
  limit = 10,
  currency = 'USD',
  onPageChange,
  onLimitChange,
  onEdit,
  onDelete,
  onResetFilters,
}) => {
  // Compute display range for pagination summary (e.g., Showing 1-10 of 45)
  const startIndex = totalCount === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalCount);

  // Safe checks for pagination button disabled states
  const canGoPrevious = page > 1 && !loading;
  const canGoNext = page < totalPages && !loading;

  return (
    <div
      data-testid="transaction-table"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
    >
      {/* --------------------------------------------------------------------- */}
      {/* TABLE / CONTENT AREA                                                  */}
      {/* --------------------------------------------------------------------- */}
      <div className="overflow-x-auto min-h-[300px] relative">
        {/* Loading Overlay */}
        {loading && (
          <div
            data-testid="table-loading"
            className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-2"
          >
            <FaSpinner className="w-7 h-7 text-emerald-600 animate-spin" aria-hidden="true" />
            <p className="text-xs font-medium text-slate-600">Loading transactions...</p>
          </div>
        )}

        {/* Empty State Banner (when no transactions and not loading) */}
        {!loading && transactions.length === 0 ? (
          <div
            data-testid="empty-transactions"
            className="py-16 px-6 flex flex-col items-center justify-center text-center space-y-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center text-xl">
              <FaReceipt className="w-7 h-7" aria-hidden="true" />
            </div>
            <div className="max-w-sm">
              <h3 className="text-base font-bold text-slate-800">No transactions found</h3>
              <p className="text-xs text-slate-500 mt-1">
                We couldn&apos;t find any records matching your active filters. Try adjusting your search query, date range, or clear all filters.
              </p>
            </div>
            {onResetFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                <FaUndo className="w-3 h-3" aria-hidden="true" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        ) : (
          /* Table of Transactions */
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th scope="col" className="py-3.5 pl-6 pr-4">
                  Category & Note
                </th>
                <th scope="col" className="py-3.5 px-4">
                  Date
                </th>
                <th scope="col" className="py-3.5 px-4">
                  Account
                </th>
                <th scope="col" className="py-3.5 px-4">
                  Type
                </th>
                <th scope="col" className="py-3.5 px-4 text-right">
                  Amount
                </th>
                <th scope="col" className="py-3.5 pl-4 pr-6 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {transactions.map((tx) => {
                const isIncome = tx.type === 'Income';
                const categoryObj = tx.categoryId || {};
                const categoryName = categoryObj.name || tx.category || 'Uncategorized';
                const categoryIconName = categoryObj.icon || 'FaTag';
                const accountObj = tx.accountId || {};
                const accountName = accountObj.name || tx.account || 'Account';
                const displayDate = formatDate(tx.date);

                return (
                  <tr
                    key={tx._id}
                    data-testid={`transaction-row-${tx._id}`}
                    className="hover:bg-slate-50/70 transition-colors group"
                  >
                    {/* 1. Category Icon, Category Name & Note */}
                    <td className="py-3.5 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        {/* Category Icon Badge */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          <CategoryIcon icon={categoryIconName} className="w-4 h-4" />
                        </div>

                        {/* Name & Note */}
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {categoryName}
                          </p>
                          {tx.note ? (
                            <p className="text-xs text-slate-500 truncate max-w-xs" title={tx.note}>
                              {tx.note}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No note</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Date */}
                    <td className="py-3.5 px-4 text-xs font-medium text-slate-600 whitespace-nowrap">
                      {displayDate}
                    </td>

                    {/* 3. Account Pill */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {accountName}
                      </span>
                    </td>

                    {/* 4. Type Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          isIncome
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {tx.type || 'Expense'}
                      </span>
                    </td>

                    {/* 5. Colored Amount */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <span
                        className={`text-sm font-bold ${
                          isIncome ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatCurrency(tx.amount, currency)}
                      </span>
                    </td>

                    {/* 6. Action Controls: Edit & Delete */}
                    <td className="py-3.5 pl-4 pr-6 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => onEdit?.(tx)}
                          aria-label={`Edit transaction ${categoryName}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          title="Edit transaction"
                        >
                          <FaEdit className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => onDelete?.(tx)}
                          aria-label={`Delete transaction ${categoryName}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete transaction"
                        >
                          <FaTrash className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* PAGINATION FOOTER                                                     */}
      {/* --------------------------------------------------------------------- */}
      <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
        {/* Left: Records Summary + Rows Per Page Selector */}
        <div className="flex items-center gap-4">
          <p>
            Showing <span className="font-semibold text-slate-800">{startIndex}</span> to{' '}
            <span className="font-semibold text-slate-800">{endIndex}</span> of{' '}
            <span className="font-semibold text-slate-800">{totalCount}</span> transactions
          </p>

          {/* Rows per page selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="table-limit-select" className="text-slate-500">
              Per page:
            </label>
            <select
              id="table-limit-select"
              aria-label="Rows per page"
              value={limit}
              onChange={(e) => onLimitChange?.(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {/* Right: Pagination Navigation */}
        <div className="flex items-center gap-2">
          {/* Previous Page Button */}
          <button
            type="button"
            onClick={() => onPageChange?.(page - 1)}
            disabled={!canGoPrevious}
            aria-label="Previous page"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition-colors"
          >
            <FaChevronLeft className="w-2.5 h-2.5" aria-hidden="true" />
            <span>Previous</span>
          </button>

          {/* Current Page / Total Pages Indicator */}
          <span className="px-2 font-medium text-slate-700">
            Page {page} of {Math.max(1, totalPages)}
          </span>

          {/* Next Page Button */}
          <button
            type="button"
            onClick={() => onPageChange?.(page + 1)}
            disabled={!canGoNext}
            aria-label="Next page"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-slate-700 transition-colors"
          >
            <span>Next</span>
            <FaChevronRight className="w-2.5 h-2.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionTable;
