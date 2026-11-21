import React, { useState, useEffect } from 'react';
import {
  FaTimes,
  FaSpinner,
  FaCheck,
  FaBullseye,
  FaCoins,
  FaExclamationCircle,
  FaWallet,
} from 'react-icons/fa';
import { useAccounts } from '../../hooks/useAccounts.js';
import { formatCurrency } from '../../utils/formatters.js';

/**
 * GoalModal Component
 *
 * Dual-mode modal dialogue for:
 * 1. Creating or Editing a Savings Goal (title, targetAmount, currentAmount, targetDate).
 * 2. Adding a Contribution to an existing savings goal with optional source account deduction.
 *
 * Key Features:
 * - Dual Mode: Automatically switches between Goal (Create/Edit) mode and Contribute mode.
 * - Source Account Selection: Allows user to choose a source account (from useAccounts or props)
 *   to deduct funds when contributing towards a savings goal.
 * - Form Validation: Validates required title, positive target/contribution amounts, and dates.
 * - Keyboard Accessibility: Closes gracefully on 'Escape' key press.
 * - Backdrop Dismissal: Dismisses when clicking outside the dialog.
 * - Inline Feedback: Displays loading spinners and server error messages clearly.
 * - Architectural Compliance: Pure React component, react-icons exclusively, NO Redux/Context.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal dialog is rendered
 * @param {Function} props.onClose - Dismiss callback
 * @param {'create'|'edit'|'contribute'} [props.mode='create'] - Modal mode
 * @param {Object|null} [props.goal=null] - Target goal object for edit or contribution mode
 * @param {Object|null} [props.initialData=null] - Alias for goal prop in edit mode
 * @param {string} [props.currency='$'] - Currency symbol to display alongside inputs
 * @param {Array} [props.accounts] - Optional list of accounts to override useAccounts hook
 * @param {Function} [props.onSuccess] - Callback executed upon successful creation/update/contribution
 * @param {Function} [props.createGoal] - Action invoked to create a new goal
 * @param {Function} [props.updateGoal] - Action invoked to update an existing goal
 * @param {Function} [props.contributeGoal] - Action invoked to contribute funds to a goal
 */
