import { useState, useEffect, useCallback, useRef } from 'react';
import axiosClient from '../api/axiosClient.js';
import { onSync } from '../utils/eventBus.js';

/**
 * useAnalytics Custom React Hook
 *
 * Provides pure React state management for analytics charts and metric cards:
 * - overview: Lifetime and monthly totals (income, expense, net savings, budget usage)
 * - categoryBreakdown: Expense aggregation grouped by category with percentages and icons
 * - spendingTrends: Chronological income, expense, and net data points for Recharts area/bar charts
 *
 * Adheres strictly to the architectural constraint: NO Redux, NO RTK Query, NO Context API.
 * Uses native useState, useEffect, and window EventBus (onSync) for reactive chart updates.
 *
 * @param {string} [timeframe='Month'] - Analysis timeframe ('Week' | 'Month' | '3Months' | 'Year')
 *
 * @returns {Object} Analytics state and action methods:
 *   - overview: {Object|null} High-level metric summary
 *   - categoryBreakdown: {Object|null} Category-grouped spending array and total
 *   - spendingTrends: {Object|null} Time-bucketed trend points with zero-filled gaps
 *   - loading: {boolean} Network aggregation in progress indicator
 *   - error: {string|null} Error message if aggregation fails
 *   - fetchAnalytics: {Function} Re-fetches all 3 analytics endpoints concurrently
 */
export const useAnalytics = (timeframe = 'Month') => {
  // ---------------------------------------------------------------------------
  // 1. STATE INITIALIZATION
  // ---------------------------------------------------------------------------

  // High-level financial overview metrics
  const [overview, setOverview] = useState(null);

  // Category spending aggregation for donut/pie charts
  const [categoryBreakdown, setCategoryBreakdown] = useState(null);

  // Chronological trend series for line/bar charts
  const [spendingTrends, setSpendingTrends] = useState(null);

  // Network request loading indicator
  const [loading, setLoading] = useState(false);

  // Network request error state
  const [error, setError] = useState(null);

  // Keep ref of latest timeframe to avoid unnecessary callback recreation
  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;

  // ---------------------------------------------------------------------------
  // 2. DATA RETRIEVAL (PARALLEL AGGREGATIONS)
  // ---------------------------------------------------------------------------

  /**
   * Fetches overview, category breakdown, and spending trends concurrently using Promise.all.
   *
   * @param {string} [customTimeframe] - Optional timeframe to override current hook argument
   */
  const fetchAnalytics = useCallback(async (customTimeframe) => {
    setLoading(true);
    setError(null);

    const activeTf = customTimeframe || timeframeRef.current || 'Month';

    try {
      const [overviewRes, categoriesRes, trendsRes] = await Promise.all([
        axiosClient.get('/analytics/overview'),
        axiosClient.get('/analytics/categories', { params: { timeframe: activeTf } }),
        axiosClient.get('/analytics/trends', { params: { timeframe: activeTf } }),
      ]);

      const overviewData =
        overviewRes.data.overview || overviewRes.data.data || overviewRes.data;
      const categoriesData = categoriesRes.data;
      const trendsData = trendsRes.data;

      setOverview(overviewData);
      setCategoryBreakdown(categoriesData);
      setSpendingTrends(trendsData);

      return {
        success: true,
        overview: overviewData,
        categoryBreakdown: categoriesData,
        spendingTrends: trendsData,
      };
    } catch (err) {
      const message =
        err.response?.data?.message || err.message || 'Failed to fetch financial analytics.';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 3. LIFECYCLE & EVENT SYNCHRONIZATION (onSync)
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // 1. Initial fetch whenever timeframe changes
    fetchAnalytics(timeframe);

    // 2. Subscribe to EventBus sync events:
    // When transactions, budgets, or recurring items update, refresh analytics metrics
    const relevantEvents = [
      'transaction:created',
      'transaction:updated',
      'transaction:deleted',
      'budget:updated',
      'recurring:paid',
      'goal:contributed',
    ];

    const unsubscribe = onSync((detail) => {
      if (!detail) return;
      if (relevantEvents.includes(detail.type)) {
        fetchAnalytics(timeframeRef.current);
      }
    });

    // 3. Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [fetchAnalytics, timeframe]);

  return {
    overview,
    categoryBreakdown,
    spendingTrends,
    loading,
    error,
    fetchAnalytics,
  };
};

export default useAnalytics;
