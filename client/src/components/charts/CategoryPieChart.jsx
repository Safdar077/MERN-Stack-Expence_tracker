import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { FaChartPie, FaInbox } from 'react-icons/fa';
import { formatCurrency } from '../../utils/formatters.js';

// Default vibrant color palette if category does not define a custom hex color
const DEFAULT_PALETTE = [
  '#6366F1', // Indigo
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Rose / Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#3B82F6', // Blue
];

/**
 * Custom Tooltip for Recharts Pie/Donut Chart
 * Displays category name, currency-formatted expense amount, and percentage share.
 */
const CustomPieTooltip = ({ active, payload, currency = '$' }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const color = payload[0].fill || data.color || '#6366F1';

    return (
      <div
        data-testid="category-pie-tooltip"
        className="bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-slate-200 shadow-xl text-xs space-y-1 z-50 pointer-events-none min-w-[140px]"
      >
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <span className="truncate">{data.categoryName || data.name}</span>
        </div>
        <div className="flex justify-between items-center text-slate-600 pt-1">
          <span>Amount:</span>
          <span className="font-semibold text-slate-900">
            {formatCurrency(data.amount || data.value, currency)}
          </span>
        </div>
        <div className="flex justify-between items-center text-slate-500">
          <span>Share:</span>
          <span className="font-semibold text-teal-600">
            {data.percentage !== undefined
              ? `${Math.round(data.percentage)}%`
              : `${Math.round((data.amount / (data.total || 1)) * 100)}%`}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * CategoryPieChart Component
 *
 * Renders an interactive Donut / Pie chart visualizing expense distribution across categories.
 *
 * Key Features:
 * 1. Donut Representation: innerRadius and outerRadius creating a modern donut look.
 * 2. Dynamic Categories: Reads from categoryBreakdown server aggregation or props data.
 * 3. Color Mapping: Uses category.color when available or cycles through DEFAULT_PALETTE.
 * 4. Custom Tooltip & Legend: Accessible and detailed metrics display.
 * 5. Center / Header Metric: Displays total expense amount for quick context.
 * 6. Clean Empty State: Displays friendly placeholder if no expense transactions exist.
 *
 * @param {Object} props
 * @param {Array} [props.data] - Category breakdown array [{ categoryName, amount, percentage, color, icon }]
 * @param {Object} [props.categoryBreakdown] - Server aggregation object { categories: [], totalExpenses: number }
 * @param {string} [props.currency='$'] - Currency code or symbol
 * @param {number} [props.height=320] - Height of chart in pixels
 */
const CategoryPieChart = ({
  data,
  categoryBreakdown,
  currency = '$',
  height = 320,
}) => {
  // Normalize categories list from either `data` prop or `categoryBreakdown.categories`
  const rawList =
    data ||
    categoryBreakdown?.categories ||
    [];

  // Filter out zero-amount items and map normalized properties
  const chartData = rawList
    .filter((item) => Number(item.amount || item.totalAmount || item.value) > 0)
    .map((item, index) => {
      const name = item.categoryName || item.name || 'Uncategorized';
      const amount = Number(item.amount || item.totalAmount || item.value) || 0;
      const color = item.color || DEFAULT_PALETTE[index % DEFAULT_PALETTE.length];
      const percentage =
        item.percentage !== undefined
          ? Number(item.percentage)
          : undefined;

      return {
        ...item,
        name,
        categoryName: name,
        amount,
        value: amount,
        color,
        percentage,
      };
    });

  // Calculate total expense across categories
  const totalExpense =
    categoryBreakdown?.totalExpenses !== undefined
      ? categoryBreakdown.totalExpenses
      : chartData.reduce((acc, curr) => acc + curr.amount, 0);

  // If no data exists or total is zero, render empty state
  if (chartData.length === 0 || totalExpense <= 0) {
    return (
      <div
        data-testid="category-pie-empty"
        className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm text-center min-h-[320px] space-y-3"
      >
        <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center text-xl">
          <FaInbox />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-700">No Expense Data</p>
          <p className="text-xs text-slate-400 max-w-xs">
            There are no expenses recorded for this timeframe. Once you record spending, your category distribution will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="category-pie-chart"
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between"
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center text-sm">
            <FaChartPie />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Category Breakdown</h3>
            <p className="text-xs text-slate-400">Expense spending by category</p>
          </div>
        </div>

        {/* Total Expense Badge */}
        <div className="text-right">
          <span className="text-[11px] font-medium text-slate-400 block">Total Expense</span>
          <span
            data-testid="category-pie-total"
            className="text-base font-bold text-slate-900"
          >
            {formatCurrency(totalExpense, currency)}
          </span>
        </div>
      </div>

      {/* Donut Chart Visualization */}
      <div className="w-full relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={height * 0.22}
              outerRadius={height * 0.36}
              paddingAngle={3}
              isAnimationActive={false}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${entry.categoryId || entry._id || index}`}
                  fill={entry.color}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              content={<CustomPieTooltip currency={currency} />}
              wrapperStyle={{ outline: 'none' }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value, entry) => {
                const item = chartData.find((d) => d.name === value);
                const percentStr =
                  item && item.percentage !== undefined
                    ? ` (${Math.round(item.percentage)}%)`
                    : '';
                return (
                  <span className="text-xs text-slate-600 font-medium">
                    {value}
                    {percentStr}
                  </span>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CategoryPieChart;
