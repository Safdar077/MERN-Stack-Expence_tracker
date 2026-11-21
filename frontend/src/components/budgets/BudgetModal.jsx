import React, { useState, useEffect } from 'react';
import {
  FaTimes,
  FaSpinner,
  FaCheck,
  FaPiggyBank,
  FaCalendarAlt,
  FaExclamationCircle,
} from 'react-icons/fa';
import { useCategories } from '../../hooks/useCategories.js';
import CategoryIcon from '../transactions/CategoryIcon.jsx';

// Month lookup table for human-friendly month names
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * BudgetModal Component
 *
 * Dedicated modal dialogue for configuring overall monthly budget amounts and
 * setting per-category spending limits. Controlled component relying on action callbacks
 * passed down from parent views.
 *
 * Key Capabilities:
 * 1. Month & Year Target Selection: Allows planning for future or inspecting past months.
 * 2. Overall Target: Primary ceiling for the user's monthly spending.
 * 3. Dynamic Category Limits: Lists all Expense categories with custom threshold inputs.
 * 4. Prepopulation: Pre-fills existing budget figures when editing an already configured month.
 * 5. Input Validation: Enforces non-negative numerical limits and clean payload formats.
 *
 * Strict Architectural Compliance:
 * - NO Redux, NO Context API — pure controlled component with local useState.
 * - react-icons exclusively (no lucide-react).
 * - Beginner-friendly inline documentation.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal dialog is rendered
 * @param {Function} props.onClose - Dismiss callback
 * @param {Object|null} [props.currentBudget=null] - Existing budget document if already set
 * @param {number} [props.selectedMonth] - Initial month integer (1-12)
 * @param {number} [props.selectedYear] - Initial year integer (e.g. 2026)
 * @param {string} [props.currency='$'] - Currency symbol to display alongside inputs
 * @param {Function} [props.onSuccess] - Callback executed upon successful budget update
 * @param {Function} props.updateBudget - Action invoked to save budget settings
 * @param {Array} [props.expenseCategories] - Optional expense categories passed from parent
 */
