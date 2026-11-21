import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FaWallet,
  FaArrowUp,
  FaArrowDown,
  FaPiggyBank,
  FaPlus,
  FaHistory,
  FaReceipt,
  FaChartPie,
  FaTag,
} from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth.js';
import { useAccounts } from '../hooks/useAccounts.js';
import { useTransactions } from '../hooks/useTransactions.js';
import { useBudgets } from '../hooks/useBudgets.js';
import { useAnalytics } from '../hooks/useAnalytics.js';
import SummaryCard from '../components/dashboard/SummaryCard.jsx';
import BudgetProgressBar from '../components/budgets/BudgetProgressBar.jsx';
import TransactionModal from '../components/transactions/TransactionModal.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';

/**
 * DashboardPage Component
 *
 * Central financial overview command center combining real-time metrics,
 * monthly budget consumption, income vs expense breakdowns, and recent transactions.
 *
 * Key Features:
 * 1. Top Summary Grid: Displays Total Balance, Monthly Income, Monthly Expenses, and Net Savings.
 * 2. Budget Health Progress Card: Powered by `BudgetProgressBar` with dynamic threshold warnings.
 * 3. Income vs Expense Ratio Overview: Visual breakdown of cashflow ratio and savings rate.
 * 4. Recent Transactions Feed: Displays the 5 most recent transactions with account and category badges.
 * 5. Quick Add Modal CTA: 1-click access to open `TransactionModal` for fast transaction logging.
 *
 * Architectural Constraints:
 * - NO Redux, NO Context API — pure React custom hooks (`useAuth`, `useAccounts`, `useTransactions`, `useBudgets`, `useAnalytics`).
 * - Uses `react-icons` exclusively.
 * - Beginner-friendly inline documentation.
 */
