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
/**
 * Helper to normalize recurring rule item names bidirectionally (title <-> name)
 * Ensures consistency across components expecting either property.
 */
const normalizeRecurring = (item) => {
  if (!item || typeof item !== 'object') return item;
  const title = item.title || item.name || '';
  const name = item.name || item.title || '';
  return {
    ...item,
    title,
    name,
  };
};

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
   * Fetches all recurring rules, separated into due and upcoming lists with title/name normalization.
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

      const normalizedRules = recurringRules.map(normalizeRecurring);
      const normalizedDue = fetchedDue.map(normalizeRecurring);
      const normalizedUpcoming = fetchedUpcoming.map(normalizeRecurring);

      setRecurringList(normalizedRules);
      setDueItems(normalizedDue);
      setUpcomingItems(normalizedUpcoming);

      return {
        success: true,
        recurringList: normalizedRules,
        dueItems: normalizedDue,
        upcomingItems: normalizedUpcoming,
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
   * Adds a new recurring transaction rule with normalized title and name.
   *
   * @param {Object} ruleData - { name, title, amount, type, categoryId, accountId, frequency, startDate, nextDueDate }
   */
  const addRecurring = useCallback(
    async (ruleData) => {
      setLoading(true);
      setError(null);

      try {
        const payload = {
          ...ruleData,
          title: ruleData.title || ruleData.name,
          name: ruleData.name || ruleData.title,
        };
        const response = await axiosClient.post('/recurring', payload);
        const newRule = normalizeRecurring(response.data.rule);

        // Broadcast sync event to notify other components (and trigger reactive refetch via onSync)
        emitSync('recurring:created', newRule);

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
    []
  );

  /**
   * Updates an existing recurring rule by ID with normalized title and name.
   *
   * @param {string} id - RecurringRule ObjectId
   * @param {Object} ruleData - Fields to update
   */
  const updateRecurring = useCallback(
    async (id, ruleData) => {
      setLoading(true);
      setError(null);

      try {
        const payload = {
          ...ruleData,
          ...(ruleData.title || ruleData.name
            ? {
                title: ruleData.title || ruleData.name,
                name: ruleData.name || ruleData.title,
              }
            : {}),
        };
        const response = await axiosClient.put(`/recurring/${id}`, payload);
        const updatedRule = normalizeRecurring(response.data.rule);

        // Broadcast sync event
        emitSync('recurring:updated', updatedRule);

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
    []
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
    []
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
        const normalizedRule = normalizeRecurring(updatedRule);

        // Broadcast sync events to trigger updates across accounts, transactions, and budgets
        emitSync('recurring:paid', { rule: normalizedRule, transaction });
        emitSync('transaction:created', transaction);
        emitSync('account:updated');
        emitSync('budget:updated');

        return { success: true, rule: normalizedRule, transaction };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to mark recurring item as paid.';
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
