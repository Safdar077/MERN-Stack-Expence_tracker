import { useState, useEffect, useCallback, useRef } from 'react';
import axiosClient from '../api/axiosClient.js';
import { emitSync, onSync } from '../utils/eventBus.js';

/**
 * useTransactions Custom React Hook
 *
 * Provides pure React state management for transactions (incomes & expenses),
 * supporting pagination, multi-criteria filtering, CRUD operations, CSV export,
 * and native EventBus reactive synchronization.
 *
 * Adheres strictly to the architectural constraint: NO Redux, NO RTK Query, NO Context API.
 * Uses native useState, useEffect, and window EventBus (emitSync / onSync).
 *
 * @param {Object} [filters={}] - Optional initial filter query parameters:
 *   - page: {number} Page number (default: 1)
 *   - limit: {number} Number of items per page (default: 10 or 20)
 *   - type: {'Income'|'Expense'} Filter by transaction type
 *   - category: {string} Filter by category ObjectId
 *   - account: {string} Filter by account ObjectId
 *   - startDate: {string} 'YYYY-MM-DD'
 *   - endDate: {string} 'YYYY-MM-DD'
 *   - search: {string} Search keyword for notes
 *
 * @returns {Object} Transactions state and action methods:
 *   - transactions: {Array} Paginated array of transaction items
 *   - totalCount: {number} Total count of matching transactions in database
 *   - page: {number} Current page number
 *   - totalPages: {number} Total number of available pages
 *   - loading: {boolean} Network request in progress indicator
 *   - error: {string|null} Error message if network request fails
 *   - fetchTransactions: {Function} Re-fetches transactions with optional filter override
 *   - addTransaction: {Function} Creates a new transaction via POST /api/transactions
 *   - editTransaction: {Function} Updates an existing transaction via PUT /api/transactions/:id
 *   - deleteTransaction: {Function} Deletes a transaction via DELETE /api/transactions/:id
 *   - exportCSV: {Function} Initiates CSV download from GET /api/transactions/export
 */
