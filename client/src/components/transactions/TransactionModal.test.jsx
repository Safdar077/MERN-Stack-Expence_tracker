import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionModal from './TransactionModal.jsx';
import * as transactionsHook from '../../hooks/useTransactions.js';
import * as categoriesHook from '../../hooks/useCategories.js';
import * as accountsHook from '../../hooks/useAccounts.js';
import * as recurringHook from '../../hooks/useRecurring.js';

describe('TransactionModal Component', () => {
  const mockClose = vi.fn();
  const mockSuccess = vi.fn();
  const mockAddTransaction = vi.fn().mockResolvedValue({ success: true, transaction: { _id: 'tx1' } });
  const mockEditTransaction = vi.fn().mockResolvedValue({ success: true, transaction: { _id: 'tx1' } });
  const mockAddRecurring = vi.fn().mockResolvedValue({ success: true, rule: { _id: 'rec1' } });

  const mockCategories = [
    { _id: 'cat1', name: 'Food & Dining', type: 'Expense' },
    { _id: 'cat2', name: 'Transportation', type: 'Expense' },
    { _id: 'cat3', name: 'Salary', type: 'Income' },
    { _id: 'cat4', name: 'Freelance', type: 'Income' },
  ];

  const mockExpenseCategories = mockCategories.filter((c) => c.type === 'Expense');
  const mockIncomeCategories = mockCategories.filter((c) => c.type === 'Income');

  const mockAccounts = [
    { _id: 'acc1', name: 'Cash Wallet', type: 'Cash', balance: 500 },
    { _id: 'acc2', name: 'Main Savings', type: 'Savings', balance: 10000 },
    { _id: 'acc3', name: 'Checking Account', type: 'Bank Account', balance: 3200 },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    mockClose.mockClear();
    mockSuccess.mockClear();

    mockAddTransaction.mockReset();
    mockAddTransaction.mockResolvedValue({ success: true, transaction: { _id: 'tx1' } });

    mockEditTransaction.mockReset();
    mockEditTransaction.mockResolvedValue({ success: true, transaction: { _id: 'tx1' } });

    mockAddRecurring.mockReset();
    mockAddRecurring.mockResolvedValue({ success: true, rule: { _id: 'rec1' } });

    vi.spyOn(transactionsHook, 'useTransactions').mockReturnValue({
      addTransaction: mockAddTransaction,
      editTransaction: mockEditTransaction,
      loading: false,
      error: null,
    });

    vi.spyOn(categoriesHook, 'useCategories').mockReturnValue({
      categories: mockCategories,
      expenseCategories: mockExpenseCategories,
      incomeCategories: mockIncomeCategories,
      loading: false,
    });

    vi.spyOn(accountsHook, 'useAccounts').mockReturnValue({
      accounts: mockAccounts,
      loading: false,
    });

    vi.spyOn(recurringHook, 'useRecurring').mockReturnValue({
      addRecurring: mockAddRecurring,
      loading: false,
    });
  });

  it('renders nothing when isOpen is false', () => {
    render(<TransactionModal isOpen={false} onClose={mockClose} />);
    expect(screen.queryByTestId('transaction-modal')).not.toBeInTheDocument();
  });

  it('renders in Add mode with all form inputs and default Expense type', () => {
    render(<TransactionModal isOpen={true} onClose={mockClose} />);

    expect(screen.getByRole('heading', { name: /add transaction/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^expense$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^income$/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/category/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/account \/ wallet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/note/i)).toBeInTheDocument();
  });

  it('filters categories based on selected Type toggle (Expense vs Income)', () => {
    render(<TransactionModal isOpen={true} onClose={mockClose} />);

    // Default Expense type
    expect(screen.getByRole('option', { name: /food & dining/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /salary/i })).not.toBeInTheDocument();

    // Toggle to Income
    fireEvent.click(screen.getByRole('button', { name: /^income$/i }));

    expect(screen.getByRole('option', { name: /salary/i })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /food & dining/i })).not.toBeInTheDocument();
  });

  it('shows accounts in dropdown allowing user to choose Wallet vs Savings', () => {
    render(<TransactionModal isOpen={true} onClose={mockClose} />);

    expect(screen.getByRole('option', { name: /cash wallet/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /main savings/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /checking account/i })).toBeInTheDocument();
  });

  it('shows validation errors when submitting an empty form', async () => {
    render(<TransactionModal isOpen={true} onClose={mockClose} />);

    const submitBtn = screen.getByRole('button', { name: /save transaction/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/amount must be greater than 0/i)).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
  });

  it('submits valid new transaction and triggers callbacks', async () => {
    render(<TransactionModal isOpen={true} onClose={mockClose} onSuccess={mockSuccess} />);

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '45.50' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'cat1' } });
    fireEvent.change(screen.getByLabelText(/account \/ wallet/i), { target: { value: 'acc1' } });
    fireEvent.change(screen.getByLabelText(/note/i), { target: { value: 'Team lunch' } });

    const submitBtn = screen.getByRole('button', { name: /save transaction/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 45.5,
          type: 'Expense',
          categoryId: 'cat1',
          accountId: 'acc1',
          note: 'Team lunch',
        })
      );
    });

    expect(mockSuccess).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it('renders in Edit mode and updates transaction when initialData is provided', async () => {
    const editItem = {
      _id: 'tx99',
      amount: 120,
      type: 'Expense',
      categoryId: 'cat2',
      accountId: 'acc2',
      date: '2026-11-15',
      note: 'Train pass',
    };

    render(
      <TransactionModal
        isOpen={true}
        onClose={mockClose}
        initialData={editItem}
        onSuccess={mockSuccess}
      />
    );

    expect(screen.getByRole('heading', { name: /edit transaction/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toHaveValue(120);
    expect(screen.getByLabelText(/note/i)).toHaveValue('Train pass');

    // Change note and submit
    fireEvent.change(screen.getByLabelText(/note/i), { target: { value: 'Updated Train pass' } });
    fireEvent.click(screen.getByRole('button', { name: /update transaction/i }));

    await waitFor(() => {
      expect(mockEditTransaction).toHaveBeenCalledWith(
        'tx99',
        expect.objectContaining({
          note: 'Updated Train pass',
          amount: 120,
        })
      );
    });

    expect(mockSuccess).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it('reveals frequency selector when recurring checkbox is checked and calls addRecurring with advanced nextDueDate', async () => {
    render(<TransactionModal isOpen={true} onClose={mockClose} onSuccess={mockSuccess} />);

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText(/category/i), { target: { value: 'cat1' } });
    fireEvent.change(screen.getByLabelText(/account \/ wallet/i), { target: { value: 'acc1' } });
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2026-11-20' } });
    fireEvent.change(screen.getByLabelText(/note/i), { target: { value: 'Netflix Subscription' } });

    // Toggle recurring
    const recurringToggle = screen.getByLabelText(/recurring transaction/i);
    fireEvent.click(recurringToggle);

    expect(screen.getByLabelText(/frequency/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/frequency/i), { target: { value: 'Monthly' } });

    fireEvent.click(screen.getByRole('button', { name: /save transaction/i }));

    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          isRecurring: true,
          date: '2026-11-20',
        })
      );
      expect(mockAddRecurring).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Netflix Subscription',
          frequency: 'Monthly',
          amount: 15,
          startDate: '2026-11-20',
          nextDueDate: '2026-12-20',
        })
      );
    });
  });

  it('preserves entered form inputs when background accounts or categories hook re-renders', () => {
    const { rerender } = render(<TransactionModal isOpen={true} onClose={mockClose} />);

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: '99.99' } });
    fireEvent.change(screen.getByLabelText(/note/i), { target: { value: 'Important expense in progress' } });

    expect(screen.getByLabelText(/amount/i)).toHaveValue(99.99);
    expect(screen.getByLabelText(/note/i)).toHaveValue('Important expense in progress');

    // Simulate background accounts hook updating (e.g. fresh array from network or event bus)
    vi.spyOn(accountsHook, 'useAccounts').mockReturnValue({
      accounts: [
        ...mockAccounts,
        { _id: 'acc4', name: 'Emergency Fund', type: 'Savings', balance: 5000 },
      ],
      loading: false,
    });

    rerender(<TransactionModal isOpen={true} onClose={mockClose} />);

    // Assert inputs are NOT wiped
    expect(screen.getByLabelText(/amount/i)).toHaveValue(99.99);
    expect(screen.getByLabelText(/note/i)).toHaveValue('Important expense in progress');
  });

  it('closes on Close button, Cancel button, and Escape key', () => {
    const { rerender } = render(<TransactionModal isOpen={true} onClose={mockClose} />);

    // Close button
    fireEvent.click(screen.getByLabelText(/close modal/i));
    expect(mockClose).toHaveBeenCalledTimes(1);

    // Cancel button
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockClose).toHaveBeenCalledTimes(2);

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockClose).toHaveBeenCalledTimes(3);
  });
});