const BudgetModal = ({
  isOpen,
  onClose,
  currentBudget = null,
  selectedMonth,
  selectedYear,
  currency = '$',
  onSuccess,
  updateBudget,
  expenseCategories: propExpenseCategories,
}) => {
  const currentDate = new Date();
  const defaultMonth = selectedMonth || currentDate.getMonth() + 1;
  const defaultYear = selectedYear || currentDate.getFullYear();

  // Custom categories hook fallback
  const { expenseCategories: hookExpenseCategories = [] } = useCategories();
  const expenseCategories = propExpenseCategories || hookExpenseCategories;

  // Form input states
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [overallAmount, setOverallAmount] = useState('0');
  const [categoryLimitsMap, setCategoryLimitsMap] = useState({});

  // UI status
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Year choices for selector (current year - 1 through current year + 2)
  const baseYear = currentDate.getFullYear();
  const yearOptions = [baseYear - 1, baseYear, baseYear + 1, baseYear + 2];

  // Prepopulate form when modal opens or currentBudget / selected month changes
  useEffect(() => {
    if (isOpen) {
      const activeMonth = selectedMonth || defaultMonth;
      const activeYear = selectedYear || defaultYear;

      setMonth(activeMonth);
      setYear(activeYear);
      setErrorMessage('');
      setFieldErrors({});

      if (currentBudget) {
        setOverallAmount(
          currentBudget.overallAmount !== undefined
            ? String(currentBudget.overallAmount)
            : '0'
        );

        // Map existing category limits into an id -> amount dictionary
        const limitsMap = {};
        if (Array.isArray(currentBudget.categoryLimits)) {
          for (const item of currentBudget.categoryLimits) {
            const catId = item.categoryId?._id || item.categoryId;
            if (catId) {
              limitsMap[String(catId)] = String(item.amount || 0);
            }
          }
        }
        setCategoryLimitsMap(limitsMap);
      } else {
        setOverallAmount('0');
        setCategoryLimitsMap({});
      }
    }
  }, [isOpen, currentBudget, selectedMonth, selectedYear]);

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

  // Handle clicking outside modal content
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !submitting) {
      onClose();
    }
  };

  /**
   * Updates a category-specific budget limit.
   */
  const handleCategoryLimitChange = (categoryId, value) => {
    setCategoryLimitsMap((prev) => ({
      ...prev,
      [categoryId]: value,
    }));
  };

  /**
   * Validates form inputs before submission.
   */
  const validateForm = () => {
    const errors = {};
    const parsedOverall = Number(overallAmount);

    if (overallAmount === '' || isNaN(parsedOverall) || parsedOverall < 0) {
      errors.overallAmount = 'Overall budget amount must be non-negative.';
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
      // Build category limits array: only include valid positive amounts
      const categoryLimits = [];
      for (const [catId, val] of Object.entries(categoryLimitsMap)) {
        const numVal = Number(val);
        if (!isNaN(numVal) && numVal > 0) {
          categoryLimits.push({
            categoryId: catId,
            amount: numVal,
          });
        }
      }

      const payload = {
        month: Number(month),
        year: Number(year),
        overallAmount: Number(overallAmount),
        categoryLimits,
      };

      let result;
      if (updateBudget) {
        result = await updateBudget(payload);
      } else {
        result = { success: false, error: 'Budget update handler missing.' };
      }

      if (result && result.success) {
        if (onSuccess) {
          onSuccess(result.budget || payload);
        }
        onClose();
      } else {
        setErrorMessage(
          result?.error || 'Failed to save monthly budget settings.'
        );
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'An unexpected error occurred while saving the budget.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="budget-modal"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
              <FaPiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="budget-modal-title"
                className="text-lg font-bold text-slate-800"
              >
                Set Monthly Budget
              </h2>
              <p className="text-xs text-slate-500">
                Define your overall spending target and optional category limits.
              </p>
            </div>
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

        {/* Server Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 flex-shrink-0">
            <FaExclamationCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body (Scrollable) */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 overflow-y-auto flex-grow"
        >
          {/* Month & Year Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70">
            <div>
              <label
                htmlFor="budget-month"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Select Month
              </label>
              <select
                id="budget-month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                disabled={submitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="budget-year"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Select Year
              </label>
              <select
                id="budget-year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                disabled={submitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Overall Monthly Budget Amount */}
          <div>
            <label
              htmlFor="overall-budget-amount"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Overall Monthly Budget ({currency}) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                {currency}
              </span>
              <input
                id="overall-budget-amount"
                type="number"
                step="0.01"
                min="0"
                value={overallAmount}
                onChange={(e) => {
                  setOverallAmount(e.target.value);
                  if (fieldErrors.overallAmount) {
                    setFieldErrors((prev) => ({ ...prev, overallAmount: null }));
                  }
                }}
                disabled={submitting}
                placeholder="e.g. 2500"
                className={`w-full pl-8 pr-3.5 py-2.5 rounded-xl border text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors ${
                  fieldErrors.overallAmount
                    ? 'border-rose-300 bg-rose-50/30'
                    : 'border-slate-200 bg-white'
                }`}
              />
            </div>
            {fieldErrors.overallAmount && (
              <p className="text-xs text-rose-500 mt-1">
                {fieldErrors.overallAmount}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              Your overall monthly budget is used for total progress tracking and threshold alerts (50%, 90%, 100%+).
            </p>
          </div>

          {/* Per-Category Budget Limits Section */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Category Limits (Optional)
              </h3>
              <span className="text-xs text-slate-400">
                Set individual caps for key expense categories
              </span>
            </div>

            {expenseCategories.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No expense categories found. You can set an overall budget now.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {expenseCategories.map((category) => {
                  const val = categoryLimitsMap[String(category._id)] || '0';

                  return (
                    <div
                      key={category._id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-600">
                          <CategoryIcon icon={category.icon} className="w-4 h-4" />
                        </div>
                        <span
                          className="text-xs font-medium text-slate-700 truncate"
                          title={category.name}
                        >
                          {category.name}
                        </span>
                      </div>

                      <div className="relative w-28 flex-shrink-0">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                          {currency}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          data-testid={`category-limit-${category._id}`}
                          aria-label={`${category.name} limit`}
                          value={val}
                          onChange={(e) =>
                            handleCategoryLimitChange(
                              String(category._id),
                              e.target.value
                            )
                          }
                          disabled={submitting}
                          placeholder="0"
                          className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-right"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </form>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <FaSpinner className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <FaCheck className="w-3.5 h-3.5" />
                <span>Save Budget</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetModal;
