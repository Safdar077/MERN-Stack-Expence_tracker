import React, { useEffect } from 'react';
import {
  FaTimes,
  FaTrash,
  FaSpinner,
  FaExclamationTriangle,
} from 'react-icons/fa';
import CategoryIcon from './CategoryIcon.jsx';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

/**
 * DeleteConfirmModal Component
 *
 * Dedicated modal dialogue requiring explicit user confirmation before permanently
 * removing a transaction from the database and restoring source account balance.
 *
 * Key Features:
 * 1. Transaction Summary: Clearly presents Category, Note, Date, Account, and Amount.
 * 2. Visual Warning: Highlights the irreversibility of deletion with amber/rose iconography.
 * 3. Loading State: Disables buttons and displays an animated spinner while delete mutation runs.
 * 4. Keyboard Accessibility: Dismisses dialogue on 'Escape' key press.
 * 5. Backdrop Dismiss: Dismisses dialogue when clicking outside the modal container.
 *
 * Strict Architectural Compliance:
 * - NO Redux, NO Context API.
 * - Uses react-icons exclusively.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the confirmation modal is visible
 * @param {Function} props.onClose - Callback invoked to dismiss the modal without deleting
 * @param {Function} props.onConfirm - Callback invoked when the user confirms deletion
 * @param {Object|null} props.transaction - The transaction object pending deletion
 * @param {boolean} [props.loading=false] - Whether the delete request is currently executing
 * @param {string} [props.currency='USD'] - Active user currency symbol or code
 */
const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  transaction,
  loading = false,
  currency = 'USD',
}) => {
  // Listen for 'Escape' key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !transaction) {
    return null;
  }

  // Handle click on outer backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  const isIncome = transaction.type === 'Income';
  const categoryObj = transaction.categoryId || {};
  const categoryName = categoryObj.name || transaction.category || 'Uncategorized';
  const categoryIconName = categoryObj.icon || 'FaTag';
  const accountObj = transaction.accountId || {};
  const accountName = accountObj.name || transaction.account || 'Account';
  const displayDate = formatDate(transaction.date);

  return (
    <div
      data-testid="delete-confirm-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scale-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
              <FaExclamationTriangle className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="delete-modal-title" className="text-base font-bold text-slate-800">
                Delete Transaction
              </h2>
              <p className="text-xs text-slate-500">This action cannot be undone</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
          >
            <FaTimes className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to permanently delete this transaction? Deleting will also reverse its balance impact on your{' '}
            <span className="font-semibold text-slate-800">{accountName}</span> account.
          </p>

          {/* Transaction Summary Box */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs">
            {/* Category & Amount Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                  }`}
                >
                  <CategoryIcon icon={categoryIconName} className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-slate-800">{categoryName}</span>
              </div>

              {/* Amount */}
              <span
                className={`font-bold text-sm ${
                  isIncome ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {isIncome ? '+' : '-'}
                {formatCurrency(transaction.amount, currency)}
              </span>
            </div>

            {/* Account & Date Details */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-slate-600">
              <div>
                <span className="text-[11px] text-slate-400 block">Account</span>
                <span className="font-medium text-slate-700">{accountName}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Date</span>
                <span className="font-medium text-slate-700">{displayDate}</span>
              </div>
            </div>

            {/* Note (if present) */}
            {transaction.note && (
              <div className="pt-2 border-t border-slate-200/80 text-slate-600">
                <span className="text-[11px] text-slate-400 block">Note</span>
                <span className="font-medium text-slate-700 break-words">{transaction.note}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <FaSpinner className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <FaTrash className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Delete Transaction</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
