import React, { useState, useEffect } from 'react';
import {
  FaTimes,
  FaCheck,
  FaCalendarAlt,
  FaMoneyBillWave,
  FaTag,
  FaWallet,
  FaStickyNote,
  FaSyncAlt,
} from 'react-icons/fa';
import { useCategories } from '../../hooks/useCategories.js';
import { useAccounts } from '../../hooks/useAccounts.js';
import { useTransactions } from '../../hooks/useTransactions.js';
import { useRecurring } from '../../hooks/useRecurring.js';

/**
 * TransactionModal Component
 *
 * Full-featured modal dialogue supporting both ADD and EDIT operations for financial transactions.
 *
 * Key Capabilities:
 * 1. Segmented Type Selector: Effortlessly switch between "Expense" and "Income".
 * 2. Dynamic Category Filtering: Automatically filters categories based on selected Type.
 * 3. Multi-Account / Wallet Selector: Allows explicit choice to spend from / deposit into
 *    "Cash Wallet", "Savings", "Checking Account", etc.
 * 4. Recurring Automation Toggle: Optional checkbox that expands frequency selection
 *    (Daily, Weekly, Monthly, Yearly) to automatically schedule recurring transactions.
 * 5. Validation & Error Handling: Pre-submission checks for positive amount, valid category,
 *    and selected account.
 * 6. Keyboard & Backdrop Accessibility: Closes on 'Escape' key press or backdrop click.
 *
 * Strict Architectural Compliance:
 * - NO Redux, NO Context API — pure React custom hooks.
 * - Uses `react-icons` exclusively.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal dialogue is currently visible
 * @param {Function} props.onClose - Callback triggered when the modal is closed/dismissed
 * @param {Object} [props.initialData] - Existing transaction data when in Edit mode
 * @param {Object} [props.transactionToEdit] - Alias for initialData for API flexibility
 * @param {Function} [props.onSuccess] - Callback invoked when create/update finishes successfully
 */
