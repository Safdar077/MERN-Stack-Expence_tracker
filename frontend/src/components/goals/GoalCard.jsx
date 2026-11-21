import React from 'react';
import {
  FaBullseye,
  FaCheckCircle,
  FaClock,
  FaPlusCircle,
  FaEdit,
  FaTrash,
  FaCalendarAlt,
} from 'react-icons/fa';
import { formatCurrency, formatDate } from '../../utils/formatters.js';

/**
 * GoalCard Component
 *
 * Visual card representing an individual savings goal (e.g. Emergency Fund, Vacation, Down Payment).
 * Displays target amounts, current saved progress, completion milestone status, and quick action buttons.
 *
 * Key Features:
 * 1. Progress Bar: Visual representation of percentage saved towards target amount.
 * 2. Status Badge: "In Progress" vs "Completed" (when currentAmount >= targetAmount or progress >= 100%).
 * 3. Quick Contribution Button: Quick CTA (FaPlusCircle) opening the contribute modal.
 * 4. Action Handlers: Edit (FaEdit) and Delete (FaTrash) actions dispatched to parent view.
 * 5. Architectural Compliance: Pure React component, react-icons exclusively, no Redux/Context.
 *
 * @param {Object} props
 * @param {Object} props.goal - Goal document object ({ _id, title, name, targetAmount, currentAmount, progress, targetDate, isCompleted })
 * @param {string} [props.currency='$'] - Currency code or symbol for monetary formatting
 * @param {Function} props.onContribute - Callback invoked when quick contribute button is clicked
 * @param {Function} props.onEdit - Callback invoked when edit button is clicked
 * @param {Function} props.onDelete - Callback invoked when delete button is clicked
 */
const GoalCard = ({
  goal,
  currency = '$',
  onContribute,
  onEdit,
  onDelete,
}) => {
  if (!goal) return null;

  // ---------------------------------------------------------------------------
  // 1. DATA COMPUTATION & NORMALIZATION
  // ---------------------------------------------------------------------------
  const title = goal.title || goal.name || 'Untitled Goal';
  const target = Number(goal.targetAmount) || 0;
  const current = Number(goal.currentAmount) || 0;

  // Calculate or retrieve progress percentage (0 - 100+)
  const rawProgress =
    typeof goal.progress === 'number'
      ? goal.progress
      : target > 0
      ? Math.round((current / target) * 10000) / 100
      : 0;

  // Clamped percentage for CSS progress width (max 100%)
  const clampedProgress = Math.min(Math.max(rawProgress, 0), 100);

  // Status determined by completion flag or saved amount meeting/exceeding target
  const isCompleted = Boolean(goal.isCompleted || (target > 0 && current >= target) || rawProgress >= 100);

  // Remaining balance needed to reach target
  const remaining = Math.max(0, target - current);

  return (
    <div
      data-testid="goal-card"
      data-goal-id={goal._id}
      className={`flex flex-col justify-between p-6 bg-white rounded-2xl border transition-all duration-200 hover:shadow-md ${
        isCompleted
          ? 'border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/20'
          : 'border-slate-200 hover:border-teal-300'
      }`}
    >
      {/* Top Header: Title, Icon, and Status Badge */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-600'
                  : 'bg-teal-100 text-teal-600'
              }`}
            >
              {isCompleted ? <FaCheckCircle /> : <FaBullseye />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg leading-tight line-clamp-1">
                {title}
              </h3>
              {goal.targetDate && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <FaCalendarAlt className="w-3 h-3 text-slate-400" />
                  <span>Target: {formatDate(goal.targetDate)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <span
            data-testid="goal-status-badge"
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
              isCompleted
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-teal-50 text-teal-700 border border-teal-200/60'
            }`}
          >
            {isCompleted ? (
              <>
                <FaCheckCircle className="w-3 h-3 text-emerald-600" />
                <span>Completed</span>
              </>
            ) : (
              <>
                <FaClock className="w-3 h-3 text-teal-600" />
                <span>In Progress</span>
              </>
            )}
          </span>
        </div>

        {/* Financial Progress Numbers */}
        <div className="pt-2">
          <div className="flex items-baseline justify-between text-sm">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Saved so far</span>
              <span
                data-testid="goal-current-amount"
                className="text-2xl font-bold text-slate-900"
              >
                {formatCurrency(current, currency)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-medium text-slate-500 block">Target goal</span>
              <span
                data-testid="goal-target-amount"
                className="text-base font-semibold text-slate-700"
              >
                {formatCurrency(target, currency)}
              </span>
            </div>
          </div>

          {/* Visual Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
              <span className="text-slate-500">Progress</span>
              <span
                data-testid="goal-progress-text"
                className={`font-semibold ${
                  isCompleted ? 'text-emerald-600' : 'text-teal-600'
                }`}
              >
                {Math.round(rawProgress)}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                data-testid="goal-progress-bar"
                className={`h-full rounded-full transition-all duration-500 ${
                  isCompleted
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : 'bg-gradient-to-r from-teal-500 to-indigo-500'
                }`}
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
            <div className="mt-1 text-right">
              <span className="text-[11px] text-slate-400">
                {isCompleted
                  ? 'Goal Achieved!'
                  : `${formatCurrency(remaining, currency)} remaining`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons: Quick Contribute, Edit, Delete */}
      <div className="pt-5 mt-4 border-t border-slate-100 flex items-center justify-between gap-2">
        {/* Quick Contribute Button */}
        <button
          type="button"
          data-testid="goal-contribute-button"
          onClick={() => onContribute && onContribute(goal)}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition-all shadow-sm ${
            isCompleted
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/10'
          }`}
          aria-label={`Contribute funds to ${title}`}
        >
          <FaPlusCircle className="w-3.5 h-3.5" />
          <span>{isCompleted ? 'Add More Funds' : 'Contribute Funds'}</span>
        </button>

        {/* Edit Button */}
        <button
          type="button"
          data-testid="goal-edit-button"
          onClick={() => onEdit && onEdit(goal)}
          className="p-2 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-colors"
          aria-label={`Edit ${title}`}
          title="Edit Goal"
        >
          <FaEdit className="w-3.5 h-3.5" />
        </button>

        {/* Delete Button */}
        <button
          type="button"
          data-testid="goal-delete-button"
          onClick={() => onDelete && onDelete(goal)}
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          aria-label={`Delete ${title}`}
          title="Delete Goal"
        >
          <FaTrash className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export default GoalCard;
