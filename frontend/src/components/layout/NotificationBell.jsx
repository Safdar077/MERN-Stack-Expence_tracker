import React, { useState, useRef, useEffect } from 'react';
import {
  FaBell,
  FaCheckCircle,
  FaExclamationTriangle,
  FaExclamationCircle,
  FaInfoCircle,
  FaCalendarAlt,
  FaCheck,
  FaSpinner,
} from 'react-icons/fa';
import { useRecurring } from '../../hooks/useRecurring.js';
import { useBudgets } from '../../hooks/useBudgets.js';

/**
 * Helper to determine color scheme based on budget threshold status.
 *
 * Rules:
 * - 50%: Yellow
 * - 90%: Orange
 * - 100% or exceeded (100%+): Red
 */
const getBudgetAlertStyles = (status, percentage = 0) => {
  const isOver100 = status === 'exceeded' || status === '100%' || percentage >= 100;
  const isOver90 = status === '90%' || percentage >= 90;

  if (isOver100) {
    return {
      cardBg: 'bg-red-50 border-red-200',
      badgeBg: 'bg-red-100 text-red-800 border-red-300',
      textColor: 'text-red-900',
      iconColor: 'text-red-600',
      tagText: '100%+ Limit',
    };
  }

  if (isOver90) {
    return {
      cardBg: 'bg-orange-50 border-orange-200',
      badgeBg: 'bg-orange-100 text-orange-800 border-orange-300',
      textColor: 'text-orange-900',
      iconColor: 'text-orange-600',
      tagText: '90% Warning',
    };
  }

  // 50% or default warning
  return {
    cardBg: 'bg-yellow-50 border-yellow-200',
    badgeBg: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    textColor: 'text-yellow-900',
    iconColor: 'text-yellow-600',
    tagText: '50% Notice',
  };
};

/**
 * NotificationBell Component
 *
 * Provides a real-time notification center for:
 * 1. Due / Overdue Recurring Transactions (from `useRecurring`)
 * 2. Budget Threshold Warnings (50%, 90%, 100%, >100%) (from `useBudgets`)
 *
 * Features:
 * - Dynamic notification badge counter indicating total pending alerts.
 * - Interactive dropdown panel displaying detailed warning messages.
 * - 1-Click "Mark as Paid" action for recurring items which executes payment
 *   via `markAsPaid(ruleId)` and synchronizes accounts, budgets, and transactions.
 * - Empty state feedback when all payments and budgets are on track.
 * - Auto-close when clicking outside the dropdown or pressing Escape.
 */
