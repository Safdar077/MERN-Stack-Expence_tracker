import React, { useState, useEffect } from 'react';
import { FaTimes, FaSpinner, FaCheck, FaExclamationCircle } from 'react-icons/fa';

/**
 * Account Types supported by the application.
 */
const ACCOUNT_TYPES = [
  'Bank Account',
  'Cash',
  'Credit Card',
  'Wallet',
  'Savings',
];

/**
 * AccountModal Component
 *
 * Dedicated modal dialogue for creating new financial accounts or updating existing accounts.
 * Controlled component relying on action callbacks passed from the parent view.
 *
 * Key Features:
 * 1. Dual Mode Operation: Automatically adapts to "Add Account" or "Edit Account" based on `initialData`.
 * 2. Form Validation: Validates required name and balance formats prior to API dispatch.
 * 3. Default Account Selection: Allows marking an account as the primary default account.
 * 4. Keyboard Accessibility: Closes gracefully on 'Escape' key press.
 * 5. Backdrop Dismissal: Dismisses when clicking outside the dialog.
 * 6. Inline Feedback: Displays loading spinners and server error messages clearly.
 *
 * Architectural Compliance:
 * - NO Redux, NO Context API — pure controlled component with local useState.
 * - react-icons exclusively (no lucide-react).
 * - Beginner-friendly inline documentation.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal dialog is rendered
 * @param {Function} props.onClose - Dismiss callback
 * @param {Object|null} [props.initialData=null] - Existing account object for edit mode
 * @param {string} [props.currency='$'] - Currency symbol to display alongside balance input
 * @param {Function} [props.onSuccess] - Callback executed upon successful creation/update
 * @param {Function} props.createAccount - Action invoked to create a new account
 * @param {Function} props.updateAccount - Action invoked to update an existing account
 */
const AccountModal = ({
  isOpen,
  onClose,
  initialData = null,
  currency = '$',
  onSuccess,
  createAccount,
  updateAccount,
}) => {
  // Form input states
  const [name, setName] = useState('');
  const [type, setType] = useState('Bank Account');
  const [balance, setBalance] = useState('0');
  const [isDefault, setIsDefault] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const isEditMode = Boolean(initialData && initialData._id);

  // Initialize or reset form fields whenever modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setType(initialData.type || 'Bank Account');
        setBalance(
          initialData.balance !== undefined && initialData.balance !== null
            ? String(initialData.balance)
            : '0'
        );
        setIsDefault(Boolean(initialData.isDefault));
      } else {
        setName('');
        setType('Bank Account');
        setBalance('0');
        setIsDefault(false);
      }
      setErrorMessage('');
      setFieldErrors({});
    }
  }, [isOpen, initialData]);

  // Handle keyboard 'Escape' key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, submitting, onClose]);

  if (!isOpen) {
    return null;
  }

  // Handle clicking outside the modal dialog box
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !submitting) {
      onClose();
    }
  };

  /**
   * Validates form inputs.
   * Returns true if valid, false otherwise.
   */
  const validateForm = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Account name is required.';
    }

    const numBalance = Number(balance);
    if (balance === '' || isNaN(numBalance)) {
      errors.balance = 'Balance must be a valid number.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Form submission handler.
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        type,
        balance: Number(balance),
        isDefault,
      };

      let result;
      if (isEditMode) {
        result = updateAccount
          ? await updateAccount(initialData._id, payload)
          : { success: false, error: 'Update handler missing.' };
      } else {
        result = createAccount
          ? await createAccount(payload)
          : { success: false, error: 'Create handler missing.' };
      }

      if (result && result.success) {
        if (onSuccess) {
          onSuccess(result.account);
        }
        onClose();
      } else {
        setErrorMessage(
          result?.error || 'An error occurred while saving the account.'
        );
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="account-modal"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2
              id="account-modal-title"
              className="text-lg font-bold text-slate-800"
            >
              {isEditMode ? 'Edit Account' : 'Add Account'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditMode
                ? 'Update your account details and current balance.'
                : 'Create a new account to organize your money.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Server / Mutation Error Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <FaExclamationCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Account Name */}
          <div>
            <label
              htmlFor="account-name"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Account Name <span className="text-rose-500">*</span>
            </label>
            <input
              id="account-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors((prev) => ({ ...prev, name: null }));
                }
              }}
              placeholder="e.g. Chase Checking, Cash Wallet, Vault Savings"
              disabled={submitting}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors ${
                fieldErrors.name
                  ? 'border-rose-300 bg-rose-50/30'
                  : 'border-slate-200 bg-white'
              }`}
            />
            {fieldErrors.name && (
              <p className="text-xs text-rose-500 mt-1">{fieldErrors.name}</p>
            )}
          </div>

          {/* Account Type Selector */}
          <div>
            <label
              htmlFor="account-type"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Account Type
            </label>
            <select
              id="account-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Initial / Current Balance */}
          <div>
            <label
              htmlFor="account-balance"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              {isEditMode ? 'Current Balance' : 'Initial Balance'} ({currency})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                {currency}
              </span>
              <input
                id="account-balance"
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => {
                  setBalance(e.target.value);
                  if (fieldErrors.balance) {
                    setFieldErrors((prev) => ({ ...prev, balance: null }));
                  }
                }}
                disabled={submitting}
                className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors ${
                  fieldErrors.balance
                    ? 'border-rose-300 bg-rose-50/30'
                    : 'border-slate-200 bg-white'
                }`}
              />
            </div>
            {fieldErrors.balance && (
              <p className="text-xs text-rose-500 mt-1">{fieldErrors.balance}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              For credit cards, you can enter a negative amount if you carry a balance.
            </p>
          </div>

          {/* Default Account Checkbox */}
          <div className="pt-2">
            <label
              htmlFor="account-default"
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <input
                id="account-default"
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                disabled={submitting}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
              />
              <span className="text-sm font-medium text-slate-700">
                Set as default account
              </span>
            </label>
            <p className="text-xs text-slate-400 ml-6.5 mt-0.5">
              New transactions will automatically pre-select this account.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FaCheck className="w-3.5 h-3.5" />
                  <span>{isEditMode ? 'Save Changes' : 'Create Account'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountModal;