export const useTransactions = (filters = {}) => {
  // ---------------------------------------------------------------------------
  // 1. STATE INITIALIZATION
  // ---------------------------------------------------------------------------

  // Array of fetched transaction objects
  const [transactions, setTransactions] = useState([]);

  // Total matching transactions across all pages
  const [totalCount, setTotalCount] = useState(0);

  // Current active page number
  const [page, setPage] = useState(filters.page || 1);

  // Total pages computed by server (Math.ceil(total / limit))
  const [totalPages, setTotalPages] = useState(1);

  // Network request loading indicator
  const [loading, setLoading] = useState(false);

  // Error message state
  const [error, setError] = useState(null);

  // Keep refs of current page and active filters to persist across sync refetches
  const pageRef = useRef(filters.page || 1);
  pageRef.current = page;

  const currentFiltersRef = useRef(filters);
  const prevFilterPageRef = useRef(filters.page);
  const filterKey = JSON.stringify(filters);

  // When filters prop changes externally, update currentFiltersRef
  useEffect(() => {
    currentFiltersRef.current = {
      ...currentFiltersRef.current,
      ...filters,
    };
    if (filters.page !== undefined && filters.page !== prevFilterPageRef.current) {
      prevFilterPageRef.current = filters.page;
      pageRef.current = filters.page;
      setPage(filters.page);
    }
  }, [filterKey]);

  // ---------------------------------------------------------------------------
  // 2. DATA RETRIEVAL (GET /api/transactions)
  // ---------------------------------------------------------------------------

  /**
   * Fetches paginated and filtered transactions from GET /api/transactions.
   * Persists active page across EventBus sync refetches.
   *
   * @param {Object} [overrideFilters={}] - Optional query params that override current filters
   */
  const fetchTransactions = useCallback(async (overrideFilters = {}) => {
    setLoading(true);
    setError(null);

    // If overrideFilters specifies a page, use it; otherwise persist currently active page
    const targetPage =
      overrideFilters.page !== undefined ? overrideFilters.page : pageRef.current || 1;

    const activeParams = {
      ...currentFiltersRef.current,
      ...overrideFilters,
      page: targetPage,
    };

    // Update refs to track current active query parameters
    currentFiltersRef.current = {
      ...currentFiltersRef.current,
      ...overrideFilters,
    };
    pageRef.current = targetPage;

    try {
      const response = await axiosClient.get('/transactions', {
        params: activeParams,
      });

      const {
        transactions: fetchedList = [],
        total = 0,
        page: currentPage = targetPage,
        pages = 1,
      } = response.data;

      setTransactions(fetchedList);
      setTotalCount(total);
      setPage(currentPage);
      pageRef.current = currentPage;
      setTotalPages(pages);

      return {
        success: true,
        transactions: fetchedList,
        total,
        page: currentPage,
        totalPages: pages,
      };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Failed to fetch transactions.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 3. MUTATION ACTIONS (ADD, EDIT, DELETE, EXPORT)
  // ---------------------------------------------------------------------------

  /**
   * Adds a new transaction and synchronizes balance with the source account.
   *
   * @param {Object} transactionData - { amount, type, categoryId, accountId, date, note, ... }
   */
  const addTransaction = useCallback(
    async (transactionData) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axiosClient.post('/transactions', transactionData);
        const newTx = response.data.transaction;

        // Broadcast sync event so accounts, budget, and transaction hooks refresh automatically
        emitSync('transaction:created', newTx);

        return { success: true, transaction: newTx };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to add transaction.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Edits an existing transaction by ID.
   *
   * @param {string} id - Transaction ObjectId
   * @param {Object} transactionData - Updated transaction properties
   */
  const editTransaction = useCallback(
    async (id, transactionData) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axiosClient.put(`/transactions/${id}`, transactionData);
        const updatedTx = response.data.transaction;

        // Broadcast sync event
        emitSync('transaction:updated', updatedTx);

        return { success: true, transaction: updatedTx };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to update transaction.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Deletes a transaction by ID and restores the associated account balance.
   *
   * @param {string} id - Transaction ObjectId
   */
  const deleteTransaction = useCallback(
    async (id) => {
      setLoading(true);
      setError(null);

      try {
        await axiosClient.delete(`/transactions/${id}`);

        // Broadcast sync event
        emitSync('transaction:deleted', { id });

        return { success: true };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to delete transaction.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Exports filtered transactions to CSV format and prompts browser file download.
   *
   * @param {Object} [exportFilters={}] - Optional export filter parameters
   */
  const exportCSV = useCallback(
    async (exportFilters = {}) => {
      try {
        const params = { ...currentFiltersRef.current, ...exportFilters };
        const response = await axiosClient.get('/transactions/export', {
          params,
          responseType: 'blob',
        });

        // Trigger browser file download if supported in client window environment
        if (
          typeof window !== 'undefined' &&
          typeof document !== 'undefined' &&
          typeof window.URL?.createObjectURL === 'function'
        ) {
          const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.setAttribute('download', `transactions_export_${Date.now()}.csv`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          if (typeof window.URL?.revokeObjectURL === 'function') {
            window.URL.revokeObjectURL(blobUrl);
          }
        }

        return { success: true, data: response.data };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to export transactions CSV.';
        return { success: false, error: message };
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // 4. LIFECYCLE & EVENT SYNCHRONIZATION (onSync)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // 1. Fetch transactions on mount or when filter parameters change
    fetchTransactions();

    // 2. Subscribe to EventBus sync events:
    // When transactions, recurring rules, or account updates occur, re-fetch list.
    const relevantEvents = [
      'transaction:created',
      'transaction:updated',
      'transaction:deleted',
      'recurring:paid',
      'goal:contributed',
    ];

    const unsubscribe = onSync((detail) => {
      if (!detail) return;
      if (relevantEvents.includes(detail.type)) {
        fetchTransactions();
      }
    });

    // 3. Cleanup event listener on unmount
    return () => {
      unsubscribe();
    };
  }, [fetchTransactions, filterKey]);

  return {
    transactions,
    totalCount,
    page,
    totalPages,
    loading,
    error,
    fetchTransactions,
    addTransaction,
    editTransaction,
    deleteTransaction,
    exportCSV,
  };
};

export default useTransactions;