const GoalModal = ({
  isOpen,
  onClose,
  mode = 'create',
  goal = null,
  initialData = null,
  currency = '$',
  accounts: propAccounts,
  onSuccess,
  createGoal,
  updateGoal,
  contributeGoal,
}) => {
  // Retrieve accounts from custom hook (used for contribution source account dropdown)
  const { accounts: hookAccounts = [] } = useAccounts();
  const availableAccounts = propAccounts || hookAccounts;

  // Resolved active goal object
  const activeGoal = goal || initialData;

  // Determine whether modal is in contribution mode or goal definition mode
  const isContributeMode = mode === 'contribute';
  const isEditMode = !isContributeMode && (mode === 'edit' || Boolean(activeGoal?._id));

  // ---------------------------------------------------------------------------
  // 1. FORM STATE INITIALIZATION
  // ---------------------------------------------------------------------------

  // Goal Create / Edit fields
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');

  // Contribute Mode fields
  const [contributionAmount, setContributionAmount] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');

  // UI status
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Reset or initialize form whenever modal opens or goal data changes
  useEffect(() => {
    if (isOpen) {
      if (isContributeMode) {
        // Contribute mode initialization
        setContributionAmount('');
        // Default to first account if available
        setSourceAccountId(availableAccounts.length > 0 ? availableAccounts[0]._id : '');
      } else if (activeGoal) {
        // Edit mode initialization
        setTitle(activeGoal.title || activeGoal.name || '');
        setTargetAmount(
          activeGoal.targetAmount !== undefined && activeGoal.targetAmount !== null
            ? String(activeGoal.targetAmount)
            : ''
        );
        setCurrentAmount(
          activeGoal.currentAmount !== undefined && activeGoal.currentAmount !== null
            ? String(activeGoal.currentAmount)
            : '0'
        );
        // Format ISO date to YYYY-MM-DD for date input
        if (activeGoal.targetDate) {
          const dateStr = String(activeGoal.targetDate).split('T')[0];
          setTargetDate(dateStr);
        } else {
          setTargetDate('');
        }
      } else {
        // Create mode initialization
        setTitle('');
        setTargetAmount('');
        setCurrentAmount('0');
        setTargetDate('');
      }

      setErrorMessage('');
      setFieldErrors({});
    }
  }, [isOpen, isContributeMode, activeGoal, availableAccounts.length]);

  // Handle keyboard 'Escape' key for accessibility
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

  // ---------------------------------------------------------------------------
  // 2. VALIDATION LOGIC
  // ---------------------------------------------------------------------------

  const validateGoalForm = () => {
    const errors = {};

    if (!title.trim()) {
      errors.title = 'Goal name or title is required.';
    }

    const numTarget = Number(targetAmount);
    if (!targetAmount || isNaN(numTarget) || numTarget <= 0) {
      errors.targetAmount = 'Target amount must be a number greater than 0.';
    }

    const numCurrent = Number(currentAmount);
    if (currentAmount !== '' && (isNaN(numCurrent) || numCurrent < 0)) {
      errors.currentAmount = 'Current saved amount cannot be negative.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateContributeForm = () => {
    const errors = {};

    const numAmount = Number(contributionAmount);
    if (!contributionAmount || isNaN(numAmount) || numAmount <= 0) {
      errors.contributionAmount = 'Contribution amount must be greater than 0.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ---------------------------------------------------------------------------
  // 3. FORM SUBMISSION HANDLER
  // ---------------------------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (isContributeMode) {
      if (!validateContributeForm()) return;

      if (!activeGoal?._id) {
        setErrorMessage('Cannot contribute: Goal ID is missing.');
        return;
      }

      setSubmitting(true);
      try {
        const amount = Number(contributionAmount);
        const accountId = sourceAccountId || undefined;

        let result;
        if (contributeGoal) {
          result = await contributeGoal(activeGoal._id, amount, accountId);
        } else {
          result = { success: false, error: 'Contribute handler not provided.' };
        }

        if (result && result.success) {
          if (onSuccess) onSuccess(result.goal, result.transaction);
          onClose();
        } else {
          setErrorMessage(
            result?.error || 'Failed to record contribution. Please try again.'
          );
        }
      } catch (err) {
        setErrorMessage(
          err.message || 'An unexpected error occurred while contributing.'
        );
      } finally {
        setSubmitting(false);
      }
    } else {
      // Goal Create / Edit Submission
      if (!validateGoalForm()) return;

      setSubmitting(true);
      try {
        const payload = {
          title: title.trim(),
          name: title.trim(),
          targetAmount: Number(targetAmount),
          currentAmount: Number(currentAmount) || 0,
          ...(targetDate ? { targetDate } : {}),
        };

        let result;
        if (isEditMode) {
          result = updateGoal
            ? await updateGoal(activeGoal._id, payload)
            : { success: false, error: 'Update handler not provided.' };
        } else {
          result = createGoal
            ? await createGoal(payload)
            : { success: false, error: 'Create handler not provided.' };
        }

        if (result && result.success) {
          if (onSuccess) onSuccess(result.goal);
          onClose();
        } else {
          setErrorMessage(
            result?.error || 'Failed to save savings goal. Please try again.'
          );
        }
      } catch (err) {
        setErrorMessage(
          err.message || 'An unexpected error occurred while saving the goal.'
        );
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Modal header display title
  const modalHeaderTitle = isContributeMode
    ? `Contribute to ${activeGoal?.title || activeGoal?.name || 'Goal'}`
    : isEditMode
    ? 'Edit Savings Goal'
    : 'Create New Savings Goal';

  return (
    <div
      data-testid="goal-modal"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-modal-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
                isContributeMode
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-teal-100 text-teal-600'
              }`}
            >
              {isContributeMode ? <FaCoins /> : <FaBullseye />}
            </div>
            <div>
              <h2
                id="goal-modal-title"
                className="text-lg font-bold text-slate-800 leading-tight"
              >
                {modalHeaderTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isContributeMode
                  ? 'Add funds directly or deduct from your account balance'
                  : 'Set savings targets and track milestone completion'}
              </p>
            </div>
          </div>

          <button
            type="button"
            data-testid="goal-modal-close-button"
            onClick={onClose}
            disabled={submitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Top Error Alert Banner */}
          {errorMessage && (
            <div
              data-testid="goal-modal-error"
              className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2"
            >
              <FaExclamationCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* CONTRIBUTE MODE VIEW */}
          {isContributeMode ? (
            <div className="space-y-4">
              {/* Goal Progress Summary Card */}
              {activeGoal && (
                <div className="p-3.5 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between font-medium text-slate-700">
                    <span>Target: {formatCurrency(activeGoal.targetAmount, currency)}</span>
                    <span>Currently Saved: {formatCurrency(activeGoal.currentAmount, currency)}</span>
                  </div>
                  <div className="text-slate-500 flex justify-between">
                    <span>Remaining: {formatCurrency(Math.max(0, (activeGoal.targetAmount || 0) - (activeGoal.currentAmount || 0)), currency)}</span>
                    <span className="font-semibold text-teal-600">
                      {Math.round(activeGoal.progress || 0)}% completed
                    </span>
                  </div>
                </div>
              )}

              {/* Contribution Amount Field */}
              <div>
                <label
                  htmlFor="goal-contribution-amount"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Contribution Amount ({currency}) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
                    {currency}
                  </span>
                  <input
                    id="goal-contribution-amount"
                    data-testid="goal-contribution-amount-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    placeholder="100.00"
                    disabled={submitting}
                    className={`w-full pl-8 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all ${
                      fieldErrors.contributionAmount
                        ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/20'
                        : 'border-slate-200 focus:border-teal-500 focus:ring-teal-200'
                    }`}
                  />
                </div>
                {fieldErrors.contributionAmount && (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.contributionAmount}</p>
                )}
              </div>

              {/* Source Account Selector (Optional deduction) */}
              <div>
                <label
                  htmlFor="goal-source-account"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Source Account <span className="text-slate-400 font-normal">(Optional deduction)</span>
                </label>
                <div className="relative">
                  <select
                    id="goal-source-account"
                    data-testid="goal-source-account-select"
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    disabled={submitting}
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none transition-all bg-white"
                  >
                    <option value="">None (Cash / Manual Deposit)</option>
                    {availableAccounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name} — {formatCurrency(acc.balance, currency)} ({acc.type})
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Selecting an account deducts the contributed amount from that account's balance.
                </p>
              </div>
            </div>
          ) : (
            /* CREATE / EDIT GOAL MODE VIEW */
            <div className="space-y-4">
              {/* Goal Title / Name */}
              <div>
                <label
                  htmlFor="goal-title"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Goal Name / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  id="goal-title"
                  data-testid="goal-title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Emergency Fund, New Laptop, Vacation"
                  disabled={submitting}
                  className={`w-full px-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all ${
                    fieldErrors.title
                      ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/20'
                      : 'border-slate-200 focus:border-teal-500 focus:ring-teal-200'
                  }`}
                />
                {fieldErrors.title && (
                  <p className="mt-1 text-xs text-rose-600">{fieldErrors.title}</p>
                )}
              </div>

              {/* Target Amount ($) & Current Saved Amount ($) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="goal-target-amount"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Target Amount ({currency}) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
                      {currency}
                    </span>
                    <input
                      id="goal-target-amount"
                      data-testid="goal-target-amount-input"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="5000.00"
                      disabled={submitting}
                      className={`w-full pl-8 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.targetAmount
                          ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/20'
                          : 'border-slate-200 focus:border-teal-500 focus:ring-teal-200'
                      }`}
                    />
                  </div>
                  {fieldErrors.targetAmount && (
                    <p className="mt-1 text-xs text-rose-600">{fieldErrors.targetAmount}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="goal-current-amount"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Current Saved ({currency})
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-sm">
                      {currency}
                    </span>
                    <input
                      id="goal-current-amount"
                      data-testid="goal-current-amount-input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={currentAmount}
                      onChange={(e) => setCurrentAmount(e.target.value)}
                      placeholder="0.00"
                      disabled={submitting}
                      className={`w-full pl-8 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.currentAmount
                          ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/20'
                          : 'border-slate-200 focus:border-teal-500 focus:ring-teal-200'
                      }`}
                    />
                  </div>
                  {fieldErrors.currentAmount && (
                    <p className="mt-1 text-xs text-rose-600">{fieldErrors.currentAmount}</p>
                  )}
                </div>
              </div>

              {/* Target Date (Date picker) */}
              <div>
                <label
                  htmlFor="goal-target-date"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Target Date <span className="text-slate-400 font-normal">(Optional deadline)</span>
                </label>
                <input
                  id="goal-target-date"
                  data-testid="goal-target-date-input"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  disabled={submitting}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 focus:outline-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Modal Actions Footer */}
          <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              data-testid="goal-modal-cancel-button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              data-testid="goal-modal-submit-button"
              disabled={submitting}
              className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium rounded-xl text-white transition-all shadow-sm ${
                isContributeMode
                  ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/10'
                  : 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/10'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {submitting ? (
                <>
                  <FaSpinner className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FaCheck className="w-3.5 h-3.5" />
                  <span>
                    {isContributeMode
                      ? 'Add Contribution'
                      : isEditMode
                      ? 'Update Goal'
                      : 'Create Goal'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalModal;
