import { useState, useEffect, useCallback, useMemo } from 'react';
import axiosClient from '../api/axiosClient.js';
import { emitSync, onSync } from '../utils/eventBus.js';

/**
 * useCategories Custom React Hook
 *
 * Provides pure React state management for transaction categories.
 * Categorizes system-default and user-created custom categories into:
 * - categories: complete list
 * - expenseCategories: filtered for type === 'Expense'
 * - incomeCategories: filtered for type === 'Income'
 *
 * Adheres strictly to the architectural constraint: NO Redux, NO RTK Query, NO Context API.
 * Uses native useState, useMemo, and EventBus (emitSync / onSync) for reactive updates.
 *
 * @returns {Object} Categories state and action methods:
 *   - categories: {Array} All categories (Expense and Income, default and custom)
 *   - expenseCategories: {Array} Categories where type is 'Expense'
 *   - incomeCategories: {Array} Categories where type is 'Income'
 *   - loading: {boolean} True while categories are loading
 *   - error: {string|null} Error message if retrieval fails
 *   - fetchCategories: {Function} Re-fetches category list from GET /api/categories
 *   - createCustomCategory: {Function} Creates a custom category via POST /api/categories
 */
export const useCategories = () => {
  // ---------------------------------------------------------------------------
  // 1. STATE INITIALIZATION
  // ---------------------------------------------------------------------------

  // Array of category objects ([{ _id, name, type, icon, isCustom }])
  const [categories, setCategories] = useState([]);

  // Network request loading indicator
  const [loading, setLoading] = useState(false);

  // Network request error state
  const [error, setError] = useState(null);

  // ---------------------------------------------------------------------------
  // 2. DERIVED STATE (MEMOIZED FILTERS)
  // ---------------------------------------------------------------------------

  // Memoized filter for expense categories (avoids recalculating unless categories array changes)
  const expenseCategories = useMemo(() => {
    return categories.filter((cat) => cat.type === 'Expense');
  }, [categories]);

  // Memoized filter for income categories
  const incomeCategories = useMemo(() => {
    return categories.filter((cat) => cat.type === 'Income');
  }, [categories]);

  // ---------------------------------------------------------------------------
  // 3. DATA RETRIEVAL (GET /api/categories)
  // ---------------------------------------------------------------------------

  /**
   * Fetches all categories (global defaults + user's custom categories) from the server.
   */
  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosClient.get('/categories');
      const fetched = response.data.categories || [];
      setCategories(fetched);
      return { success: true, categories: fetched };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Failed to fetch categories.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 4. MUTATION ACTIONS (CREATE CUSTOM CATEGORY)
  // ---------------------------------------------------------------------------

  /**
   * Creates a user-defined custom category.
   *
   * @param {Object} categoryData - { name, type: 'Expense'|'Income', icon: string }
   * @returns {Promise<{success: boolean, category?: Object, error?: string}>}
   */
  const createCustomCategory = useCallback(
    async (categoryData) => {
      setLoading(true);
      setError(null);

      try {
        const response = await axiosClient.post('/categories', categoryData);
        const newCategory = response.data.category;

        // Broadcast event so other hooks (transactions, budgets) recognize the new category
        emitSync('category:created', newCategory);

        return { success: true, category: newCategory };
      } catch (err) {
        const message =
          err.response?.data?.message || err.message || 'Failed to create category.';
        setError(message);
        return { success: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // 5. LIFECYCLE & EVENT SYNCHRONIZATION (onSync)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // 1. Initial fetch on mount
    fetchCategories();

    // 2. Subscribe to EventBus sync events:
    // When a custom category is created, re-fetch the list
    const unsubscribe = onSync((detail) => {
      if (!detail) return;
      if (detail.type === 'category:created') {
        fetchCategories();
      }
    });

    // 3. Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, [fetchCategories]);

  return {
    categories,
    expenseCategories,
    incomeCategories,
    loading,
    error,
    fetchCategories,
    createCustomCategory,
  };
};

export default useCategories;
