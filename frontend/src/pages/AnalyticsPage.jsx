import React, { useState } from 'react';
import {
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaWallet,
  FaPercent,
  FaCalendarAlt,
  FaSyncAlt,
  FaSpinner,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { useAuth } from '../hooks/useAuth.js';
import CategoryPieChart from '../components/charts/CategoryPieChart.jsx';
import SpendingTrendChart from '../components/charts/SpendingTrendChart.jsx';
import { formatCurrency } from '../utils/formatters.js';

/**
 * Supported timeframe options for financial aggregation.
 */
const TIMEFRAME_OPTIONS = [
  { label: 'Week', value: 'Week' },
  { label: 'Month', value: 'Month' },
  { label: '3 Months', value: '3Months' },
  { label: 'Year', value: 'Year' },
];

/**
 * AnalyticsPage Component
 *
 * Dedicated view for interactive financial reporting and data visualizations.
 *
 * Key Features:
 * 1. Timeframe Selector:
 *    - Allows switching between 'Week', 'Month', '3 Months', and 'Year'.
 *    - Passes timeframe parameter to `useAnalytics(timeframe)` to re-fetch live aggregations.
 * 2. High-Level Metric Cards:
 *    - Total Income
 *    - Total Expenses
 *    - Net Savings (Income - Expenses) with positive/negative color badges
 *    - Budget Usage (%) with limit and remaining alerts
 * 3. Interactive Data Visualizations:
 *    - Category Breakdown Donut / Pie chart (Recharts)
 *    - Chronological Spending Trends Bar / Line chart (Recharts)
 * 4. Responsive Layout:
 *    - Adaptive grid conforming to mobile, tablet, and desktop viewports.
 * 5. Architectural Compliance:
 *    - Pure React hooks, react-icons exclusively, NO Redux/Context.
 */
const AnalyticsPage = () => {
  // ---------------------------------------------------------------------------
  // 1. STATE & DATA HOOKS
  // ---------------------------------------------------------------------------
  const [selectedTimeframe, setSelectedTimeframe] = useState('Month');

  // Query server analytics aggregations based on active timeframe
  const {
    overview,
    categoryBreakdown,
    spendingTrends,
    loading,
    error,
    fetchAnalytics,
  } = useAnalytics(selectedTimeframe);

  const { user } = useAuth();
  const currency = user?.currency || '$';

  // ---------------------------------------------------------------------------
  // 2. METRIC NORMALIZATION
  // ---------------------------------------------------------------------------
  // Financial metrics for the selected timeframe (from spending trends or fallback to overview)
  const totalIncome =
    spendingTrends?.totalIncome !== undefined
      ? spendingTrends.totalIncome
      : overview?.totalIncome || 0;

  const totalExpense =
    spendingTrends?.totalExpense !== undefined
      ? spendingTrends.totalExpense
      : categoryBreakdown?.totalExpenses !== undefined
      ? categoryBreakdown.totalExpenses
      : overview?.totalExpense || 0;

  const netSavings =
    spendingTrends?.netSavings !== undefined
      ? spendingTrends.netSavings
      : totalIncome - totalExpense;

  const budgetUsage =
    overview?.budgetUsagePercentage !== undefined
      ? overview.budgetUsagePercentage
      : overview?.budget?.percentage || 0;

  const isBudgetExceeded =
    overview?.budget?.isExceeded || budgetUsage > 100;

  return (
    <div data-testid="analytics-page" className="space-y-6">
      {/* Page Header with Timeframe Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl shadow-sm">
            <FaChartLine />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Financial Analytics</h1>
            <p className="text-sm text-slate-500">
              Interactive insights on spending breakdown, cash flow, and financial trends.
            </p>
          </div>
        </div>

        {/* Timeframe Selector Pills */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 self-start sm:self-auto">
          <FaCalendarAlt className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 hidden sm:inline-block" />
          {TIMEFRAME_OPTIONS.map((tf) => {
            const isActive = selectedTimeframe === tf.value;
            return (
              <button
                key={tf.value}
                type="button"
                data-testid={`timeframe-tab-${tf.value}`}
                onClick={() => setSelectedTimeframe(tf.value)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  isActive
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div
          data-testid="analytics-error-banner"
          className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchAnalytics(selectedTimeframe)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900"
          >
            <FaSyncAlt className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Metric Summary Cards Grid */}
      <div
        data-testid="analytics-metric-cards"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Metric 1: Total Income */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
            <FaArrowUp />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total Income</span>
            <span
              data-testid="metric-total-income"
              className="text-xl font-bold text-emerald-700"
            >
              {formatCurrency(totalIncome, currency)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              In this {selectedTimeframe.toLowerCase()}
            </span>
          </div>
        </div>

        {/* Metric 2: Total Expenses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl shrink-0">
            <FaArrowDown />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Total Expenses</span>
            <span
              data-testid="metric-total-expenses"
              className="text-xl font-bold text-rose-700"
            >
              {formatCurrency(totalExpense, currency)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              In this {selectedTimeframe.toLowerCase()}
            </span>
          </div>
        </div>

        {/* Metric 3: Net Savings */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
              netSavings >= 0
                ? 'bg-teal-50 text-teal-600'
                : 'bg-rose-50 text-rose-600'
            }`}
          >
            <FaWallet />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Net Savings</span>
            <span
              data-testid="metric-net-savings"
              className={`text-xl font-bold ${
                netSavings >= 0 ? 'text-teal-700' : 'text-rose-700'
              }`}
            >
              {formatCurrency(netSavings, currency)}
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {netSavings >= 0 ? 'Surplus / Saved' : 'Deficit spending'}
            </span>
          </div>
        </div>

        {/* Metric 4: Budget Usage (%) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
              isBudgetExceeded
                ? 'bg-rose-50 text-rose-600'
                : 'bg-indigo-50 text-indigo-600'
            }`}
          >
            <FaPercent />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Budget Usage</span>
            <span
              data-testid="metric-budget-usage"
              className={`text-xl font-bold ${
                isBudgetExceeded ? 'text-rose-700' : 'text-slate-800'
              }`}
            >
              {Math.round(budgetUsage)}%
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              {overview?.budget?.limit
                ? `of ${formatCurrency(overview.budget.limit, currency)} limit`
                : 'Monthly budget'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Visual Charts Grid */}
      {loading && !categoryBreakdown && !spendingTrends ? (
        <div
          data-testid="analytics-loading"
          className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3"
        >
          <FaSpinner className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">
            Aggregating financial charts for {selectedTimeframe}...
          </p>
        </div>
      ) : (
        <div
          data-testid="analytics-charts-grid"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* Chart 1: Donut Category Breakdown */}
          <CategoryPieChart
            categoryBreakdown={categoryBreakdown}
            currency={currency}
            height={320}
          />

          {/* Chart 2: Income vs Expense Chronological Trends */}
          <SpendingTrendChart
            spendingTrends={spendingTrends}
            currency={currency}
            height={320}
          />
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
