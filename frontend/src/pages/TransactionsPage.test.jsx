import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TransactionsPage from './TransactionsPage.jsx';
import * as authHook from '../hooks/useAuth.js';
import * as accountsHook from '../hooks/useAccounts.js';
import * as categoriesHook from '../hooks/useCategories.js';
import * as transactionsHook from '../hooks/useTransactions.js';

describe('TransactionsPage Component', () => {
  const mockFetchTransactions = vi.fn();
  const mockAddTransaction = vi.fn().mockResolvedValue({ success: true });
  const mockEditTransaction = vi.fn().mockResolvedValue({ success: true });
  const mockDeleteTransaction = vi.fn().mockResolvedValue({ success: true });
  const mockExportCSV = vi.fn().mockResolvedValue({ success: true });

  const mockCategories = [
    { _id: 'cat1', name: 'Groceries', type: 'Expense', icon: 'FaShoppingBag' },
    { _id: 'cat2', name: 'Salary', type: 'Income', icon: 'FaMoneyBillWave' },
  ];

  const mockAccounts = [
    { _id: 'acc1', name: 'Cash Wallet', type: 'Cash', balance: 500 },
    { _id: 'acc2', name: 'Main Savings', type: 'Savings', balance: 10000 },
  ];

  const mockTransactions = [
    {
      _id: 'tx1',
      type: 'Expense',
      amount: 65,
      date: '2026-11-20T12:00:00.000Z',
      note: 'Weekly market groceries',
      categoryId: mockCategories[0],
      accountId: mockAccounts[0],
    },
    {
      _id: 'tx2',
      type: 'Income',
      amount: 3200,
      date: '2026-11-18T09:00:00.000Z',
      note: 'Monthly salary deposit',
      categoryId: mockCategories[1],
      accountId: mockAccounts[1],
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    mockFetchTransactions.mockClear();
    mockAddTransaction.mockClear();
    mockEditTransaction.mockClear();
    mockDeleteTransaction.mockClear();
    mockDeleteTransaction.mockResolvedValue({ success: true });
    mockExportCSV.mockClear();
    mockExportCSV.mockResolvedValue({ success: true });

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { id: 'u1', name: 'Alice', currency: 'USD' },
    });

    vi.spyOn(categoriesHook, 'useCategories').mockReturnValue({
      categories: mockCategories,
      expenseCategories: mockCategories.filter((c) => c.type === 'Expense'),
      incomeCategories: mockCategories.filter((c) => c.type === 'Income'),
      loading: false,
    });

    vi.spyOn(accountsHook, 'useAccounts').mockReturnValue({
      accounts: mockAccounts,
      loading: false,
    });

    vi.spyOn(transactionsHook, 'useTransactions').mockImplementation((filters = {}) => ({
      transactions: mockTransactions,
      totalCount: 2,
      page: filters.page || 1,
      totalPages: 1,
      loading: false,
      error: null,
      fetchTransactions: mockFetchTransactions,
      addTransaction: mockAddTransaction,
      editTransaction: mockEditTransaction,
      deleteTransaction: mockDeleteTransaction,
      exportCSV: mockExportCSV,
    }));
  });

  it('renders page header with record count and primary Add Transaction button', () => {
    render(<TransactionsPage />);

    expect(screen.getByRole('heading', { name: /^transactions$/i })).toBeInTheDocument();
    expect(screen.getByText(/2 total/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add transaction/i })).toBeInTheDocument();
  });

  it('renders FilterBar and TransactionTable components', () => {
    render(<TransactionsPage />);

    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-table')).toBeInTheDocument();
    expect(screen.getByText('Weekly market groceries')).toBeInTheDocument();
    expect(screen.getByText('Monthly salary deposit')).toBeInTheDocument();
  });

  it('opens TransactionModal in Add mode when Add Transaction CTA is clicked', () => {
    render(<TransactionsPage />);

    const addBtn = screen.getByRole('button', { name: /add transaction/i });
    fireEvent.click(addBtn);

    // Modal dialogue heading
    expect(screen.getByRole('heading', { name: /add transaction/i })).toBeInTheDocument();
  });

  it('opens TransactionModal in Edit mode when row edit button is clicked', () => {
    render(<TransactionsPage />);

    const editButtons = screen.getAllByRole('button', { name: /edit transaction/i });
    fireEvent.click(editButtons[0]);

    // Modal heading switches to Edit mode
    expect(screen.getByRole('heading', { name: /edit transaction/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Weekly market groceries')).toBeInTheDocument();
  });

  it('opens DeleteConfirmModal and deletes transaction upon user confirmation', async () => {
    render(<TransactionsPage />);

    const deleteButtons = screen.getAllByRole('button', { name: /delete transaction/i });
    fireEvent.click(deleteButtons[0]);

    // Delete modal appears
    expect(screen.getByRole('heading', { name: /delete transaction/i })).toBeInTheDocument();
    const deleteModal = screen.getByTestId('delete-confirm-modal');
    expect(within(deleteModal).getByText('Weekly market groceries')).toBeInTheDocument();

    // Confirm deletion
    const confirmDeleteBtn = within(deleteModal).getByRole('button', { name: /^delete transaction$/i });
    fireEvent.click(confirmDeleteBtn);

    await waitFor(() => {
      expect(mockDeleteTransaction).toHaveBeenCalledWith('tx1');
      expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
    });
  });

  it('triggers CSV export with active filter query parameters when Export CSV is clicked', async () => {
    render(<TransactionsPage />);

    const exportBtn = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(mockExportCSV).toHaveBeenCalledTimes(1);
    });
  });

  it('updates filter state and delegates query execution to useTransactions', () => {
    render(<TransactionsPage />);

    // Type in search filter
    const searchInput = screen.getByLabelText(/search transactions/i);
    fireEvent.change(searchInput, { target: { value: 'groceries' } });

    // Select type filter
    const typeSelect = screen.getByLabelText(/transaction type/i);
    fireEvent.change(typeSelect, { target: { value: 'Expense' } });

    // useTransactions is called with updated query params
    expect(transactionsHook.useTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'groceries',
        type: 'Expense',
        page: 1,
      })
    );
  });

  it('resets all filters when Reset Filters button is clicked', () => {
    render(<TransactionsPage />);

    // Set filter first
    const searchInput = screen.getByLabelText(/search transactions/i);
    fireEvent.change(searchInput, { target: { value: 'test-keyword' } });

    // Click Reset
    const resetBtn = screen.getByRole('button', { name: /reset filters/i });
    fireEvent.click(resetBtn);

    const pageCalls = transactionsHook.useTransactions.mock.calls.filter(
      (args) => args[0] && typeof args[0] === 'object' && 'limit' in args[0]
    );
    const lastPageCall = pageCalls.at(-1)[0];
    expect(lastPageCall.page).toBe(1);
    expect(lastPageCall.search).toBeUndefined();
  });

  it('clamps page index to totalPages when totalPages drops below current page', async () => {
    let mockTotalPages = 3;
    vi.spyOn(transactionsHook, 'useTransactions').mockImplementation((filters = {}) => ({
      transactions: mockTransactions,
      totalCount: 30,
      page: filters.page || 1,
      totalPages: mockTotalPages,
      loading: false,
      error: null,
      fetchTransactions: mockFetchTransactions,
      addTransaction: mockAddTransaction,
      editTransaction: mockEditTransaction,
      deleteTransaction: mockDeleteTransaction,
      exportCSV: mockExportCSV,
    }));

    const { rerender } = render(<TransactionsPage />);

    // Navigate to page 3
    const nextBtn = screen.getByRole('button', { name: /next page/i });
    fireEvent.click(nextBtn); // to page 2
    fireEvent.click(nextBtn); // to page 3

    // Simulate totalPages dropping to 2 (e.g. after deleting last item)
    mockTotalPages = 2;
    rerender(<TransactionsPage />);

    await waitFor(() => {
      const pageCalls = transactionsHook.useTransactions.mock.calls.filter(
        (args) => args[0] && typeof args[0] === 'object' && 'limit' in args[0]
      );
      const lastPageCall = pageCalls.at(-1)[0];
      expect(lastPageCall.page).toBe(2);
    });
  });

  it('clears incompatible categoryId when type filter is changed', () => {
    render(<TransactionsPage />);

    // Select category 'cat1' (Expense)
    const catSelect = screen.getByLabelText(/^category$/i);
    fireEvent.change(catSelect, { target: { value: 'cat1' } });

    // Switch type to 'Income'
    const typeSelect = screen.getByLabelText(/transaction type/i);
    fireEvent.change(typeSelect, { target: { value: 'Income' } });

    const pageCalls = transactionsHook.useTransactions.mock.calls.filter(
      (args) => args[0] && typeof args[0] === 'object' && 'limit' in args[0]
    );
    const lastPageCall = pageCalls.at(-1)[0];
    expect(lastPageCall.type).toBe('Income');
    expect(lastPageCall.categoryId).toBeUndefined();
  });
});