const DashboardPage = () => {
  // ---------------------------------------------------------------------------
  // 1. DATA HOOKS INTEGRATION
  // ---------------------------------------------------------------------------
  const { user } = useAuth();
  const currency = user?.currency || 'USD';

  // Account balances (Cash, Savings, Bank Accounts)
  const { totalBalance, loading: accountsLoading } = useAccounts();

  // Paginated recent transactions (fetching recent 5 items)
  const { transactions, loading: txLoading, fetchTransactions } = useTransactions({ limit: 5 });

  // Monthly budget status and spending progress
  const {
    budget,
    totalExpense: budgetSpent,
    remaining: budgetRemaining,
    percentageUsed: budgetPercentage,
    warnings: budgetWarnings,
    loading: budgetLoading,
  } = useBudgets();

  // High-level analytics metrics
  const { overview, loading: analyticsLoading } = useAnalytics('Month');

  // ---------------------------------------------------------------------------
  // 2. MODAL STATE MANAGEMENT
  // ---------------------------------------------------------------------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState(null);

  // Open modal in "Add" mode
  const handleOpenAddModal = () => {
    setSelectedTxForEdit(null);
    setIsModalOpen(true);
  };

  // Open modal in "Edit" mode
  const handleOpenEditModal = (tx) => {
    setSelectedTxForEdit(tx);
    setIsModalOpen(true);
  };

  // Close modal and clear selection
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTxForEdit(null);
  };

  // ---------------------------------------------------------------------------
  // 3. DERIVED METRICS CALCULATIONS
  // ---------------------------------------------------------------------------
  const incomeValue = overview?.monthlyIncome ?? overview?.totalIncome ?? 0;
  const expenseValue = overview?.monthlyExpense ?? overview?.totalExpense ?? budgetSpent ?? 0;
  const savingsValue = overview?.monthlyNetSavings ?? overview?.netSavings ?? (incomeValue - expenseValue);

  // Compute savings rate percentage
  const savingsRate =
    incomeValue > 0 ? Math.max(0, Math.round((savingsValue / incomeValue) * 100)) : 0;

  // Calculate budget values
  const budgetLimit = budget?.overallAmount ?? overview?.budget?.limit ?? 0;
  const firstWarning = budgetWarnings && budgetWarnings.length > 0 ? budgetWarnings[0] : null;
  const activeBudgetWarning =
    typeof firstWarning === 'string'
      ? firstWarning
      : firstWarning?.warning || firstWarning?.message || undefined;

  return (
    <div data-testid="dashboard-page" className="space-y-6 sm:space-y-8">
      {/* --------------------------------------------------------------------- */}
      {/* 1. HEADER SECTION                                                     */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Welcome back, {user?.name || 'User'}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Here is your financial pulse and monthly spending summary.
          </p>
        </div>

        {/* Quick Add CTA Button */}
        <div>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-emerald-500/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-95"
          >
            <FaPlus className="w-3.5 h-3.5" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. TOP SUMMARY GRID (4 CARDS)                                         */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Balance */}
        <SummaryCard
          title="Total Balance"
          value={totalBalance}
          currency={currency}
          icon={FaWallet}
          theme="emerald"
          subtitle="Aggregate across all accounts"
        />

        {/* Monthly Income */}
        <SummaryCard
          title="Monthly Income"
          value={incomeValue}
          currency={currency}
          icon={FaArrowUp}
          theme="emerald"
          badge="This Month"
          subtitle="Earnings & deposits"
        />

        {/* Monthly Expenses */}
        <SummaryCard
          title="Monthly Expenses"
          value={expenseValue}
          currency={currency}
          icon={FaArrowDown}
          theme="rose"
          badge="This Month"
          subtitle="Outflows & purchases"
        />

        {/* Net Savings */}
        <SummaryCard
          title="Net Savings"
          value={savingsValue}
          currency={currency}
          icon={FaPiggyBank}
          theme="blue"
          badge={`${savingsRate}% Rate`}
          subtitle="Surplus retained this month"
        />
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 3. MIDDLE SECTION: BUDGET PROGRESS & CASHFLOW OVERVIEW                */}
      {/* --------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Budget Progress Card */}
        <div className="lg:col-span-2">
          <BudgetProgressBar
            spent={expenseValue}
            limit={budgetLimit}
            remaining={budgetRemaining}
            percentage={budgetPercentage}
            currency={currency}
            warning={activeBudgetWarning}
          />
        </div>

        {/* Right 1 Col: Income vs Expense Cashflow Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FaChartPie className="w-4 h-4 text-emerald-600" /> Cashflow Balance
              </h4>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                This Month
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Comparison between total income and expenses
            </p>

            {/* Income & Expense Bars */}
            <div className="mt-4 space-y-3">
              {/* Income Line */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Income
                  </span>
                  <span>{formatCurrency(incomeValue, currency)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: incomeValue > 0 ? '100%' : '0%',
                    }}
                  />
                </div>
              </div>

              {/* Expense Line */}
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span className="flex items-center gap-1.5 text-rose-700">
                    <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Expenses
                  </span>
                  <span>{formatCurrency(expenseValue, currency)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        incomeValue > 0
                          ? Math.min(100, (expenseValue / incomeValue) * 100)
                          : expenseValue > 0
                          ? 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Net Surplus Footer */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Net Monthly Position</span>
            <span
              className={`font-bold ${
                savingsValue >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {savingsValue >= 0 ? '+' : ''}
              {formatCurrency(savingsValue, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 4. RECENT TRANSACTIONS FEED                                           */}
      {/* --------------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FaHistory className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Recent Transactions</h3>
              <p className="text-xs text-slate-500">Your latest logged financial activity</p>
            </div>
          </div>

          <Link
            to="/transactions"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
          >
            View all &rarr;
          </Link>
        </div>

        {/* Transactions Content */}
        {transactions && transactions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {transactions.slice(0, 5).map((tx) => {
              const isIncome = tx.type === 'Income';
              const categoryName = tx.categoryId?.name || tx.category || 'Uncategorized';
              const accountName = tx.accountId?.name || tx.account || 'Account';
              const dateString = formatDate(tx.date);

              return (
                <div
                  key={tx._id}
                  onClick={() => handleOpenEditModal(tx)}
                  className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
                >
                  {/* Left: Icon, Note/Category, Date, Account */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${
                        isIncome
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {isIncome ? (
                        <FaArrowUp className="w-3.5 h-3.5" />
                      ) : (
                        <FaArrowDown className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">
                        {tx.note || categoryName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                        <span className="font-medium text-slate-600">{categoryName}</span>
                        <span>&bull;</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[11px]">
                          {accountName}
                        </span>
                        <span>&bull;</span>
                        <span>{dateString}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Colored Monetary Amount */}
                  <div className="text-right flex-shrink-0 ml-4">
                    <span
                      className={`text-sm font-bold ${
                        isIncome ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(tx.amount, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Friendly Empty State Prompt */
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <FaReceipt className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">No transactions logged yet</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Start tracking your expenses and income to see live analytics and budget charts.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl transition-colors"
              >
                <FaPlus className="w-3 h-3" />
                Add your first transaction
              </button>
            </div>
          </div>
        )}
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 5. QUICK ADD / EDIT TRANSACTION MODAL                                 */}
      {/* --------------------------------------------------------------------- */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        transactionToEdit={selectedTxForEdit}
        onSuccess={() => {
          if (fetchTransactions) fetchTransactions();
        }}
      />
    </div>
  );
};

export default DashboardPage;
