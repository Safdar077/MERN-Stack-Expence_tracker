import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient.js';
import { emitSync, onSync } from '../utils/eventBus.js';

/**
 * useRecurring Custom React Hook
 *
 * Provides pure React state management for recurring transaction rules (subscriptions, rent, salaries).
 * Automatically categorizes recurring rules into:
 * - recurringList: complete list of recurring rules
 * - dueItems: rules with nextDueDate <= end of today
 * - upcomingItems: rules due within the next 7 days
 *
 * Adheres strictly to the architectural constraint: NO Redux, NO RTK Query, NO Context API.
 * Uses native useState, useEffect, and window EventBus (emitSync / onSync) for reactive updates.
 *
 * @returns {Object} Recurring state and action methods:
 *   - recurringList: {Array} All recurring transaction rules
 *   - dueItems: {Array} Rules that are due for payment today or overdue
 *   - upcomingItems: {Array} Rules due within the next 7 days
 *   - loading: {boolean} Network request in progress indicator
 *   - error: {string|null} Error message if an operation failed
 *   - fetchRecurring: {Function} Re-fetches rules from GET /api/recurring
 *   - addRecurring: {Function} Creates a new rule via POST /api/recurring
 *   - addRecurringRule: {Function} Alias to addRecurring for API compatibility
 *   - updateRecurring: {Function} Updates an existing rule via PUT /api/recurring/:id
 *   - deleteRecurring: {Function} Deletes a rule via DELETE /api/recurring/:id
 *   - markAsPaid: {Function} Executes payment for a rule via POST /api/recurring/:id/pay
 */
export const useRecurring = () => {
  // ---------------------------------------------------------------------------
  // 1. STATE INITIALIZATION
  // ---------------------------------------------------------------------------

  // Array of all recurring rule documents
  const [recurringList, setRecurringList] = useState([]);

  // Rules currently due today or overdue
  const [dueItems, setDueItems] = useState([]);

  // Rules due in the near future (next 7 days)
  const [upcomingItems, setUpcomingItems] = useState([]);

  // Network request loading indicator
  const [loading, setLoading] = useState(false);

  // Network request error state
  const [error, setError] = useState(null);

  // ---------------------------------------------------------------------------
  // 2. DATA RETRIEVAL (GET /api/recurring)
  // ---------------------------------------------------------------------------

  /**
   * Fetches all recurring rules, separated into due and upcoming lists.
   */
  const fetchRecurring = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosClient.get('/recurring');
      const {
        recurringRules = [],
        dueItems: fetchedDue = [],
        upcomingItems: fetchedUpcoming = [],
      } = response.data;

      setRecurringList(recurringRules);
      setDueItems(fetchedDue);
      setUpcomingItems(fetchedUpcoming);

      return {
        success: true,
        recurringList: recurringRules,
        dueItems: fetchedDue,
        upcomingItems: fetchedUpcoming,
      };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Failed to fetch recurring rules.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 3. MUTATION ACTIONS (ADD, UPDATE, DELETE, MARK AS PAID)
  // ---------------------------------------------------------------------------

  /**
   * Adds a new recurring transaction rule.
   *
   * @param {Object} ruleData - { name, amount, type, categoryId, accountId, frequency, startDate, nextDueDate }
   */
  const addRecurring = useCallback(
    async (ruleData) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axiosClient.post('/recurring', ruleData);
        const newRule = response.data.rule;

        // Broadcast sync event to notify other components
        emitSync('recurring:created', newRule);

        // Re-fetch recurring rules
        await fetchRecurring();

        return { success: true, rule: newRule };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to add recurring rule.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [fetchRecurring]
  );

  /**
   * Updates an existing recurring rule by ID.
   *
   * @param {string} id - RecurringRule ObjectId
   * @param {Object} ruleData - Fields to update
   */
  const updateRecurring = useCallback(
    async (id, ruleData) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axiosClient.put(`/recurring/${id}`, ruleData);
        const updatedRule = response.data.rule;

        // Broadcast sync event
        emitSync('recurring:updated', updatedRule);

        // Re-fetch recurring rules
        await fetchRecurring();

        return { success: true, rule: updatedRule };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to update recurring rule.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [fetchRecurring]
  );

  /**
   * Deletes a recurring rule by ID.
   *
   * @param {string} id - RecurringRule ObjectId
   */
  const deleteRecurring = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        await axiosClient.delete(`/recurring/${id}`);

        // Broadcast sync event
        emitSync('recurring:deleted', { id });

        // Re-fetch recurring rules
        await fetchRecurring();

        return { success: true };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to delete recurring rule.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [fetchRecurring]
  );

  /**
   * Executes the "Mark as Paid" action:
   * Creates an actual transaction record, updates the account balance,
   * and advances nextDueDate according to frequency.
   *
   * @param {string} id - RecurringRule ObjectId
   */
  const markAsPaid = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axiosClient.post(`/recurring/${id}/pay`);
        const { rule: updatedRule, transaction } = response.data;

        // Broadcast sync events to trigger updates across accounts, transactions, and budgets
        emitSync('recurring:paid', { rule: updatedRule, transaction });
        emitSync('transaction:created', transaction);
        emitSync('account:updated');
        emitSync('budget:updated');

        // Re-fetch recurring rules list
        await fetchRecurring();

        return { success: true, rule: updatedRule, transaction };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to mark recurring item as paid.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    [fetchRecurring]
  );

  // ---------------------------------------------------------------------------
  // 4. LIFECYCLE & EVENT SYNCHRONIZATION (onSync)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // 1. Initial fetch on mount
    fetchRecurring();

    // 2. Subscribe to EventBus sync events:
    const relevantEvents = [
      'recurring:created',
      'recurring:updated',
      'recurring:deleted',
      'recurring:paid',
    ];

    const unsubscribe = onSync((detail) => {
      if (!detail) return;
      if (relevantEvents.includes(detail.type)) {
        fetchRecurring();
      }
    });

    // 3. Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [fetchRecurring]);

  return {
    recurringList,
    dueItems,
    upcomingItems,
    loading,
    error,
    fetchRecurring,
    addRecurring,
    addRecurringRule: addRecurring,
    updateRecurring,
    deleteRecurring,
    markAsPaid,
  };
};

export default useRecurring;
