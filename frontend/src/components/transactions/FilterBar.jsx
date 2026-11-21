import React from 'react';
import {
  FaSearch,
  FaFileCsv,
  FaSpinner,
  FaUndo,
  FaFilter,
} from 'react-icons/fa';
import { useCategories } from '../../hooks/useCategories.js';
import { useAccounts } from '../../hooks/useAccounts.js';

/**
 * FilterBar Component
 *
 * Combinable search and filter control bar for transaction history:
 * 1. Search Bar: Text input searching by note description, category name, or amount.
 * 2. Type Filter: Dropdown filtering by All Types, Expense, or Income.
 * 3. Category Filter: Dropdown dynamically populated from useCategories hook.
 * 4. Account Filter: Dropdown dynamically populated from useAccounts hook.
 * 5. Date Range: Start Date and End Date calendar pickers.
 * 6. Amount Range: Minimum Amount and Maximum Amount number inputs.
 * 7. Reset Filters: One-click button restoring default filter values.
 * 8. Export CSV: Action button triggering backend CSV download with animated loading spinner.
 *
 * Strict Architectural Compliance:
 * - NO Redux, NO Context API — pure React state and hooks.
 * - Uses react-icons exclusively.
 *
 * @param {Object} props
 * @param {Object} props.filters - Current filter values: { search, type, categoryId, accountId, startDate, endDate, minAmount, maxAmount }
 * @param {Function} props.onFilterChange - Callback invoked when a filter input changes: (key, value)
 * @param {Function} [props.onChange] - Alternative callback passing merged { ...filters, [key]: value }
 * @param {Function} props.onReset - Callback to reset all filters to initial state
 * @param {Function} props.onExport - Callback to trigger CSV export
 * @param {boolean} [props.isExporting=false] - Whether CSV export download is currently processing
 * @param {Array} [props.categories] - Optional custom categories array override (for testing or external props)
 * @param {Array} [props.accounts] - Optional custom accounts array override (for testing or external props)
 */
const FilterBar = ({
  filters = {},
  onFilterChange,
  onChange,
  onReset,
  onExport,
  isExporting = false,
  categories: categoriesProp,
  accounts: accountsProp,
}) => {
  // Dynamically retrieve user categories and accounts via pure hooks
  const hookCategories = useCategories();
  const hookAccounts = useAccounts();

  // Prefer custom prop if supplied (useful for unit testing), otherwise fallback to hook state
  const availableCategories = categoriesProp || hookCategories?.categories || [];
  const availableAccounts = accountsProp || hookAccounts?.accounts || [];

  // Filter categories according to active transaction type selection (Expense vs Income)
  const filteredCategories = React.useMemo(() => {
    if (!filters.type) {
      return availableCategories;
    }
    return availableCategories.filter((cat) => cat.type === filters.type);
  }, [availableCategories, filters.type]);

  /**
   * Dispatches filter change to parent component using either `onFilterChange` or `onChange`.
   * Clears category selection if switching transaction type makes active category incompatible.
   *
   * @param {string} key - Filter property name
   * @param {string|number} value - New filter value
   */
  const handleInputChange = (key, value) => {
    let resetCategory = false;
    if (key === 'type' && filters.categoryId) {
      if (value) {
        const currentCat = availableCategories.find((cat) => cat._id === filters.categoryId);
        if (currentCat && currentCat.type !== value) {
          resetCategory = true;
        }
      }
    }

    if (resetCategory && typeof onFilterChange === 'function') {
      onFilterChange('categoryId', '');
    }

    if (typeof onFilterChange === 'function') {
      onFilterChange(key, value);
    }

    if (typeof onChange === 'function') {
      const updated = { ...filters, [key]: value };
      if (resetCategory) {
        updated.categoryId = '';
      }
      onChange(updated);
    }
  };

  return (
    <div
      data-testid="filter-bar"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4"
    >
      {/* Top Row: Search Input + Export CSV CTA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <FaSearch className="w-4 h-4" aria-hidden="true" />
          </div>
          <input
            type="text"
            id="search"
            name="search"
            aria-label="Search transactions"
            value={filters.search || ''}
            onChange={(e) => handleInputChange('search', e.target.value)}
            placeholder="Search by note, category, or amount..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Action Controls: Reset & Export CSV */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Reset Filters CTA */}
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 transition-colors"
            title="Reset all filters to defaults"
          >
            <FaUndo className="w-3 h-3 text-slate-400" aria-hidden="true" />
            <span>Reset Filters</span>
          </button>

          {/* Export CSV CTA */}
          <button
            type="button"
            onClick={onExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
            title="Download CSV export matching current filters"
          >
            {isExporting ? (
              <FaSpinner className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <FaFileCsv className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Filter Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
        {/* 1. Type Filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-type" className="text-xs font-medium text-slate-600">
            Type
          </label>
          <select
            id="filter-type"
            name="type"
            aria-label="Transaction Type"
            value={filters.type || ''}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          >
            <option value="">All Types</option>
            <option value="Expense">Expense</option>
            <option value="Income">Income</option>
          </select>
        </div>

        {/* 2. Category Filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-category" className="text-xs font-medium text-slate-600">
            Category
          </label>
          <select
            id="filter-category"
            name="categoryId"
            aria-label="Category"
            value={filters.categoryId || ''}
            onChange={(e) => handleInputChange('categoryId', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          >
            <option value="">All Categories</option>
            {filteredCategories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Account Filter */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-account" className="text-xs font-medium text-slate-600">
            Account
          </label>
          <select
            id="filter-account"
            name="accountId"
            aria-label="Account"
            value={filters.accountId || ''}
            onChange={(e) => handleInputChange('accountId', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          >
            <option value="">All Accounts</option>
            {availableAccounts.map((acc) => (
              <option key={acc._id} value={acc._id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>

        {/* 4. Start Date */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-startDate" className="text-xs font-medium text-slate-600">
            From Date
          </label>
          <input
            type="date"
            id="filter-startDate"
            name="startDate"
            aria-label="Start Date"
            value={filters.startDate || ''}
            onChange={(e) => handleInputChange('startDate', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* 5. End Date */}
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-endDate" className="text-xs font-medium text-slate-600">
            To Date
          </label>
          <input
            type="date"
            id="filter-endDate"
            name="endDate"
            aria-label="End Date"
            value={filters.endDate || ''}
            onChange={(e) => handleInputChange('endDate', e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* 6. Amount Range: Min & Max */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-600">
            Amount Range
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              type="number"
              id="filter-minAmount"
              name="minAmount"
              min="0"
              step="any"
              placeholder="Min $"
              aria-label="Min Amount"
              value={filters.minAmount !== undefined ? filters.minAmount : ''}
              onChange={(e) => handleInputChange('minAmount', e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
            <input
              type="number"
              id="filter-maxAmount"
              name="maxAmount"
              min="0"
              step="any"
              placeholder="Max $"
              aria-label="Max Amount"
              value={filters.maxAmount !== undefined ? filters.maxAmount : ''}
              onChange={(e) => handleInputChange('maxAmount', e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