const TransactionModal = ({
  isOpen,
  onClose,
  initialData,
  transactionToEdit,
  onSuccess,
}) => {
  // Support either `initialData` or `transactionToEdit` prop
  const activeTx = initialData || transactionToEdit || null;
  const isEditMode = Boolean(activeTx && activeTx._id);

  // Hook integrations
  const { categories, expenseCategories, incomeCategories } = useCategories();
  const { accounts } = useAccounts();
  const { addTransaction, editTransaction } = useTransactions();
  const { addRecurring } = useRecurring();

  // Helper for today's ISO date string (YYYY-MM-DD)
  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  // ---------------------------------------------------------------------------
  // 1. FORM STATE
  // ---------------------------------------------------------------------------
  const [type, setType] = useState('Expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(getTodayDateString());
  const [note, setNote] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('Monthly');

  // Submission & Validation state
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  // ---------------------------------------------------------------------------
  // 2. FORM INITIALIZATION & RESET ON OPEN / PROPS CHANGE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;

    if (activeTx) {
      // Pre-fill form values in Edit mode
      setType(activeTx.type || 'Expense');
      setAmount(activeTx.amount !== undefined ? String(activeTx.amount) : '');

      // Support populated objects or raw ID strings
      const extractedCategoryId =
        activeTx.categoryId?._id || activeTx.categoryId || '';
      setCategoryId(extractedCategoryId);

      const extractedAccountId =
        activeTx.accountId?._id || activeTx.accountId || '';
      setAccountId(extractedAccountId);

      // Extract ISO date portion
      const rawDate = activeTx.date
        ? new Date(activeTx.date).toISOString().split('T')[0]
        : getTodayDateString();
      setDate(rawDate);

      setNote(activeTx.note || '');
      setIsRecurring(Boolean(activeTx.isRecurring));
      setFrequency(activeTx.frequency || 'Monthly');
    } else {
      // Default initial state in Add mode
      setType('Expense');
      setAmount('');
      setDate(getTodayDateString());
      setNote('');
      setIsRecurring(false);
      setFrequency('Monthly');

      // Auto-select first account if available
      if (accounts && accounts.length > 0) {
        setAccountId(accounts[0]._id);
      } else {
        setAccountId('');
      }

      // Auto-select first expense category if available
      if (expenseCategories && expenseCategories.length > 0) {
        setCategoryId(expenseCategories[0]._id);
      } else {
        setCategoryId('');
      }
    }

    setErrors({});
    setServerError(null);
  }, [isOpen, activeTx, accounts, expenseCategories]);

  // When type changes (Expense <-> Income), auto-update category if current category belongs to old type
  const handleTypeChange = (newType) => {
    setType(newType);
    setErrors((prev) => ({ ...prev, categoryId: null }));

    const matchingCategories =
      newType === 'Income' ? incomeCategories : expenseCategories;
    if (matchingCategories && matchingCategories.length > 0) {
      // If current category doesn't match new type, pick first available
      const exists = matchingCategories.some((c) => c._id === categoryId);
      if (!exists) {
        setCategoryId(matchingCategories[0]._id);
      }
    } else {
      setCategoryId('');
    }
  };

  // ---------------------------------------------------------------------------
  // 3. KEYBOARD ACCESSIBILITY (ESCAPE KEY)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Active category list based on currently selected Type
  const availableCategories =
    type === 'Income' ? incomeCategories : expenseCategories;

  // ---------------------------------------------------------------------------
  // 4. CLIENT-SIDE VALIDATION
  // ---------------------------------------------------------------------------
  const validateForm = () => {
    const newErrors = {};

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!categoryId) {
      newErrors.categoryId = 'Please select a category';
    }

    if (!accountId) {
      newErrors.accountId = 'Please select an account or wallet';
    }

    if (!date) {
      newErrors.date = 'Please specify a transaction date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ---------------------------------------------------------------------------
  // 5. FORM SUBMISSION
  // ---------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const parsedAmount = parseFloat(amount);
      const payload = {
        amount: parsedAmount,
        type,
        categoryId,
        accountId,
        date,
        note: note.trim(),
        isRecurring,
      };

      let result;
      if (isEditMode) {
        result = await editTransaction(activeTx._id, payload);
      } else {
        result = await addTransaction(payload);

        // If recurring transaction is selected, also register the recurring rule
        if (result && result.success && isRecurring && addRecurring) {
          const selectedCategory = categories.find((c) => c._id === categoryId);
          const recurringTitle = note.trim() || selectedCategory?.name || `${type} Schedule`;

          await addRecurring({
            title: recurringTitle,
            name: recurringTitle,
            amount: parsedAmount,
            type,
            categoryId,
            accountId,
            frequency,
            startDate: date,
            nextDueDate: date,
          });
        }
      }

      if (result && result.success) {
        if (onSuccess) onSuccess(result.transaction);
        onClose();
      } else {
        setServerError(result?.error || 'Failed to save transaction');
      }
    } catch (err) {
      setServerError(err.message || 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="transaction-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        // Close when clicking directly on the backdrop container
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
        {/* ----------------------------------------------------------------- */}
        {/* MODAL HEADER                                                      */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {isEditMode ? 'Edit Transaction' : 'Add Transaction'}
            </h2>
            <p className="text-xs text-slate-500">
              {isEditMode
                ? 'Update your existing financial record'
                : 'Log a new income or expense item'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* SERVER ERROR ALERT                                                */}
        {/* ----------------------------------------------------------------- */}
        {serverError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl font-medium">
            {serverError}
          </div>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* TRANSACTION FORM                                                  */}
        {/* ----------------------------------------------------------------- */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Segmented Type Toggle: Expense vs Income */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange('Expense')}
                className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  type === 'Expense'
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('Income')}
                className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  type === 'Income'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label
              htmlFor="tx-amount"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Amount
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaMoneyBillWave className="w-4 h-4" />
              </div>
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: null }));
                }}
                className={`block w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 ${
                  errors.amount
                    ? 'border-rose-300 focus:ring-rose-400'
                    : 'border-slate-200 focus:ring-emerald-500'
                }`}
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.amount}</p>
            )}
          </div>

          {/* Row: Category & Account Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Select */}
            <div>
              <label
                htmlFor="tx-category"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Category
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FaTag className="w-3.5 h-3.5" />
                </div>
                <select
                  id="tx-category"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    if (errors.categoryId)
                      setErrors((prev) => ({ ...prev, categoryId: null }));
                  }}
                  className={`block w-full pl-10 pr-8 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                    errors.categoryId
                      ? 'border-rose-300 focus:ring-rose-400'
                      : 'border-slate-200 focus:ring-emerald-500'
                  }`}
                >
                  <option value="">Select a Category</option>
                  {availableCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              {errors.categoryId && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {errors.categoryId}
                </p>
              )}
            </div>

            {/* Account / Wallet Selector */}
            <div>
              <label
                htmlFor="tx-account"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Account / Wallet
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <FaWallet className="w-3.5 h-3.5" />
                </div>
                <select
                  id="tx-account"
                  value={accountId}
                  onChange={(e) => {
                    setAccountId(e.target.value);
                    if (errors.accountId)
                      setErrors((prev) => ({ ...prev, accountId: null }));
                  }}
                  className={`block w-full pl-10 pr-8 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                    errors.accountId
                      ? 'border-rose-300 focus:ring-rose-400'
                      : 'border-slate-200 focus:ring-emerald-500'
                  }`}
                >
                  <option value="">Select an Account</option>
                  {accounts.map((acc) => (
                    <option key={acc._id} value={acc._id}>
                      {acc.name} ({acc.type})
                    </option>
                  ))}
                </select>
              </div>
              {errors.accountId && (
                <p className="mt-1 text-xs text-rose-600 font-medium">
                  {errors.accountId}
                </p>
              )}
            </div>
          </div>

          {/* Row: Date Input */}
          <div>
            <label
              htmlFor="tx-date"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Date
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <FaCalendarAlt className="w-3.5 h-3.5" />
              </div>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (errors.date) setErrors((prev) => ({ ...prev, date: null }));
                }}
                className={`block w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 ${
                  errors.date
                    ? 'border-rose-300 focus:ring-rose-400'
                    : 'border-slate-200 focus:ring-emerald-500'
                }`}
              />
            </div>
            {errors.date && (
              <p className="mt-1 text-xs text-rose-600 font-medium">{errors.date}</p>
            )}
          </div>

          {/* Note / Description Input */}
          <div>
            <label
              htmlFor="tx-note"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Note / Description
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute top-2.5 left-3.5 pointer-events-none text-slate-400">
                <FaStickyNote className="w-3.5 h-3.5" />
              </div>
              <textarea
                id="tx-note"
                rows={2}
                placeholder="Optional notes or details (e.g., Grocery shopping, Client invoice)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="block w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Recurring Transaction Toggle & Frequency Selector */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label
                htmlFor="tx-recurring-checkbox"
                className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none"
              >
                <input
                  id="tx-recurring-checkbox"
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Recurring Transaction?</span>
              </label>

              {isRecurring && (
                <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                  <FaSyncAlt className="w-3 h-3 animate-spin" /> Repeats periodically
                </span>
              )}
            </div>

            {isRecurring && (
              <div className="mt-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <label
                  htmlFor="tx-frequency"
                  className="block text-xs font-semibold text-emerald-900 uppercase tracking-wider mb-1"
                >
                  Frequency
                </label>
                <select
                  id="tx-frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="block w-full px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
                <p className="mt-1 text-[11px] text-emerald-700">
                  This transaction will automatically repeat on this schedule.
                </p>
              </div>
            )}
          </div>

          {/* --------------------------------------------------------------- */}
          {/* ACTION BUTTONS                                                  */}
          {/* --------------------------------------------------------------- */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold shadow-md shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 flex items-center gap-2 disabled:opacity-50"
            >
              <FaCheck className="w-3.5 h-3.5" />
              <span>
                {submitting
                  ? 'Saving...'
                  : isEditMode
                  ? 'Update Transaction'
                  : 'Save Transaction'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransactionModal;
