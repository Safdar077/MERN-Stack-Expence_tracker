import React, { useState } from 'react';
import {
  FaCreditCard,
  FaPlus,
  FaExclamationTriangle,
  FaSpinner,
  FaTrash,
  FaWallet,
  FaPiggyBank,
  FaCheckCircle,
} from 'react-icons/fa';
import { useAccounts } from '../hooks/useAccounts.js';
import { useAuth } from '../hooks/useAuth.js';
import AccountCard from '../components/accounts/AccountCard.jsx';
import AccountModal from '../components/accounts/AccountModal.jsx';
import { formatCurrency } from '../utils/formatters.js';

/**
 * AccountsPage Component
 *
 * Primary interface for managing financial accounts (Bank, Cash, Credit Card, Wallet, Savings).
 *
 * Core Capabilities:
 * 1. Top Summary Banner: Aggregates total net worth across all accounts with active account counts.
 * 2. Visual Account Grid: Renders accounts with dedicated cards highlighting Savings accounts.
 * 3. Add & Edit Account Modals: Modal workflows for adding new accounts or modifying existing ones.
 * 4. Safe Account Deletion: Confirmation dialog ensuring deliberate account removal.
 * 5. Clean Empty State: Guides new users to add their first financial account.
 *
 * Architectural Constraints:
 * - STRICTLY NO Redux, NO Context API — pure React state and useAccounts / useAuth hooks.
 * - react-icons exclusively (no lucide-react).
 * - Beginner-friendly inline documentation.
 */
const AccountsPage = () => {
  // ---------------------------------------------------------------------------
  // 1. DATA HOOKS & LOCAL STATE
  // ---------------------------------------------------------------------------
  const { user } = useAuth();
  const currency = user?.currency || '$';

  const {
    accounts = [],
    totalBalance = 0,
    loading,
    error,
    createAccount,
    updateAccount,
    deleteAccount,
  } = useAccounts();

  // Modal control states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  // Delete confirmation dialog states
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // ---------------------------------------------------------------------------
  // 2. MODAL & ACTION HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Opens modal in Create/Add mode.
   */
  const handleOpenAdd = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  /**
   * Opens modal in Edit mode with selected account data.
   */
  const handleOpenEdit = (account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  /**
   * Closes the AccountModal dialog.
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  /**
   * Opens delete confirmation dialog for a specific account.
   */
  const handleOpenDelete = (account) => {
    setDeleteError(null);
    setAccountToDelete(account);
  };

  /**
   * Dismisses the delete confirmation dialog.
   */
  const handleCloseDelete = () => {
    if (deleting) return;
    setAccountToDelete(null);
    setDeleteError(null);
  };

  /**
   * Confirms and executes account deletion.
   */
  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteAccount(accountToDelete._id);
      if (result && result.success) {
        setAccountToDelete(null);
      } else {
        setDeleteError(result?.error || 'Failed to delete account.');
      }
    } catch (err) {
      setDeleteError(err.message || 'An error occurred while deleting account.');
    } finally {
      setDeleting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 3. AGGREGATE CALCULATIONS
  // ---------------------------------------------------------------------------
  const totalSavings = accounts
    .filter((acc) => acc.type === 'Savings')
    .reduce((sum, acc) => sum + (acc.balance || 0), 0);

  const activeCount = accounts.length;

  // ---------------------------------------------------------------------------
  // 4. RENDER
  // ---------------------------------------------------------------------------
  return (
    <div data-testid="accounts-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <FaCreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Accounts & Wallets</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Manage checking, savings, credit cards, and cash accounts.
            </p>
          </div>
        </div>

        {/* Primary Add Account Action */}
        <button
          type="button"
          data-testid="add-account-btn"
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
        >
          <FaPlus className="w-3.5 h-3.5" />
          <span>Add Account</span>
        </button>
      </div>

      {/* Global Error Alert Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <FaExclamationTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Summary Banner: Combined Net Worth */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200/80">
              Total Net Worth
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
              {formatCurrency(totalBalance, currency)}
            </div>
            <p className="text-xs text-indigo-200/70 mt-1.5 flex items-center gap-2">
              <span>Combined balance across all connected accounts</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 md:pt-0 border-t md:border-t-0 border-indigo-800/40">
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/10">
              <span className="text-xs text-indigo-200 block">Active Accounts</span>
              <span className="text-lg font-bold text-white">
                {activeCount} {activeCount === 1 ? 'Active Account' : 'Active Accounts'}
              </span>
            </div>

            {totalSavings > 0 && (
              <div className="bg-emerald-500/15 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-emerald-400/20">
                <span className="text-xs text-emerald-200 block flex items-center gap-1">
                  <FaPiggyBank className="w-3 h-3 text-emerald-400" />
                  Total Savings
                </span>
                <span className="text-lg font-bold text-emerald-300">
                  {formatCurrency(totalSavings, currency)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Account Cards Grid or Empty State */}
      {loading && accounts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <FaSpinner className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading accounts...</p>
        </div>
      ) : accounts.length === 0 ? (
        <div
          data-testid="empty-accounts-state"
          className="bg-white p-10 sm:p-14 rounded-2xl border border-slate-200 text-center shadow-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-4">
            <FaWallet className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">No accounts added yet</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Add your bank accounts, credit cards, cash, or savings to track your net worth
            and record transactions seamlessly.
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            <FaPlus className="w-3.5 h-3.5" />
            <span>Add Your First Account</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((acc) => (
            <AccountCard
              key={acc._id}
              account={acc}
              currency={currency}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
            />
          ))}
        </div>
      )}

      {/* Account Add / Edit Modal */}
      <AccountModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        initialData={editingAccount}
        currency={currency}
        createAccount={createAccount}
        updateAccount={updateAccount}
      />

      {/* Delete Confirmation Safety Dialog */}
      {accountToDelete && (
        <div
          data-testid="account-delete-modal"
          onClick={handleCloseDelete}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-100 space-y-4"
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <FaExclamationTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-800">Delete Account</h3>
              <p className="text-sm text-slate-500 mt-2">
                Are you sure you want to delete{' '}
                <strong className="text-slate-700 font-semibold">
                  {accountToDelete.name}
                </strong>
                ? This will remove the account and may affect associated transactions.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-account-btn"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <FaSpinner className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <FaTrash className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPage;
