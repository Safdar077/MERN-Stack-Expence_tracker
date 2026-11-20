import React from 'react';
import { FaExclamationTriangle, FaCheckCircle, FaInfoCircle, FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters.js';

/**
 * BudgetProgressBar Component
 *
 * Visual progress indicator for tracking monthly spending against the overall budget limit.
 *
 * Threshold Color Coding:
 * - Green (< 50%): Spending is well under control.
 * - Blue (50% - 89%): Moderate spending within acceptable target.
 * - Orange / Amber (90% - 99%): Approaching budget limit, caution advised.
 * - Red (>= 100% or exceeded): Limit reached or budget overrun.
 *
 * Props:
 * @param {Object} props
 * @param {number} [props.spent=0] - Total expense spent in current month
 * @param {number} [props.limit=0] - Total monthly budget limit configured
 * @param {number} [props.percentage] - Optional precomputed percentage (0-100+)
 * @param {number} [props.remaining] - Optional precomputed remaining amount
 * @param {string} [props.currency='$'] - Currency code ('USD', 'EUR') or symbol ('$', '€', '₹')
 * @param {string} [props.warning] - Explicit warning message text
 * @param {boolean} [props.showCardWrapper=true] - Wrap in a styled card container or render bare bar
 * @param {string} [props.className=''] - Additional custom CSS class names
 */
const BudgetProgressBar = ({
  spent = 0,
  limit = 0,
  percentage,
  remaining,
  currency = '$',
  warning,
  showCardWrapper = true,
  className = '',
}) => {
  // Safe numeric conversion
  const numSpent = typeof spent === 'number' ? spent : Number(spent) || 0;
  const numLimit = typeof limit === 'number' ? limit : Number(limit) || 0;

  // ---------------------------------------------------------------------------
  // 1. EMPTY / UNCONFIGURED BUDGET STATE
  // ---------------------------------------------------------------------------
  if (!numLimit || numLimit <= 0) {
    const emptyContent = (
      <div data-testid="budget-progress-empty" className="text-center py-4 sm:py-6">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
          <FaInfoCircle className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-700">No monthly budget set</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Configure a monthly budget target to track spending progress and receive threshold alerts.
        </p>
        <div className="mt-3">
          <Link
            to="/budgets"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
          >
            <FaPlus className="w-3 h-3" />
            Set Monthly Budget
          </Link>
        </div>
      </div>
    );

    if (showCardWrapper) {
      return (
        <div className={`bg-white rounded-2xl p-5 border border-slate-200 shadow-sm ${className}`}>
          {emptyContent}
        </div>
      );
    }
    return <div className={className}>{emptyContent}</div>;
  }

  // ---------------------------------------------------------------------------
  // 2. METRIC CALCULATIONS
  // ---------------------------------------------------------------------------
  // Calculate percentage used (clamped to 0 minimum, but can exceed 100%)
  const computedPercentage =
    typeof percentage === 'number'
      ? percentage
      : Math.round((numSpent / numLimit) * 10000) / 100;

  // Visual width for CSS progress bar (capped at 100% for bar render)
  const barWidth = Math.min(100, Math.max(0, computedPercentage));

  // Compute remaining budget
  const computedRemaining =
    typeof remaining === 'number' ? remaining : numLimit - numSpent;

  const isExceeded = numSpent > numLimit;
  const overAmount = isExceeded ? numSpent - numLimit : 0;

  // ---------------------------------------------------------------------------
  // 3. THRESHOLD COLOR CODING
  // ---------------------------------------------------------------------------
  // Green (<50%), Blue (50-89%), Orange (90-99%), Red (>=100% or exceeded)
  let thresholdTheme = {
    barClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    textClass: 'text-emerald-600',
    statusLabel: 'On Track',
  };

  if (computedPercentage >= 100 || isExceeded) {
    thresholdTheme = {
      barClass: 'bg-rose-500',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      textClass: 'text-rose-600',
      statusLabel: isExceeded ? 'Exceeded' : 'Limit Reached',
    };
  } else if (computedPercentage >= 90) {
    thresholdTheme = {
      barClass: 'bg-amber-500',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      textClass: 'text-amber-600',
      statusLabel: 'Near Limit',
    };
  } else if (computedPercentage >= 50) {
    thresholdTheme = {
      barClass: 'bg-blue-500',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      textClass: 'text-blue-600',
      statusLabel: 'Moderate',
    };
  }

  // Determine descriptive warning or notification text
  let activeWarning = warning || null;
  if (!activeWarning && isExceeded) {
    activeWarning = `Budget exceeded by ${formatCurrency(overAmount, currency)}!`;
  } else if (!activeWarning && computedPercentage >= 90 && computedPercentage < 100) {
    activeWarning = `You have used ${Math.round(computedPercentage)}% of your monthly budget.`;
  }

  // ---------------------------------------------------------------------------
  // 4. COMPONENT RENDER
  // ---------------------------------------------------------------------------
  const content = (
    <div data-testid="budget-progress-bar" className="space-y-3">
      {/* Header with Title and Status Badge */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">Monthly Budget</h4>
          <p className="text-xs text-slate-500">Overall monthly spending target</p>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${thresholdTheme.badgeClass}`}
        >
          {thresholdTheme.statusLabel}
        </span>
      </div>

      {/* Numerical Spent vs Total Limit Summary */}
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900">
            {formatCurrency(numSpent, currency)}
          </span>
          <span className="text-xs sm:text-sm font-medium text-slate-500 ml-1.5">
            of {formatCurrency(numLimit, currency)}
          </span>
        </div>
        <div className="text-right">
          <span className={`text-base font-bold ${thresholdTheme.textClass}`}>
            {Math.round(computedPercentage)}%
          </span>
        </div>
      </div>

      {/* Progress Track & Fill Bar */}
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
        <div
          role="progressbar"
          aria-valuenow={Math.round(computedPercentage)}
          aria-valuemin="0"
          aria-valuemax="100"
          className={`h-full rounded-full transition-all duration-500 ease-out ${thresholdTheme.barClass}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {/* Footer: Remaining Amount & Warning Alerts */}
      <div className="flex items-center justify-between text-xs font-medium text-slate-500 pt-0.5">
        <span>
          {isExceeded ? (
            <span className="text-rose-600 font-semibold">
              {formatCurrency(overAmount, currency)} over limit
            </span>
          ) : (
            <span>
              {formatCurrency(Math.max(0, computedRemaining), currency)} remaining
            </span>
          )}
        </span>
        <Link
          to="/budgets"
          className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline"
        >
          Manage Budget
        </Link>
      </div>

      {/* Alert Warning Box */}
      {activeWarning && (
        <div
          data-testid="budget-warning-alert"
          className={`mt-2 p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
            isExceeded
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          <FaExclamationTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{activeWarning}</span>
        </div>
      )}
    </div>
  );

  if (showCardWrapper) {
    return (
      <div className={`bg-white rounded-2xl p-5 border border-slate-200 shadow-sm ${className}`}>
        {content}
      </div>
    );
  }

  return <div className={className}>{content}</div>;
};

export default BudgetProgressBar;
