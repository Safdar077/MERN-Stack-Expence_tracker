import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient.js';
import { emitSync, onSync } from '../utils/eventBus.js';

/**
 * useGoals Custom React Hook
 *
 * Provides pure React state management for savings goals (e.g. Vacation, Emergency Fund, Down Payment)
 * with dynamic progress tracking and account balance contribution integration.
 *
 * Adheres strictly to the architectural constraint: NO Redux, NO RTK Query, NO Context API.
 * Uses native useState, useEffect, and window EventBus (emitSync / onSync) for reactive updates.
 *
 * Subscribes to 'app:sync' events:
 * Whenever a goal is modified or contributed to, the hook automatically refreshes the goal list.
 *
 * @returns {Object} Goals state and action methods:
 *   - goals: {Array} List of savings goal objects with calculated progress percentages
 *   - loading: {boolean} Network request in progress indicator
 *   - error: {string|null} Error message if an operation failed
 *   - fetchGoals: {Function} Re-fetches savings goals from GET /api/goals
 *   - createGoal: {Function} Creates a new goal via POST /api/goals
 *   - updateGoal: {Function} Updates an existing goal via PUT /api/goals/:id
 *   - deleteGoal: {Function} Deletes a goal via DELETE /api/goals/:id
 *   - contributeGoal: {Function} Adds funds to a goal from an account via POST /api/goals/:id/contribute
 */
/**
 * Helper to normalize goal item names bidirectionally (title <-> name)
 * Ensures consistency across components expecting either property.
 */
const normalizeGoal = (item) => {
  if (!item || typeof item !== 'object') return item;
  const title = item.title || item.name || '';
  const name = item.name || item.title || '';
  return {
    ...item,
    title,
    name,
  };
};

export const useGoals = () => {
  // ---------------------------------------------------------------------------
  // 1. STATE INITIALIZATION
  // ---------------------------------------------------------------------------

  // Array of savings goal documents ([{ _id, name, targetAmount, currentAmount, progress, targetDate }])
  const [goals, setGoals] = useState([]);

  // Network request loading indicator
  const [loading, setLoading] = useState(false);

  // Network request error state
  const [error, setError] = useState(null);

  // ---------------------------------------------------------------------------
  // 2. DATA RETRIEVAL (GET /api/goals)
  // ---------------------------------------------------------------------------

  /**
   * Fetches all savings goals for the authenticated user with bidirectional name/title normalization.
   */
  const fetchGoals = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosClient.get('/goals');
      const rawGoals = response.data.goals || [];
      const fetchedGoals = rawGoals.map(normalizeGoal);

      setGoals(fetchedGoals);
      return { success: true, goals: fetchedGoals };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Failed to fetch savings goals.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 3. MUTATION ACTIONS (CREATE, UPDATE, DELETE, CONTRIBUTE)
  // ---------------------------------------------------------------------------

  /**
   * Creates a new savings goal with normalized title and name.
   *
   * @param {Object} goalData - { name, title, targetAmount, targetDate, currentAmount, linkedAccountId }
   */
  const createGoal = useCallback(
    async (goalData) => {
      setLoading(true);
      setError(null);

      try {
        const payload = {
          ...goalData,
          title: goalData.title || goalData.name,
          name: goalData.name || goalData.title,
        };
        const response = await axiosClient.post('/goals', payload);
        const newGoal = normalizeGoal(response.data.goal);

        // Broadcast sync event to notify all components (and trigger reactive refetch via onSync)
        emitSync('goal:created', newGoal);

        return { success: true, goal: newGoal };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to create savings goal.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Updates an existing savings goal by ID with normalized title and name.
   *
   * @param {string} id - Goal ObjectId
   * @param {Object} goalData - Fields to update
   */
  const updateGoal = useCallback(
    async (id, goalData) => {
      setLoading(true);
      setError(null);

      try {
        const payload = {
          ...goalData,
          ...(goalData.title || goalData.name
            ? {
                title: goalData.title || goalData.name,
                name: goalData.name || goalData.title,
              }
            : {}),
        };
        const response = await axiosClient.put(`/goals/${id}`, payload);
        const updatedGoal = normalizeGoal(response.data.goal);

        // Broadcast sync event to notify components
        emitSync('goal:updated', updatedGoal);

        return { success: true, goal: updatedGoal };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to update savings goal.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Deletes a savings goal by ID.
   *
   * @param {string} id - Goal ObjectId
   */
  const deleteGoal = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        await axiosClient.delete(`/goals/${id}`);

        // Broadcast sync event (triggers refetch via onSync)
        emitSync('goal:deleted', { id });

        return { success: true };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to delete savings goal.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Contributes funds from an account to this savings goal.
   * Records transaction and decreases the source account balance.
   * Supports both (id, { amount, accountId }) and (id, amount, accountId).
   *
   * @param {string} id - Goal ObjectId
   * @param {Object|number} contribution - { amount: number, accountId?: string } or numeric amount
   * @param {string} [maybeAccountId] - Optional account ID when contribution is a numeric amount
   */
  const contributeGoal = useCallback(
    async (id, contribution, maybeAccountId) => {
      setLoading(true);
      setError(null);

      try {
        let payload = contribution;
        if (typeof contribution === 'number' || typeof contribution === 'string') {
          payload = {
            amount: Number(contribution),
            ...(maybeAccountId ? { accountId: maybeAccountId } : {}),
          };
        }
        const response = await axiosClient.post(`/goals/${id}/contribute`, payload);
        const updatedGoal = normalizeGoal(response.data.goal);
        const { transaction } = response.data;

        // Broadcast sync events for goal, transaction, and account balance changes
        emitSync('goal:contributed', { goal: updatedGoal, transaction });
        emitSync('transaction:created', transaction);
        emitSync('account:updated', { id: contribution.accountId });

        return { success: true, goal: updatedGoal, transaction };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to record goal contribution.';
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
    fetchGoals();

    // 2. Subscribe to EventBus sync events:
    const relevantEvents = [
      'goal:created',
      'goal:updated',
      'goal:deleted',
      'goal:contributed',
    ];

    const unsubscribe = onSync((detail) => {
      if (!detail) return;
      if (relevantEvents.includes(detail.type)) {
        fetchGoals();
      }
    });

    // 3. Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [fetchGoals]);

  return {
    goals,
    loading,
    error,
    fetchGoals,
    createGoal,
    updateGoal,
    deleteGoal,
    contributeGoal,
  };
};

export default useGoals;
