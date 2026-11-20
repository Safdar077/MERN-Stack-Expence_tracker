import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient.js';
import { emitSync, onSync } from '../utils/eventBus.js';

/**
 * useBudgets Custom React Hook
 *
 * Provides pure React state management for monthly budget targets, category limits,
 * dynamic threshold warnings (50%, 90%, 100%, and exceeded), and real-time spending progress.
 *
 * Adheres strictly to the architectural constraint: NO Redux, NO RTK Query, NO Context API.
 * Uses native useState, useEffect, and window EventBus (emitSync / onSync) for reactive updates.
 *
 * Subscribes to 'app:sync' events:
 * Whenever an expense is recorded, edited, or deleted anywhere in the app,
 * this hook automatically refreshes current budget computations from the server.
 *
 * @returns {Object} Budget state and action methods:
 *   - budget: {Object|null} Active monthly budget document
 *   - totalExpense: {number} Total amount spent in the current month
 *   - remaining: {number} Remaining overall budget before exceeding
 *   - percentageUsed: {number} Percentage of overall budget consumed (e.g. 75.5)
 *   - warnings: {Array} Warning indicators (overall and per-category threshold alerts)
 *   - warningAlerts: {Array} Alias to warnings for backwards-compatibility
 *   - categoryBudgets: {Array} Per-category spending vs limit summaries
 *   - categoryLimits: {Array} Target limits defined for individual categories
 *   - loading: {boolean} True during budget network calls
 *   - error: {string|null} Error message if request fails
 *   - fetchBudget: {Function} Re-fetches current month's budget from GET /api/budgets/current
 *   - updateBudget: {Function} Sets or updates overall and category budgets via POST /api/budgets
 */
export const useBudgets = () => {
  // ---------------------------------------------------------------------------
  // 1. STATE INITIALIZATION
  // ---------------------------------------------------------------------------

  // The active Budget document for current month ({ _id, month, year, overallAmount, categoryLimits })
  const [budget, setBudget] = useState(null);

  // Total expense spent in current month across all categories
  const [totalExpense, setTotalExpense] = useState(0);

  // Remaining budget amount before hitting limit
  const [remaining, setRemaining] = useState(0);

  // Overall percentage used (e.g., 65.4%)
  const [percentageUsed, setPercentageUsed] = useState(0);

  // List of threshold alerts (e.g., "Warning: You have used 90% of your Food budget")
  const [warnings, setWarnings] = useState([]);

  // Category breakdown summaries with spent vs limit computations
  const [categoryBudgets, setCategoryBudgets] = useState([]);

  // Category limits defined on the budget document
  const [categoryLimits, setCategoryLimits] = useState([]);

  // Network request loading indicator
  const [loading, setLoading] = useState(false);

  // Error message state
  const [error, setError] = useState(null);

  // ---------------------------------------------------------------------------
  // 2. DATA RETRIEVAL (GET /api/budgets/current)
  // ---------------------------------------------------------------------------

  /**
   * Fetches current monthly budget, calculating live spending from transactions.
   */
  const fetchBudget = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosClient.get('/budgets/current');
      const {
        budget: fetchedBudget = null,
        overall = {},
        categorySummaries = [],
        warnings: fetchedWarnings = [],
      } = response.data;

      setBudget(fetchedBudget);
      setTotalExpense(overall.spent || 0);
      setRemaining(overall.remaining || 0);
      setPercentageUsed(overall.percentage || 0);
      setWarnings(fetchedWarnings);
      setCategoryBudgets(categorySummaries);
      setCategoryLimits(fetchedBudget?.categoryLimits || []);

      return {
        success: true,
        budget: fetchedBudget,
        overall,
        categorySummaries,
        warnings: fetchedWarnings,
      };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Failed to fetch current budget.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 3. MUTATION ACTIONS (POST /api/budgets)
  // ---------------------------------------------------------------------------

  /**
   * Creates or updates the monthly budget and category limits.
   *
   * @param {Object} budgetData - { month, year, overallAmount, categoryLimits: [{ categoryId, amount }] }
   */
  const updateBudget = useCallback(
    async (budgetData) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axiosClient.post('/budgets', budgetData);
        const updated = response.data.budget;

        // Broadcast sync event so analytics and dashboard hooks refresh
        emitSync('budget:updated', updated);

        return { success: true, budget: updated };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to update budget.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // 4. LIFECYCLE & EVENT SYNCHRONIZATION (onSync)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // 1. Initial fetch on mount
    fetchBudget();

    // 2. Subscribe to EventBus sync events:
    // If a transaction is created, updated, or deleted, recalculate budget spent
    const relevantEvents = [
      'budget:updated',
      'transaction:created',
      'transaction:updated',
      'transaction:deleted',
      'recurring:paid',
    ];

    const unsubscribe = onSync((detail) => {
      if (!detail) return;
      if (relevantEvents.includes(detail.type)) {
        fetchBudget();
      }
    });

    // 3. Cleanup event listener on unmount
    return () => {
      unsubscribe();
    };
  }, [fetchBudget]);

  return {
    budget,
    totalExpense,
    remaining,
    percentageUsed,
    warnings,
    warningAlerts: warnings,
    categoryBudgets,
    categoryLimits,
    loading,
    error,
    fetchBudget,
    updateBudget,
  };
};

export default useBudgets;
