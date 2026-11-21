import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage.jsx';
import * as authHook from '../hooks/useAuth.js';
import * as accountsHook from '../hooks/useAccounts.js';
import * as transactionsHook from '../hooks/useTransactions.js';
import * as budgetsHook from '../hooks/useBudgets.js';
import * as analyticsHook from '../hooks/useAnalytics.js';
import * as categoriesHook from '../hooks/useCategories.js';
import * as recurringHook from '../hooks/useRecurring.js';

describe('DashboardPage Component', () => {
  const mockUser = {
    id: 'user1',
    name: 'Alex Johnson',
    email: 'alex@example.com',
    currency: 'USD',
  };

  const mockAccounts = [
    { _id: 'acc1', name: 'Main Wallet', type: 'Cash', balance: 1450.5 },
    { _id: 'acc2', name: 'Emergency Fund', type: 'Savings', balance: 5000 },
  ];

  const mockTransactions = [
    {
      _id: 'tx1',
      type: 'Expense',
      amount: 45.2,
      categoryId: { _id: 'cat1', name: 'Dining' },
      accountId: { _id: 'acc1', name: 'Main Wallet' },
      date: '2026-11-20T10:00:00.000Z',
      note: 'Sushi dinner',
    },
    {
      _id: 'tx2',
      type: 'Income',
      amount: 2500,
      categoryId: { _id: 'cat2', name: 'Salary' },
      accountId: { _id: 'acc1', name: 'Main Wallet' },
      date: '2026-11-19T09:00:00.000Z',
      note: 'Bi-weekly paycheck',
    },
  ];

  const mockOverview = {
    totalIncome: 5000,
    totalExpense: 2100,
    netSavings: 2900,
    monthlyIncome: 2500,
    monthlyExpense: 850,
    monthlyNetSavings: 1650,
  };

  const mockBudget = {
    overallAmount: 2000,
  };

  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: mockUser,
      logout: vi.fn(),
    });

    vi.spyOn(accountsHook, 'useAccounts').mockReturnValue({
      accounts: mockAccounts,
      totalBalance: 6450.5,
      loading: false,
    });

    vi.spyOn(transactionsHook, 'useTransactions').mockReturnValue({
      transactions: mockTransactions,
      totalCount: 2,
      loading: false,
      addTransaction: vi.fn().mockResolvedValue({ success: true }),
      editTransaction: vi.fn().mockResolvedValue({ success: true }),
      fetchTransactions: vi.fn(),
    });

    vi.spyOn(budgetsHook, 'useBudgets').mockReturnValue({
      budget: mockBudget,
      totalExpense: 850,
      remaining: 1150,
      percentageUsed: 42.5,
      warnings: [],
      loading: false,
    });

    vi.spyOn(analyticsHook, 'useAnalytics').mockReturnValue({
      overview: mockOverview,
      loading: false,
    });

    vi.spyOn(categoriesHook, 'useCategories').mockReturnValue({
      categories: [
        { _id: 'cat1', name: 'Dining', type: 'Expense' },
        { _id: 'cat2', name: 'Salary', type: 'Income' },
      ],
      expenseCategories: [{ _id: 'cat1', name: 'Dining', type: 'Expense' }],
      incomeCategories: [{ _id: 'cat2', name: 'Salary', type: 'Income' }],
      loading: false,
    });

    vi.spyOn(recurringHook, 'useRecurring').mockReturnValue({
      addRecurring: vi.fn(),
      loading: false,
    });
  });

  const renderDashboard = () => {
    return render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
  };

  it('renders greeting with user name and page header', () => {
    renderDashboard();

    expect(screen.getByText(/Alex Johnson/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument();
  });

  it('renders summary cards with correct monetary values', () => {
    renderDashboard();

    // Total Balance
    expect(screen.getByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText('$6,450.50')).toBeInTheDocument();

    // Total Income
    expect(screen.getByText('Monthly Income')).toBeInTheDocument();
    expect(screen.getAllByText('$2,500.00').length).toBeGreaterThanOrEqual(1);

    // Total Expenses
    expect(screen.getByText('Monthly Expenses')).toBeInTheDocument();
    expect(screen.getAllByText('$850.00').length).toBeGreaterThanOrEqual(1);

    // Net Savings
    expect(screen.getByText('Net Savings')).toBeInTheDocument();
    expect(screen.getByText('$1,650.00')).toBeInTheDocument();
  });

  it('renders budget progress bar section', () => {
    renderDashboard();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getAllByText('$850.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/of \$2,000.00/i)).toBeInTheDocument();
  });

  it('renders recent transactions list with items, notes, categories, and amounts', () => {
    renderDashboard();

    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    expect(screen.getByText('Sushi dinner')).toBeInTheDocument();
    expect(screen.getByText('Bi-weekly paycheck')).toBeInTheDocument();
    expect(screen.getByText('Dining')).toBeInTheDocument();
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('-$45.20')).toBeInTheDocument();
    expect(screen.getByText('+$2,500.00')).toBeInTheDocument();
  });

  it('renders link to view all transactions', () => {
    renderDashboard();

    const viewAllLink = screen.getByRole('link', { name: /view all/i });
    expect(viewAllLink).toBeInTheDocument();
    expect(viewAllLink).toHaveAttribute('href', '/transactions');
  });

  it('displays empty state when there are no transactions', () => {
    vi.spyOn(transactionsHook, 'useTransactions').mockReturnValue({
      transactions: [],
      totalCount: 0,
      loading: false,
      addTransaction: vi.fn(),
      fetchTransactions: vi.fn(),
    });

    renderDashboard();

    expect(screen.getByText(/no transactions logged yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add your first transaction/i })).toBeInTheDocument();
  });

  it('opens TransactionModal when Add Transaction button is clicked', async () => {
    renderDashboard();

    expect(screen.queryByTestId('transaction-modal')).not.toBeInTheDocument();

    const addBtn = screen.getByRole('button', { name: /add transaction/i });
    fireEvent.click(addBtn);

    expect(screen.getByTestId('transaction-modal')).toBeInTheDocument();

    // Close modal
    const closeBtn = screen.getByLabelText(/close modal/i);
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('transaction-modal')).not.toBeInTheDocument();
    });
  });
});
