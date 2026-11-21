/**
 * TransactionModal.test.jsx
 *
 * Test suite for the TransactionModal component.
 *
 * Testing Strategy & Standards:
 * 1. Testing Framework: Vitest + React Testing Library (@testing-library/react).
 * 2. Scope of Testing:
 *    - Renders all form fields: Type selector toggle (Expense vs Income), Amount input,
 *      Category dropdown, Account/Wallet dropdown, Date picker, Note textarea, and Recurring checkbox.
 *    - Validates amount field: prevents submission when amount is empty, zero, or negative.
 *    - Dynamic category filtering: verifies category options change dynamically when toggling
 *      between Expense and Income transaction types.
 *    - Valid transaction submission: invokes addTransaction with complete payload and triggers
 *      onSuccess and onClose callbacks.
 *    - Supports Edit mode: pre-populates existing transaction details when initialData is passed,
 *      updates transaction via editTransaction on submission, and calls onSuccess.
 *    - Supports Recurring transaction creation: triggers addRecurring rule when recurring is enabled.
 *    - Visibility control: renders nothing when isOpen is false.
 * 3. Architecture Compliance:
 *    - Custom hooks (useTransactions, useCategories, useAccounts, useRecurring) are mocked directly.
 *    - Pure component testing with no Redux/Context dependencies.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionModal from '../src/components/transactions/TransactionModal.jsx';
import * as transactionsHook from '../src/hooks/useTransactions.js';
import * as categoriesHook from '../src/hooks/useCategories.js';
import * as accountsHook from '../src/hooks/useAccounts.js';
import * as recurringHook from '../src/hooks/useRecurring.js';

describe('TransactionModal Component', () => {
  // Callback spied functions
  const mockClose = vi.fn();
  const mockSuccess = vi.fn();

  // Hook action mocks
  const mockAddTransaction = vi.fn();
  const mockEditTransaction = vi.fn();
  const mockAddRecurring = vi.fn();

  // Mock fixtures for Categories
  const mockCategories = [
    { _id: 'cat-exp-1', name: 'Food & Dining', type: 'Expense' },
    { _id: 'cat-exp-2', name: 'Transportation', type: 'Expense' },
    { _id: 'cat-inc-1', name: 'Salary', type: 'Income' },
    { _id: 'cat-inc-2', name: 'Freelance Consulting', type: 'Income' },
  ];
  const mockExpenseCategories = mockCategories.filter((c) => c.type === 'Expense');
  const mockIncomeCategories = mockCategories.filter((c) => c.type === 'Income');

  // Mock fixtures for Accounts
  const mockAccounts = [
    { _id: 'acc-1', name: 'Cash Wallet', type: 'Cash', balance: 750 },
    { _id: 'acc-2', name: 'Checking Account', type: 'Bank Account', balance: 4500 },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    mockClose.mockReset();
    mockSuccess.mockReset();

    // Default mock resolutions
    mockAddTransaction.mockReset();
    mockAddTransaction.mockResolvedValue({
      success: true,
      transaction: { _id: 'new-tx-id', amount: 55.0, type: 'Expense' },
    });

    mockEditTransaction.mockReset();
    mockEditTransaction.mockResolvedValue({
      success: true,
      transaction: { _id: 'existing-tx-id', amount: 99.0, type: 'Expense' },
    });

    mockAddRecurring.mockReset();
    mockAddRecurring.mockResolvedValue({
      success: true,
      rule: { _id: 'new-rule-id' },
    });

    // Mock hook return values
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

  // ---------------------------------------------------------------------------
  // 1. VISIBILITY & RENDERING TESTS
  // ---------------------------------------------------------------------------
  it('renders nothing when isOpen is false', () => {
    render(
      <TransactionModal
        isOpen={false}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );

    // Verify modal overlay is absent from DOM
    expect(screen.queryByTestId('transaction-modal')).not.toBeInTheDocument();
  });

  it('renders all fields: Type toggle, Amount, Category, Account, Date, Note, and Recurring toggle', () => {
    render(
      <TransactionModal
        isOpen={true}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );

    // Verify modal container exists
    expect(screen.getByTestId('transaction-modal')).toBeInTheDocument();

    // Verify title header defaults to Add mode
    expect(
      screen.getByRole('heading', { name: /add transaction/i })
    ).toBeInTheDocument();

    // 1. Type toggle buttons (Expense & Income)
    expect(screen.getByRole('button', { name: /^expense$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^income$/i })).toBeInTheDocument();

    // 2. Amount input
    const amountInput = screen.getByLabelText(/amount/i);
    expect(amountInput).toBeInTheDocument();
    expect(amountInput).toHaveAttribute('type', 'number');

    // 3. Category dropdown
    const categorySelect = screen.getByLabelText(/category/i);
    expect(categorySelect).toBeInTheDocument();

    // 4. Account/Wallet dropdown
    const accountSelect = screen.getByLabelText(/account \/ wallet/i);
    expect(accountSelect).toBeInTheDocument();

    // 5. Date input
    const dateInput = screen.getByLabelText(/date/i);
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toHaveAttribute('type', 'date');

    // 6. Note textarea
    const noteInput = screen.getByLabelText(/note \/ description/i);
    expect(noteInput).toBeInTheDocument();

    // 7. Recurring toggle checkbox
    const recurringCheckbox = screen.getByLabelText(/recurring transaction\?/i);
    expect(recurringCheckbox).toBeInTheDocument();
    expect(recurringCheckbox).toHaveAttribute('type', 'checkbox');
    expect(recurringCheckbox).not.toBeChecked();

    // Action buttons
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /save transaction/i })
    ).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 2. AMOUNT VALIDATION TESTS
  // ---------------------------------------------------------------------------
  it('enforces amount validation: prevents submission and shows error when amount is empty', async () => {
    render(
      <TransactionModal
        isOpen={true}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );

    // Leave amount empty and trigger form submission via save button click
    const saveButton = screen.getByRole('button', { name: /save transaction/i });
    fireEvent.click(saveButton);

    // Validation error text must be displayed
    expect(
      await screen.findByText(/amount must be greater than 0/i)
    ).toBeInTheDocument();

    // addTransaction must NOT be dispatched
    expect(mockAddTransaction).not.toHaveBeenCalled();
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it('enforces amount validation: prevents submission when amount is non-positive or zero', async () => {
    render(
      <TransactionModal
        isOpen={true}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );

    const amountInput = screen.getByLabelText(/amount/i);
    const form = amountInput.closest('form');

    // Test with 0
    fireEvent.change(amountInput, { target: { value: '0' } });
    fireEvent.submit(form);

    expect(
      await screen.findByText(/amount must be greater than 0/i)
    ).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();

    // Test with negative value
    fireEvent.change(amountInput, { target: { value: '-25.50' } });
    fireEvent.submit(form);

    expect(
      await screen.findByText(/amount must be greater than 0/i)
    ).toBeInTheDocument();
    expect(mockAddTransaction).not.toHaveBeenCalled();
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 3. CATEGORY TOGGLE (EXPENSE <-> INCOME)
  // ---------------------------------------------------------------------------
  it('toggles between Expense and Income categories dynamically', () => {
    render(
      <TransactionModal
        isOpen={true}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );

    // By default, Expense type is selected: should display Expense categories
    expect(
      screen.getByRole('option', { name: 'Food & Dining' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Transportation' })
    ).toBeInTheDocument();
    // Income options should not appear under Expense type
    expect(
      screen.queryByRole('option', { name: 'Salary' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Freelance Consulting' })
    ).not.toBeInTheDocument();

    // Switch type to "Income"
    const incomeBtn = screen.getByRole('button', { name: /^income$/i });
    fireEvent.click(incomeBtn);

    // Should now display Income categories
    expect(screen.getByRole('option', { name: 'Salary' })).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Freelance Consulting' })
    ).toBeInTheDocument();
    // Expense options should now be gone
    expect(
      screen.queryByRole('option', { name: 'Food & Dining' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Transportation' })
    ).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 4. SUBMIT VALID TRANSACTION DATA
  // ---------------------------------------------------------------------------
  it('submits valid transaction data and triggers onSuccess and onClose callbacks', async () => {
    const savedTx = {
      _id: 'new-tx-id',
      amount: 42.75,
      type: 'Expense',
      categoryId: 'cat-exp-1',
      accountId: 'acc-1',
    };
    mockAddTransaction.mockResolvedValue({ success: true, transaction: savedTx });

    render(
      <TransactionModal
        isOpen={true}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );

    // Enter valid amount
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: '42.75' },
    });

    // Enter note
    fireEvent.change(screen.getByLabelText(/note \/ description/i), {
      target: { value: 'Lunch with colleagues' },
    });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save transaction/i });
    fireEvent.click(saveButton);

    // Verify addTransaction hook is invoked with complete payload
    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalledTimes(1);
      expect(mockAddTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 42.75,
          type: 'Expense',
          categoryId: 'cat-exp-1',
          accountId: 'acc-1',
          note: 'Lunch with colleagues',
          isRecurring: false,
        })
      );
    });

    // Verify callbacks are triggered
    expect(mockSuccess).toHaveBeenCalledWith(savedTx);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 5. EDIT MODE WITH initialData
  // ---------------------------------------------------------------------------
  it('supports Edit mode when initialData is provided and updates transaction', async () => {
    const existingTransaction = {
      _id: 'tx-edit-99',
      type: 'Expense',
      amount: 120.0,
      categoryId: { _id: 'cat-exp-2', name: 'Transportation' },
      accountId: { _id: 'acc-2', name: 'Checking Account' },
      date: '2026-11-15T00:00:00.000Z',
      note: 'Train ticket',
      isRecurring: false,
    };

    const updatedTx = {
      ...existingTransaction,
      amount: 145.0,
      note: 'Train ticket plus return',
    };
    mockEditTransaction.mockResolvedValue({ success: true, transaction: updatedTx });

    render(
      <TransactionModal
        isOpen={true}
        initialData={existingTransaction}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );

    // Header should indicate Edit mode
    expect(
      screen.getByRole('heading', { name: /edit transaction/i })
    ).toBeInTheDocument();

    // Submit button reflects update action
    const updateButton = screen.getByRole('button', {
      name: /update transaction/i,
    });
    expect(updateButton).toBeInTheDocument();

    // Verify pre-populated values
    const amountInput = screen.getByLabelText(/amount/i);
    expect(amountInput.value).toBe('120');

    const noteInput = screen.getByLabelText(/note \/ description/i);
    expect(noteInput.value).toBe('Train ticket');

    // Modify amount and note
    fireEvent.change(amountInput, { target: { value: '145.00' } });
    fireEvent.change(noteInput, { target: { value: 'Train ticket plus return' } });

    // Submit update
    fireEvent.click(updateButton);

    // Verify editTransaction was invoked with transaction ID and updated data
    await waitFor(() => {
      expect(mockEditTransaction).toHaveBeenCalledTimes(1);
      expect(mockEditTransaction).toHaveBeenCalledWith(
        'tx-edit-99',
        expect.objectContaining({
          amount: 145.0,
          type: 'Expense',
          categoryId: 'cat-exp-2',
          accountId: 'acc-2',
          note: 'Train ticket plus return',
          isRecurring: false,
        })
      );
    });

    // Verify callbacks are triggered
    expect(mockSuccess).toHaveBeenCalledWith(updatedTx);
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 6. RECURRING TOGGLE & SCHEDULE CREATION
  // ---------------------------------------------------------------------------
  it('reveals frequency selector when recurring checkbox is checked and registers recurring schedule', async () => {
    mockAddTransaction.mockResolvedValue({
      success: true,
      transaction: { _id: 'tx-rec-1' },
    });

    render(
      <TransactionModal
        isOpen={true}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );

    // Check recurring checkbox
    const recurringCheckbox = screen.getByLabelText(/recurring transaction\?/i);
    fireEvent.click(recurringCheckbox);
    expect(recurringCheckbox).toBeChecked();

    // Frequency dropdown should now be rendered
    const frequencySelect = screen.getByLabelText(/frequency/i);
    expect(frequencySelect).toBeInTheDocument();

    // Change frequency to Weekly
    fireEvent.change(frequencySelect, { target: { value: 'Weekly' } });

    // Enter amount
    fireEvent.change(screen.getByLabelText(/amount/i), {
      target: { value: '80.00' },
    });
    fireEvent.change(screen.getByLabelText(/note \/ description/i), {
      target: { value: 'Weekly grocery subscription' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /save transaction/i }));

    // Both addTransaction and addRecurring must be called
    await waitFor(() => {
      expect(mockAddTransaction).toHaveBeenCalled();
      expect(mockAddRecurring).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 80,
          frequency: 'Weekly',
          type: 'Expense',
        })
      );
    });

    expect(mockSuccess).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 7. MODAL DISMISSAL (CLOSE BUTTON & CANCEL BUTTON)
  // ---------------------------------------------------------------------------
  it('triggers onClose when Close icon button or Cancel button is clicked', () => {
    render(
      <TransactionModal
        isOpen={true}
        onClose={mockClose}
        onSuccess={mockSuccess}
      />
    );

    // Click top close icon button
    const closeIconButton = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeIconButton);
    expect(mockClose).toHaveBeenCalledTimes(1);

    // Click bottom Cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    expect(mockClose).toHaveBeenCalledTimes(2);
  });
});
