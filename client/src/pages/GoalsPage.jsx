import React, { useState } from 'react';
import {
  FaBullseye,
  FaPlus,
  FaPiggyBank,
  FaCheckCircle,
  FaChartLine,
  FaSpinner,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { useGoals } from '../hooks/useGoals.js';
import { useAuth } from '../hooks/useAuth.js';
import GoalCard from '../components/goals/GoalCard.jsx';
import GoalModal from '../components/goals/GoalModal.jsx';
import { formatCurrency } from '../utils/formatters.js';

/**
 * GoalsPage Component
 *
 * Dedicated dashboard view for managing financial savings goals (e.g. Vacation, Emergency Fund, House Down Payment).
 *
 * Key Features:
 * 1. Overview Summary Banner:
 *    - Total Target Savings ($)
 *    - Total Saved ($)
 *    - Overall Completion Rate (%)
 *    - Completed Goals vs In Progress counts
 * 2. Create Goal Modal CTA:
 *    - Floating and header CTA buttons opening GoalModal in 'create' mode.
 * 3. Responsive Card Grid:
 *    - Renders individual GoalCards with progress bars, status indicators, and quick action buttons.
 * 4. Dual-Mode GoalModal Integration:
 *    - Supports Goal Creation, Editing, and Quick Contribution with source account deduction.
 * 5. Delete Confirmation Dialog:
 *    - Prompts user confirmation prior to permanent goal deletion.
 * 6. Clean Empty State:
 *    - Friendly illustration and actionable CTA when no savings goals have been created yet.
 * 7. Architectural Compliance:
 *    - Pure React hooks (useGoals, useAuth), NO Redux/Context, react-icons exclusively.
 */
const GoalsPage = () => {
  // ---------------------------------------------------------------------------
  // 1. DATA FETCHING & STATE INITIALIZATION
  // ---------------------------------------------------------------------------
  const {
    goals = [],
    loading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    contributeGoal,
  } = useGoals();

  const { user } = useAuth();
  const currency = user?.currency || '$';

  // Modal control states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit' | 'contribute'
  const [selectedGoal, setSelectedGoal] = useState(null);

  // Delete confirmation dialog state
  const [deletingGoal, setDeletingGoal] = useState(null);
  const [isDeleteSubmitting, setIsDeleteSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // 2. AGGREGATE SUMMARY METRICS
  // ---------------------------------------------------------------------------
  const totalTarget = goals.reduce(
    (sum, g) => sum + (Number(g.targetAmount) || 0),
    0
  );
  const totalSaved = goals.reduce(
    (sum, g) => sum + (Number(g.currentAmount) || 0),
    0
  );
  const overallCompletion =
    totalTarget > 0
      ? Math.round((totalSaved / totalTarget) * 100)
      : 0;

  const completedGoalsCount = goals.filter(
    (g) =>
      g.isCompleted ||
      (Number(g.targetAmount) > 0 &&
        Number(g.currentAmount) >= Number(g.targetAmount))
  ).length;

  const inProgressGoalsCount = goals.length - completedGoalsCount;

  // ---------------------------------------------------------------------------
  // 3. ACTION HANDLERS
  // ---------------------------------------------------------------------------

  // Open modal in Create mode
  const handleOpenCreateModal = () => {
    setSelectedGoal(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  // Open modal in Edit mode
  const handleOpenEditModal = (goal) => {
    setSelectedGoal(goal);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Open modal in Quick Contribute mode
  const handleOpenContributeModal = (goal) => {
    setSelectedGoal(goal);
    setModalMode('contribute');
    setIsModalOpen(true);
  };

  // Open delete confirmation modal
  const handlePromptDelete = (goal) => {
    setDeletingGoal(goal);
  };

  // Confirm and execute goal deletion
  const handleConfirmDelete = async () => {
    if (!deletingGoal?._id) return;

    setIsDeleteSubmitting(true);
    try {
      await deleteGoal(deletingGoal._id);
      setDeletingGoal(null);
    } catch (err) {
      // Handled via useGoals error state
    } finally {
      setIsDeleteSubmitting(false);
    }
  };

  return (
    <div data-testid="goals-page" className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-100 text-teal-600 flex items-center justify-center text-xl shadow-sm">
            <FaBullseye />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Savings Goals</h1>
            <p className="text-sm text-slate-500">
              Set target milestones, contribute savings, and monitor your financial goals.
            </p>
          </div>
        </div>

        {/* Create Goal Primary CTA */}
        <button
          type="button"
          data-testid="create-goal-cta-button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-xl shadow-sm shadow-teal-600/20 transition-all hover:shadow"
        >
          <FaPlus className="w-3.5 h-3.5" />
          <span>Create Goal</span>
        </button>
      </div>

      {/* Global Error Notice if goal operation failed */}
      {error && (
        <div
          data-testid="goals-error-banner"
          className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center gap-2"
        >
          <FaExclamationTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Overview Summary Banner */}
      <div
        data-testid="goals-summary-banner"
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        {/* Metric 1: Total Target */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0">
            <FaBullseye />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total Target Savings</span>
            <span
              data-testid="summary-total-target"
              className="text-xl font-bold text-slate-800"
            >
              {formatCurrency(totalTarget, currency)}
            </span>
          </div>
        </div>

        {/* Metric 2: Total Saved */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center text-xl shrink-0">
            <FaPiggyBank />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total Saved Funds</span>
            <span
              data-testid="summary-total-saved"
              className="text-xl font-bold text-teal-700"
            >
              {formatCurrency(totalSaved, currency)}
            </span>
          </div>
        </div>

        {/* Metric 3: Overall Completion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
            <FaChartLine />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Overall Completion</span>
            <span
              data-testid="summary-completion-rate"
              className="text-xl font-bold text-slate-800"
            >
              {overallCompletion}%
            </span>
          </div>
        </div>

        {/* Metric 4: Goal Breakdown (Completed vs Active) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
            <FaCheckCircle />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Goal Status</span>
            <span
              data-testid="summary-goals-status"
              className="text-sm font-semibold text-slate-700"
            >
              <span className="text-emerald-600 font-bold">{completedGoalsCount}</span> Completed /{' '}
              <span className="text-teal-600 font-bold">{inProgressGoalsCount}</span> Active
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area: Loading, Empty State, or Card Grid */}
      {loading && goals.length === 0 ? (
        <div
          data-testid="goals-loading"
          className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3"
        >
          <FaSpinner className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading your savings goals...</p>
        </div>
      ) : goals.length === 0 ? (
        /* Empty State */
        <div
          data-testid="goals-empty-state"
          className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center text-3xl">
            <FaBullseye />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-bold text-slate-800">No Savings Goals Yet</h3>
            <p className="text-sm text-slate-500">
              Create your first savings goal to track your progress towards an emergency fund, dream vacation, or big purchase!
            </p>
          </div>
          <button
            type="button"
            data-testid="empty-create-goal-button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all"
          >
            <FaPlus className="w-3.5 h-3.5" />
            <span>Create Your First Goal</span>
          </button>
        </div>
      ) : (
        /* Responsive Grid of Goal Cards */
        <div
          data-testid="goals-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {goals.map((goal) => (
            <GoalCard
              key={goal._id}
              goal={goal}
              currency={currency}
              onContribute={handleOpenContributeModal}
              onEdit={handleOpenEditModal}
              onDelete={handlePromptDelete}
            />
          ))}
        </div>
      )}

      {/* Goal Modal (Dual mode: Create/Edit OR Contribute) */}
      <GoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        goal={selectedGoal}
        currency={currency}
        createGoal={createGoal}
        updateGoal={updateGoal}
        contributeGoal={contributeGoal}
      />

      {/* Delete Confirmation Dialog */}
      {deletingGoal && (
        <div
          data-testid="goal-delete-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg shrink-0">
                <FaExclamationTriangle />
              </div>
              <div>
                <h3 id="delete-dialog-title" className="text-base font-bold text-slate-800">
                  Delete Savings Goal
                </h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-slate-800">
                "{deletingGoal.title || deletingGoal.name}"
              </span>
              ? Your recorded saved amount will be removed from your goals overview.
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                data-testid="cancel-delete-goal-button"
                onClick={() => setDeletingGoal(null)}
                disabled={isDeleteSubmitting}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-delete-goal-button"
                onClick={handleConfirmDelete}
                disabled={isDeleteSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all disabled:opacity-60"
              >
                {isDeleteSubmitting ? (
                  <>
                    <FaSpinner className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Goal</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
