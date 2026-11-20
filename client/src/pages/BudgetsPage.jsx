import React, { useState, useEffect } from 'react';
import {
  FaPiggyBank,
  FaCalendarAlt,
  FaPlus,
  FaEdit,
  FaExclamationTriangle,
  FaExclamationCircle,
  FaInfoCircle,
  FaCheckCircle,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';
import { useBudgets } from '../hooks/useBudgets.js';
import { useAuth } from '../hooks/useAuth.js';
import { useCategories } from '../hooks/useCategories.js';
import BudgetProgressBar from '../components/budgets/BudgetProgressBar.jsx';
import BudgetModal from '../components/budgets/BudgetModal.jsx';
import CategoryIcon from '../components/transactions/CategoryIcon.jsx';
import { formatCurrency } from '../utils/formatters.js';

// Month names list for human-readable dates
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
 * BudgetsPage Component
 *
 * Dedicated planning and spending controls view allowing users to set monthly
 * spending limits, track category budgets, and monitor real-time threshold alerts.
 *
 * Key Capabilities:
 * 1. Month & Year Inspection: Switch between past, present, and future months.
 * 2. Overall Monthly Budget Card: High-level visual progress bar with status color coding.
 * 3. Active Warning Badges Section: Prominent alert banners for 50%, 90%, 100%, and exceeded thresholds.
 * 4. Per-Category Budgets Grid: Category-specific progress meters, limits, and warning badges.
 * 5. Budget Configuration Modal: Seamless modal workflow to define or adjust limits.
 * 6. Clean Empty State: Guides users to establish their first budget for unconfigured months.
 *
 * Strict Architectural Compliance:
 * - NO Redux, NO Context API — pure React state and custom hooks (`useBudgets`, `useCategories`, `useAuth`).
 * - react-icons exclusively (no lucide-react).
 * - Beginner-friendly inline documentation.
 */
const BudgetsPage = () => {
  // Current calendar date defaults
  const today = new Date();
  const currentMonthNum = today.getMonth() + 1;
  const currentYearNum = today.getFullYear();

  // Selected date state for inspecting budgets
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
  const [selectedYear, setSelectedYear] = useState(currentYearNum);

  // Modal display toggle
  const [isModalOpen, setIsModalOpen] = useState(false);

  // User currency from useAuth
  const { user } = useAuth();
  const currency = user?.currency || '$';

  // Budget data and actions from custom useBudgets hook
  const {
    budget,
    totalExpense = 0,
    remaining = 0,
    percentageUsed = 0,
    warnings = [],
    categoryBudgets = [],
    loading,
    error,
    fetchBudget,
    updateBudget,
  } = useBudgets();

  // Categories hook
  const { expenseCategories = [] } = useCategories();

  // Year options for selector (-1 to +2 years from current)
  const yearOptions = [
    currentYearNum - 1,
    currentYearNum,
    currentYearNum + 1,
    currentYearNum + 2,
  ];

  /**
   * Fetches budget data whenever selectedMonth or selectedYear changes.
   */
  useEffect(() => {
    fetchBudget(selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, fetchBudget]);

  /**
   * Navigates to previous month.
   */
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  /**
   * Navigates to next month.
   */
  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  /**
   * Resolves category icon from expense categories list.
   */
  const getCategoryIcon = (categoryId, fallbackIcon) => {
    if (fallbackIcon) return fallbackIcon;
    const found = expenseCategories.find(
      (c) => String(c._id) === String(categoryId)
    );
    return found?.icon || 'FaTag';
  };

  /**
   * Resolves visual style and badge for category progress and status.
   */
  const getCategoryStatusDetails = (summary) => {
    const { percentage = 0, isExceeded, status } = summary;

    if (isExceeded || status === 'exceeded' || percentage > 100) {
      return {
        badgeText: 'Exceeded',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        barClass: 'bg-rose-500',
        textClass: 'text-rose-600',
      };
    }
    if (percentage >= 100 || status === '100%') {
      return {
        badgeText: '100% Limit Reached',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        barClass: 'bg-rose-500',
        textClass: 'text-rose-600',
      };
    }
    if (percentage >= 90 || status === '90%') {
      return {
        badgeText: '90% Near Limit',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        barClass: 'bg-amber-500',
        textClass: 'text-amber-600',
      };
    }
    if (percentage >= 50 || status === '50%') {
      return {
        badgeText: '50% Reached',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        barClass: 'bg-blue-500',
        textClass: 'text-blue-600',
      };
    }
    return {
      badgeText: 'On Track',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      barClass: 'bg-emerald-500',
      textClass: 'text-emerald-600',
    };
  };

  const hasBudget = Boolean(budget && budget.overallAmount > 0);

  return (
    <div data-testid="budgets-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <FaPiggyBank className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Monthly Budgets</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Set overall limits and category spending thresholds to stay on budget.
            </p>
          </div>
        </div>

        {/* Date Selector & Primary Set Budget CTA */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month & Year Controls */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <FaChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              <select
                data-testid="budget-month-select"
                aria-label="Select month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 border-none focus:outline-none cursor-pointer py-1"
              >
                {MONTH_NAMES.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>

              <select
                data-testid="budget-year-select"
                aria-label="Select year"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-xs sm:text-sm font-semibold text-slate-700 border-none focus:outline-none cursor-pointer py-1"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <FaChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* CTA: Set / Edit Budget */}
          <button
            type="button"
            data-testid="set-budget-cta"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            {hasBudget ? (
              <>
                <FaEdit className="w-3.5 h-3.5" />
                <span>Edit Budget</span>
              </>
            ) : (
              <>
                <FaPlus className="w-3.5 h-3.5" />
                <span>Set Budget</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
          <FaExclamationTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && !budget && (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <FaSpinner className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading budget data...</p>
        </div>
      )}

      {/* Clean Empty State when no budget exists for selected month */}
      {!loading && !hasBudget && (
        <div
          data-testid="empty-budget-state"
          className="bg-white p-10 sm:p-14 rounded-2xl border border-slate-200 text-center shadow-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 mx-auto flex items-center justify-center mb-4">
            <FaPiggyBank className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            No budget set for this month
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
            Set an overall monthly target and category spending limits for{' '}
            <strong className="text-slate-700">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </strong>{' '}
            to receive real-time threshold warnings and stay on track.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            <FaPlus className="w-3.5 h-3.5" />
            <span>Create Monthly Budget</span>
          </button>
        </div>
      )}

      {/* Active Budget Content */}
      {hasBudget && (
        <div className="space-y-6">
          {/* Overall Monthly Budget Card */}
          <div data-testid="overall-budget-card">
            <BudgetProgressBar
              spent={totalExpense}
              limit={budget.overallAmount}
              percentage={percentageUsed}
              remaining={remaining}
              currency={currency}
              showCardWrapper={true}
            />
          </div>

          {/* Active Warning Badges Section */}
          {warnings && warnings.length > 0 && (
            <div data-testid="budget-warnings-section" className="space-y-3">
              <div className="flex items-center gap-2">
                <FaExclamationTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Active Threshold Alerts ({warnings.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {warnings.map((warn, index) => {
                  const isCrit =
                    warn.isExceeded ||
                    warn.status === 'exceeded' ||
                    warn.status === '100%';

                  return (
                    <div
                      key={index}
                      className={`p-3.5 rounded-xl border flex items-start gap-3 shadow-sm ${
                        isCrit
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      {isCrit ? (
                        <FaExclamationCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <FaExclamationTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-semibold uppercase tracking-wider block">
                          {warn.label || 'Budget Alert'}
                        </span>
                        <p className="text-xs sm:text-sm font-medium mt-0.5">
                          {warn.warning || warn.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Per-Category Budgets Section */}
          <div data-testid="category-budgets-section" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Category Budgets</h3>
                <p className="text-xs text-slate-500">
                  Target spending limits and progress across expense categories.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {categoryBudgets.length} Configured
              </span>
            </div>

            {categoryBudgets.length === 0 ? (
              <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
                No individual category limits configured for this month.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {categoryBudgets.map((summary) => {
                  const statusDetails = getCategoryStatusDetails(summary);
                  const iconName = getCategoryIcon(
                    summary.categoryId,
                    summary.icon
                  );
                  const pct = Math.round(summary.percentage || 0);
                  const barWidth = Math.min(100, Math.max(0, summary.percentage || 0));

                  return (
                    <div
                      key={summary.categoryId}
                      data-testid="category-budget-card"
                      className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 shadow-sm transition-all duration-200 space-y-3.5"
                    >
                      {/* Card Header: Icon, Name, and Status Badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center flex-shrink-0">
                            <CategoryIcon icon={iconName} className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h4
                              className="text-sm font-bold text-slate-800 truncate"
                              title={summary.categoryName}
                            >
                              {summary.categoryName}
                            </h4>
                            <span className="text-xs text-slate-400">
                              Limit: {formatCurrency(summary.limit, currency)}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          data-testid={`status-badge-${summary.categoryId}`}
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${statusDetails.badgeClass}`}
                        >
                          {statusDetails.badgeText}
                        </span>
                      </div>

                      {/* Spent vs Limit Numerical Display */}
                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <span className="text-lg font-extrabold text-slate-900">
                            {formatCurrency(summary.spent, currency)}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">
                            of {formatCurrency(summary.limit, currency)}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${statusDetails.textClass}`}>
                          {pct}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner">
                        <div
                          role="progressbar"
                          aria-valuenow={pct}
                          aria-valuemin="0"
                          aria-valuemax="100"
                          className={`h-full rounded-full transition-all duration-500 ease-out ${statusDetails.barClass}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>

                      {/* Remaining vs Over-budget summary */}
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                        {summary.isExceeded || summary.remaining < 0 ? (
                          <span className="text-rose-600 font-semibold">
                            {formatCurrency(Math.abs(summary.remaining), currency)} over limit
                          </span>
                        ) : (
                          <span>
                            {formatCurrency(summary.remaining, currency)} remaining
                          </span>
                        )}
                        <span className="text-slate-400 text-[11px]">
                          {summary.spent > 0 ? `${pct}% used` : 'No expenses yet'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Budget Configuration Modal */}
      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentBudget={budget}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        currency={currency}
        updateBudget={updateBudget}
      />
    </div>
  );
};

export default BudgetsPage;