const NotificationBell = () => {
  // Dropdown open/close state
  const [isOpen, setIsOpen] = useState(false);

  // Track ID of recurring item currently being marked as paid to show loading state
  const [payingId, setPayingId] = useState(null);

  // Action error message container
  const [actionError, setActionError] = useState(null);

  // Ref to handle outside clicks for closing dropdown
  const dropdownRef = useRef(null);

  // Fetch due recurring items from useRecurring hook
  const { dueItems = [], markAsPaid } = useRecurring();

  // Fetch active budget warnings from useBudgets hook
  const { warnings = [] } = useBudgets();

  // Calculate live badge count: total due recurring bills + active budget warnings
  const totalAlerts = (dueItems?.length || 0) + (warnings?.length || 0);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  /**
   * 1-Click action to mark a due recurring rule as paid.
   *
   * @param {string} id - The recurring rule ObjectId
   */
  const handleMarkAsPaid = async (id) => {
    if (!id || payingId) return;

    setPayingId(id);
    setActionError(null);

    try {
      const result = await markAsPaid(id);
      if (!result.success) {
        setActionError(result.error || 'Failed to mark as paid');
      }
    } catch (err) {
      setActionError(err.message || 'Error executing payment');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Notification Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Notification Center"
        aria-expanded={isOpen}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <FaBell className="w-5 h-5" />

        {/* Live Badge Counter */}
        {totalAlerts > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-rose-600 rounded-full shadow-sm animate-pulse"
          >
            {totalAlerts > 9 ? '9+' : totalAlerts}
          </span>
        )}
      </button>

      {/* Dropdown Menu Panel */}
      {isOpen && (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden transform transition-all"
        >
          {/* Header Bar */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaBell className="text-emerald-600 w-4 h-4" />
              <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {totalAlerts} {totalAlerts === 1 ? 'alert' : 'alerts'}
            </span>
          </div>

          {/* Action Error Alert banner if payment fails */}
          {actionError && (
            <div className="p-2 bg-red-50 text-red-700 text-xs border-b border-red-200 flex items-center gap-2">
              <FaExclamationCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Content Scrollable List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
            {/* Empty State */}
            {totalAlerts === 0 ? (
              <div
                data-testid="notification-empty"
                className="py-8 px-4 text-center flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                  <FaCheckCircle className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">All caught up!</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  All caught up! No pending payments or budget alerts
                </p>
              </div>
            ) : (
              <>
                {/* 1. Budget Alerts Section */}
                {warnings.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 pt-1">
                      Budget Alerts ({warnings.length})
                    </p>
                    {warnings.map((warn, index) => {
                      const styles = getBudgetAlertStyles(warn.status, warn.percentage);
                      const title = warn.label || warn.categoryName || 'Budget Warning';
                      const message =
                        warn.warning ||
                        `${title}: reached ${warn.percentage}% of allocated budget`;

                      return (
                        <div
                          key={`budget-warn-${warn.categoryId || index}`}
                          data-testid="budget-warning-item"
                          className={`p-3 rounded-lg border text-left transition-all ${styles.cardBg}`}
                        >
                          <div className="flex items-start gap-2">
                            <FaExclamationTriangle
                              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${styles.iconColor}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-semibold text-slate-800 truncate">
                                  {title}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${styles.badgeBg}`}
                                >
                                  {styles.tagText}
                                </span>
                              </div>
                              <p className={`text-xs mt-1 ${styles.textColor}`}>{message}</p>
                              {warn.percentage !== undefined && (
                                <p className="text-[11px] text-slate-500 mt-1">
                                  {warn.spent !== undefined && warn.limit !== undefined
                                    ? `$${warn.spent.toFixed(2)} spent of $${warn.limit.toFixed(2)} limit (${warn.percentage}%)`
                                    : `${warn.percentage}% of budget limit used`}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Due Recurring Payments Section */}
                {dueItems.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-2 pt-1">
                      Due Recurring Payments ({dueItems.length})
                    </p>
                    {dueItems.map((item) => {
                      const itemTitle = item.title || item.name || 'Recurring Item';
                      const categoryName =
                        item.categoryId?.name || item.category || 'General';
                      const dueDateFormatted = item.nextDueDate
                        ? new Date(item.nextDueDate).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'Due Now';
                      const isPaying = payingId === item._id;

                      return (
                        <div
                          key={item._id}
                          data-testid="due-recurring-item"
                          className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-slate-300 transition-all text-left"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-slate-800 truncate">
                                {itemTitle}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                                <span className="font-semibold text-slate-700">
                                  ${Number(item.amount || 0).toFixed(2)}
                                </span>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1">
                                  <FaCalendarAlt className="w-3 h-3 text-slate-400" />
                                  {dueDateFormatted}
                                </span>
                                <span>•</span>
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[11px]">
                                  {categoryName}
                                </span>
                              </div>
                            </div>

                            {/* 1-Click "Mark as Paid" Button */}
                            <button
                              type="button"
                              onClick={() => handleMarkAsPaid(item._id)}
                              disabled={isPaying}
                              aria-label={`Mark ${itemTitle} as paid`}
                              className={`flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-all shadow-sm ${
                                isPaying
                                  ? 'bg-slate-400 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500'
                              }`}
                            >
                              {isPaying ? (
                                <>
                                  <FaSpinner className="w-3 h-3 animate-spin" />
                                  <span>Paying...</span>
                                </>
                              ) : (
                                <>
                                  <FaCheck className="w-3 h-3" />
                                  <span>Mark as Paid</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer note */}
          <div className="p-2 bg-slate-50 border-t border-slate-200 text-center">
            <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
              <FaInfoCircle className="w-3 h-3" />
              Live alerts update automatically as you transact
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
