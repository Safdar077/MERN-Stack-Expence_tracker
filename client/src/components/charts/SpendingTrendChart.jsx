import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { FaChartBar, FaInbox } from 'react-icons/fa';
import { formatCurrency } from '../../utils/formatters.js';

/**
 * Custom Tooltip for SpendingTrendChart
 * Displays the bucket timeframe label, income, expense, and net savings with status styling.
 */
const CustomTrendTooltip = ({ active, payload, label, currency = '$' }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const income = data.income || 0;
    const expense = data.expense || 0;
    const net = data.net !== undefined ? data.net : income - expense;

    return (
      <div
        data-testid="spending-trend-tooltip"
        className="bg-white/95 backdrop-blur-sm p-3.5 rounded-xl border border-slate-200 shadow-xl text-xs space-y-2 z-50 pointer-events-none min-w-[160px]"
      >
        <p className="font-bold text-slate-800 pb-1 border-b border-slate-100">
          {label || data.date || data.label}
        </p>

        <div className="space-y-1">
          <div className="flex justify-between items-center text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Income:</span>
            </span>
            <span className="font-semibold text-emerald-700">
              {formatCurrency(income, currency)}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <span>Expense:</span>
            </span>
            <span className="font-semibold text-rose-700">
              {formatCurrency(expense, currency)}
            </span>
          </div>

          <div className="flex justify-between items-center pt-1 border-t border-slate-100 font-medium">
            <span className="text-slate-500">Net:</span>
            <span
              className={`font-bold ${
                net >= 0 ? 'text-teal-600' : 'text-rose-600'
              }`}
            >
              {formatCurrency(net, currency)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * SpendingTrendChart Component
 *
 * Chronological visualization of Income vs Expense spending trends over time.
 * Supports configurable timeframes (Week, Month, 3Months, Year) with zero-filled gaps.
 *
 * Key Features:
 * 1. Income vs Expense Comparison: Side-by-side grouped bars for clean visual contrast.
 * 2. Formatted Axes: Formatted dates on XAxis and compact currency amounts on YAxis.
 * 3. Custom Tooltip & Legend: Accessible metrics breakdown.
 * 4. Clean Empty State: Graceful placeholder when no transaction activity exists.
 * 5. Architectural Compliance: Pure React, Recharts, react-icons exclusively, NO Redux/Context.
 *
 * @param {Object} props
 * @param {Array} [props.data] - Array of trend buckets [{ label, date, income, expense, net }]
 * @param {Object} [props.spendingTrends] - Server aggregation object { trends: [], totalIncome, totalExpense }
 * @param {string} [props.currency='$'] - Currency code or symbol
 * @param {number} [props.height=320] - Height of chart container
 */
const SpendingTrendChart = ({
  data,
  spendingTrends,
  currency = '$',
  height = 320,
}) => {
  // Normalize trends data from either `data` prop or `spendingTrends.trends`
  const trendsList =
    data ||
    spendingTrends?.trends ||
    [];

  // Determine whether any activity exists
  const hasActivity = trendsList.some(
    (item) => Number(item.income) > 0 || Number(item.expense) > 0
  );

  // If no trend data or zero financial activity, render clean empty state
  if (!trendsList || trendsList.length === 0 || !hasActivity) {
    return (
      <div
        data-testid="spending-trend-empty"
        className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center min-h-[320px] space-y-3"
      >
        <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center text-xl">
          <FaInbox />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-700">No Spending Trends</p>
          <p className="text-xs text-slate-400 max-w-xs">
            No income or expense records were found for this timeframe. Record transactions to view your chronological cash flow.
          </p>
        </div>
      </div>
    );
  }

  // Format currency on YAxis ticks (e.g. $500, $1.2k)
  const formatYAxisTick = (val) => {
    if (val === 0) return `${currency}0`;
    if (Math.abs(val) >= 1000) {
      return `${currency}${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
    }
    return `${currency}${val}`;
  };

  return (
    <div
      data-testid="spending-trend-chart"
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between"
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">
            <FaChartBar />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Spending Trends</h3>
            <p className="text-xs text-slate-400">Chronological income vs expenses</p>
          </div>
        </div>

        {/* Legend Indicators in Header */}
        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
            <span>Income</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0" />
            <span>Expense</span>
          </div>
        </div>
      </div>

      {/* Bar Chart Visualization */}
      <div className="w-full relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={trendsList}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxisTick}
            />
            <Tooltip
              content={<CustomTrendTooltip currency={currency} />}
              cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ paddingTop: '10px' }}
            />
            <Bar
              name="Income"
              dataKey="income"
              fill="#10B981"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={false}
            />
            <Bar
              name="Expense"
              dataKey="expense"
              fill="#F43F5E"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SpendingTrendChart;
