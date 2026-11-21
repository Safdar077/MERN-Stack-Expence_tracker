import { useState, useEffect, useCallback } from 'react';
import axiosClient from '../api/axiosClient.js';
import { emitSync, onSync } from '../utils/eventBus.js';

/**
 * useAccounts Custom React Hook
 *
 * Provides pure React state management for financial accounts (Cash, Bank Account, Savings, etc.).
 * Adheres strictly to the architectural constraint: NO Redux, NO RTK Query, NO Context API.
 * Uses native useState, useEffect, and window EventBus (emitSync / onSync) for reactive data updates.
 *
 * Subscribes to 'app:sync' events:
 * Whenever an account or transaction is created/updated/deleted anywhere in the application,
 * this hook automatically re-fetches the latest account balances from the server.
 *
 * @returns {Object} Accounts state and action methods:
 *   - accounts: {Array} List of financial account objects
 *   - totalBalance: {number} Aggregate balance computed across all accounts
 *   - loading: {boolean} True while account data is being requested from API
 *   - error: {string|null} Error message if an operation failed
 *   - fetchAccounts: {Function} Re-fetches the user's accounts list from GET /api/accounts
 *   - createAccount: {Function} Creates a new account via POST /api/accounts
 *   - updateAccount: {Function} Updates an existing account via PUT /api/accounts/:id
 *   - deleteAccount: {Function} Deletes an account via DELETE /api/accounts/:id
 */
export const useAccounts = () => {
  // ---------------------------------------------------------------------------
  // 1. STATE INITIALIZATION
  // ---------------------------------------------------------------------------

  // Array of user accounts (e.g. [{ _id, name, type, balance, isDefault }])
  const [accounts, setAccounts] = useState([]);

  // Aggregate balance across all accounts, rounded to two decimal places
  const [totalBalance, setTotalBalance] = useState(0);

  // Network request loading indicator
  const [loading, setLoading] = useState(false);

  // Stores error message if any network call fails
  const [error, setError] = useState(null);

  // ---------------------------------------------------------------------------
  // 2. DATA RETRIEVAL (GET /api/accounts)
  // ---------------------------------------------------------------------------

  /**
   * Fetches all accounts for the authenticated user.
   * Updates accounts array, total balance, and resets loading state.
   */
  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosClient.get('/accounts');
      const { accounts: fetchedAccounts = [], totalBalance: balance = 0 } = response.data;

      setAccounts(fetchedAccounts);
      setTotalBalance(balance);
      return { success: true, accounts: fetchedAccounts, totalBalance: balance };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Failed to fetch financial accounts.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 3. MUTATION ACTIONS (CREATE, UPDATE, DELETE)
  // ---------------------------------------------------------------------------

  /**
   * Creates a new financial account.
   *
   * @param {Object} accountData - { name, type, balance, isDefault }
   * @returns {Promise<{success: boolean, account?: Object, error?: string}>}
   */
  const createAccount = useCallback(
    async (accountData) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axiosClient.post('/accounts', accountData);
        const newAccount = response.data.account;

        // Broadcast sync event so this hook and other hooks (transactions, analytics) refresh via onSync
        emitSync('account:created', newAccount);

        return { success: true, account: newAccount };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to create account.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Updates an existing account's details (e.g., name or initial balance).
   *
   * @param {string} id - Account MongoDB ObjectId
   * @param {Object} accountData - { name, type, balance, isDefault }
   * @returns {Promise<{success: boolean, account?: Object, error?: string}>}
   */
  const updateAccount = useCallback(
    async (id, accountData) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axiosClient.put(`/accounts/${id}`, accountData);
        const updatedAccount = response.data.account;

        // Broadcast sync event to notify all components
        emitSync('account:updated', updatedAccount);

        return { success: true, account: updatedAccount };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to update account.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Deletes an account by ID.
   *
   * @param {string} id - Account MongoDB ObjectId
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const deleteAccount = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        await axiosClient.delete(`/accounts/${id}`);

        // Broadcast sync event to notify components
        emitSync('account:deleted', { id });

        return { success: true };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to delete account.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // 4. LIFECYCLE & REACTIVE SYNCHRONIZATION (onSync)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // 1. Initial fetch when component mounts
    fetchAccounts();

    // 2. Subscribe to EventBus sync events:
    // When transactions, recurring rules, or goal contributions change account balances,
    // re-fetch accounts automatically so UI stays perfectly in sync.
    const relevantEvents = [
      'account:created',
      'account:updated',
      'account:deleted',
      'transaction:created',
      'transaction:updated',
      'transaction:deleted',
      'recurring:paid',
      'goal:contributed',
    ];

    const unsubscribe = onSync((detail) => {
      if (!detail) return;
      if (relevantEvents.includes(detail.type)) {
        fetchAccounts();
      }
    });

    // 3. Cleanup subscription on hook unmount
    return () => {
      unsubscribe();
    };
  }, [fetchAccounts]);

  return {
    accounts,
    totalBalance,
    loading,
    error,
    fetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  };
};

export default useAccounts;
