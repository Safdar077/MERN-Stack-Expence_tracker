import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionTable from './TransactionTable.jsx';

describe('TransactionTable Component', () => {
  const mockPageChange = vi.fn();
  const mockLimitChange = vi.fn();
  const mockEdit = vi.fn();
  const mockDelete = vi.fn();
  const mockResetFilters = vi.fn();

  const sampleTransactions = [
    {
      _id: 'tx1',
      type: 'Expense',
      amount: 45.5,
      date: '2026-11-20T10:00:00.000Z',
      note: 'Grocery store snacks',
      categoryId: { _id: 'cat1', name: 'Food', icon: 'FaUtensils' },
      accountId: { _id: 'acc1', name: 'Cash Wallet' },
    },
    {
      _id: 'tx2',
      type: 'Income',
      amount: 2500,
      date: '2026-11-19T08:00:00.000Z',
      note: 'Freelance web development payment',
      categoryId: { _id: 'cat2', name: 'Freelance', icon: 'FaLaptopCode' },
      accountId: { _id: 'acc2', name: 'Main Savings' },
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    mockPageChange.mockClear();
    mockLimitChange.mockClear();
    mockEdit.mockClear();
    mockDelete.mockClear();
    mockResetFilters.mockClear();
  });

  it('renders transactions with category, note, date, account, type, and formatted amounts', () => {
    render(
      <TransactionTable
        transactions={sampleTransactions}
        loading={false}
        totalCount={2}
        page={1}
        totalPages={1}
        limit={10}
        currency="USD"
        onPageChange={mockPageChange}
        onLimitChange={mockLimitChange}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onResetFilters={mockResetFilters}
      />
    );

    // Categories
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Grocery store snacks')).toBeInTheDocument();
    expect(screen.getByText('Freelance')).toBeInTheDocument();
    expect(screen.getByText('Freelance web development payment')).toBeInTheDocument();

    // Accounts
    expect(screen.getByText('Cash Wallet')).toBeInTheDocument();
    expect(screen.getByText('Main Savings')).toBeInTheDocument();

    // Formatted amounts with signs
    expect(screen.getByText('-$45.50')).toBeInTheDocument();
    expect(screen.getByText('+$2,500.00')).toBeInTheDocument();
  });

  it('triggers onEdit callback with transaction object when Edit button is clicked', () => {
    render(
      <TransactionTable
        transactions={sampleTransactions}
        loading={false}
        totalCount={2}
        page={1}
        totalPages={1}
        limit={10}
        currency="USD"
        onPageChange={mockPageChange}
        onLimitChange={mockLimitChange}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onResetFilters={mockResetFilters}
      />
    );

    const editButtons = screen.getAllByRole('button', { name: /edit transaction/i });
    fireEvent.click(editButtons[0]);

    expect(mockEdit).toHaveBeenCalledTimes(1);
    expect(mockEdit).toHaveBeenCalledWith(sampleTransactions[0]);
  });

  it('triggers onDelete callback with transaction object when Delete button is clicked', () => {
    render(
      <TransactionTable
        transactions={sampleTransactions}
        loading={false}
        totalCount={2}
        page={1}
        totalPages={1}
        limit={10}
        currency="USD"
        onPageChange={mockPageChange}
        onLimitChange={mockLimitChange}
        onEdit={mockEdit}
        onDelete={mockDelete}
        onResetFilters={mockResetFilters}
      />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete transaction/i });
    fireEvent.click(deleteButtons[1]);

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith(sampleTransactions[1]);
  });

  it('displays loading indicator overlay when loading is true', () => {
    render(
      <TransactionTable
        transactions={sampleTransactions}
        loading={true}
        totalCount={2}
        page={1}
        totalPages={1}
        limit={10}
        onPageChange={mockPageChange}
        onLimitChange={mockLimitChange}
      />
    );

    expect(screen.getByTestId('table-loading')).toBeInTheDocument();
    expect(screen.getByText(/loading transactions\.\.\./i)).toBeInTheDocument();
  });

  it('displays empty state banner when no transactions are returned', () => {
    render(
      <TransactionTable
        transactions={[]}
        loading={false}
        totalCount={0}
        page={1}
        totalPages={1}
        limit={10}
        onPageChange={mockPageChange}
        onLimitChange={mockLimitChange}
        onResetFilters={mockResetFilters}
      />
    );

    expect(screen.getByTestId('empty-transactions')).toBeInTheDocument();
    expect(screen.getByText(/no transactions found/i)).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /reset filters/i });
    fireEvent.click(resetBtn);
    expect(mockResetFilters).toHaveBeenCalledTimes(1);
  });

  it('handles pagination navigation and rows-per-page selection', () => {
    render(
      <TransactionTable
        transactions={sampleTransactions}
        loading={false}
        totalCount={35}
        page={2}
        totalPages={4}
        limit={10}
        onPageChange={mockPageChange}
        onLimitChange={mockLimitChange}
      />
    );

    // Indicator
    expect(screen.getByText(/page 2 of 4/i)).toBeInTheDocument();

    // Click Previous
    const prevBtn = screen.getByRole('button', { name: /previous page/i });
    expect(prevBtn).not.toBeDisabled();
    fireEvent.click(prevBtn);
    expect(mockPageChange).toHaveBeenCalledWith(1);

    // Click Next
    const nextBtn = screen.getByRole('button', { name: /next page/i });
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);
    expect(mockPageChange).toHaveBeenCalledWith(3);

    // Change Limit Selector
    const limitSelect = screen.getByLabelText(/rows per page/i);
    fireEvent.change(limitSelect, { target: { value: '20' } });
    expect(mockLimitChange).toHaveBeenCalledWith(20);
  });

  it('disables previous button on first page and next button on last page', () => {
    const { rerender } = render(
      <TransactionTable
        transactions={sampleTransactions}
        loading={false}
        totalCount={10}
        page={1}
        totalPages={1}
        limit={10}
        onPageChange={mockPageChange}
        onLimitChange={mockLimitChange}
      />
    );

    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();

    // Rerender on last page of multi-page
    rerender(
      <TransactionTable
        transactions={sampleTransactions}
        loading={false}
        totalCount={30}
        page={3}
        totalPages={3}
        limit={10}
        onPageChange={mockPageChange}
        onLimitChange={mockLimitChange}
      />
    );

    expect(screen.getByRole('button', { name: /previous page/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });
});
