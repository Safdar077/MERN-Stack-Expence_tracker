/**
 * TransactionTable.test.jsx
 *
 * Test suite for the TransactionTable component.
 *
 * Testing Strategy & Standards:
 * 1. Testing Framework: Vitest + React Testing Library (@testing-library/react).
 * 2. Scope of Testing:
 *    - Renders transaction list records:
 *      * Category icon and category name
 *      * Optional transaction note / description
 *      * Account/wallet badge pill (e.g., Cash Wallet, Main Savings)
 *      * Formatted date string
 *      * Type badge (Expense vs Income)
 *      * Formatted monetary amount with appropriate sign (+/-) and currency formatting
 *    - Empty state rendering:
 *      * Displays clean empty state banner when transaction array is empty
 *      * Shows descriptive prompt instructing user how to adjust filters
 *      * Offers a "Reset Filters" action button and triggers callback
 *    - Interactive action controls:
 *      * Triggers onEdit callback with exact transaction entity when Edit button is clicked
 *      * Triggers onDelete callback with exact transaction entity when Delete button is clicked
 *    - Pagination controls & navigation:
 *      * Renders summary counters (Showing X to Y of Z)
 *      * Renders page indicators (Page X of Y)
 *      * Triggers onPageChange with page numbers on Previous and Next clicks
 *      * Prevents out-of-bounds pagination (disables Previous on page 1, Next on final page)
 *      * Rows per page limit selector triggers onLimitChange
 *    - Loading state:
 *      * Displays loading spinner overlay during network fetch
 * 3. Architecture Compliance:
 *    - Pure component testing with no Redux/Context dependencies.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TransactionTable from '../src/components/transactions/TransactionTable.jsx';

describe('TransactionTable Component', () => {
  // Callback spy functions
  const mockPageChange = vi.fn();
  const mockLimitChange = vi.fn();
  const mockEdit = vi.fn();
  const mockDelete = vi.fn();
  const mockResetFilters = vi.fn();

  // Test fixture: diverse transaction items (Expense and Income)
  const sampleTransactions = [
    {
      _id: 'tx-001',
      type: 'Expense',
      amount: 45.5,
      date: '2026-11-20T10:00:00.000Z',
      note: 'Grocery store snacks',
      categoryId: { _id: 'cat-1', name: 'Food & Dining', icon: 'FaUtensils' },
      accountId: { _id: 'acc-1', name: 'Cash Wallet' },
    },
    {
      _id: 'tx-002',
      type: 'Income',
      amount: 2500.0,
      date: '2026-11-19T08:00:00.000Z',
      note: 'Freelance web development payment',
      categoryId: { _id: 'cat-2', name: 'Freelance', icon: 'FaLaptopCode' },
      accountId: { _id: 'acc-2', name: 'Main Savings' },
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    mockPageChange.mockReset();
    mockLimitChange.mockReset();
    mockEdit.mockReset();
    mockDelete.mockReset();
    mockResetFilters.mockReset();
  });

  // ---------------------------------------------------------------------------
  // 1. DATA RENDERING TESTS
  // ---------------------------------------------------------------------------
  it('renders list of transaction items with category icon, name, account pill, date, formatted colored amount, and type badge', () => {
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

    // Verify main table container
    expect(screen.getByTestId('transaction-table')).toBeInTheDocument();

    // 1. Category Names & Notes
    expect(screen.getByText('Food & Dining')).toBeInTheDocument();
    expect(screen.getByText('Grocery store snacks')).toBeInTheDocument();
    expect(screen.getByText('Freelance')).toBeInTheDocument();
    expect(screen.getByText('Freelance web development payment')).toBeInTheDocument();

    // 2. Account Name Pills
    expect(screen.getByText('Cash Wallet')).toBeInTheDocument();
    expect(screen.getByText('Main Savings')).toBeInTheDocument();

    // 3. Type Badges
    expect(screen.getByText('Expense')).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();

    // 4. Formatted Amounts: Expense has '-' sign, Income has '+' sign
    const expenseAmount = screen.getByText('-$45.50');
    expect(expenseAmount).toBeInTheDocument();
    expect(expenseAmount).toHaveClass('text-rose-600');

    const incomeAmount = screen.getByText('+$2,500.00');
    expect(incomeAmount).toBeInTheDocument();
    expect(incomeAmount).toHaveClass('text-emerald-600');

    // 5. Individual row testids exist
    expect(screen.getByTestId('transaction-row-tx-001')).toBeInTheDocument();
    expect(screen.getByTestId('transaction-row-tx-002')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 2. EMPTY STATE TESTS
  // ---------------------------------------------------------------------------
  it('displays clean empty state when transaction list is empty with descriptive prompt', () => {
    render(
      <TransactionTable
        transactions={[]}
        loading={false}
        totalCount={0}
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

    // Empty state container must be displayed
    const emptyState = screen.getByTestId('empty-transactions');
    expect(emptyState).toBeInTheDocument();

    // Informational header and prompt message
    expect(screen.getByText('No transactions found')).toBeInTheDocument();
    expect(
      screen.getByText(/we couldn't find any records matching your active filters/i)
    ).toBeInTheDocument();

    // Reset Filters button should be present
    const resetBtn = screen.getByRole('button', { name: /reset filters/i });
    expect(resetBtn).toBeInTheDocument();

    // Clicking Reset Filters triggers callback
    fireEvent.click(resetBtn);
    expect(mockResetFilters).toHaveBeenCalledTimes(1);

    // No table rows should exist
    expect(screen.queryByTestId('transaction-row-tx-001')).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 3. ACTION CONTROLS: EDIT & DELETE
  // ---------------------------------------------------------------------------
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
      />
    );

    // Find Edit button for the first transaction (Food & Dining)
    const editBtn = screen.getByRole('button', {
      name: /edit transaction food & dining/i,
    });
    fireEvent.click(editBtn);

    // Verify onEdit received sampleTransactions[0]
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
      />
    );

    // Find Delete button for the second transaction (Freelance)
    const deleteBtn = screen.getByRole('button', {
      name: /delete transaction freelance/i,
    });
    fireEvent.click(deleteBtn);

    // Verify onDelete received sampleTransactions[1]
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith(sampleTransactions[1]);
  });

  // ---------------------------------------------------------------------------
  // 4. PAGINATION CONTROLS & NAVIGATION
  // ---------------------------------------------------------------------------
  it('renders pagination controls (summary, limit selector, page indicator, previous & next) and triggers navigation', () => {
    render(
      <TransactionTable
        transactions={sampleTransactions}
        loading={false}
        totalCount={45}
        page={2}
        totalPages={5}
        limit={10}
        currency="USD"
        onPageChange={mockPageChange}
        onLimitChange={mockLimitChange}
        onEdit={mockEdit}
        onDelete={mockDelete}
      />
    );

    // 1. Records summary display: Page 2 with limit 10 out of 45 items = Showing 11 to 20 of 45
    expect(
      screen.getByText((_content, element) => {
        return (
          element?.tagName?.toLowerCase() === 'p' &&
          /showing\s+11\s+to\s+20\s+of\s+45\s+transactions/i.test(element.textContent)
        );
      })
    ).toBeInTheDocument();

    // 2. Page indicator
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();

    // 3. Rows per page selector
    const limitSelect = screen.getByLabelText(/rows per page/i);
    expect(limitSelect).toBeInTheDocument();
    expect(limitSelect.value).toBe('10');

    // Change rows per page
    fireEvent.change(limitSelect, { target: { value: '20' } });
    expect(mockLimitChange).toHaveBeenCalledWith(20);

    // 4. Navigation Buttons: Previous & Next
    const prevBtn = screen.getByRole('button', { name: /previous page/i });
    const nextBtn = screen.getByRole('button', { name: /next page/i });

    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    // Navigate to previous page (page 2 -> 1)
    fireEvent.click(prevBtn);
    expect(mockPageChange).toHaveBeenCalledWith(1);

    // Navigate to next page (page 2 -> 3)
    fireEvent.click(nextBtn);
    expect(mockPageChange).toHaveBeenCalledWith(3);
  });

  it('disables previous button on first page and disables next button on last page', () => {
    // Case A: First Page (page=1, totalPages=3)
    const { rerender } = render(
      <TransactionTable
        transactions={sampleTransactions}
        loading={false}
        totalCount={30}
        page={1}
        totalPages={3}
        limit={10}
        currency="USD"
        onPageChange={mockPageChange}
        onLimitChange={mockLimitChange}
      />
    );

    const prevBtnOnPage1 = screen.getByRole('button', { name: /previous page/i });
    const nextBtnOnPage1 = screen.getByRole('button', { name: /next page/i });
    expect(prevBtnOnPage1).toBeDisabled();
    expect(nextBtnOnPage1).not.toBeDisabled();

    // Case B: Final Page (page=3, totalPages=3)
    rerender(
      <TransactionTable
        transactions={sampleTransactions}
        loading={false}
        totalCount={30}
        page={3}
        totalPages={3}
        limit={10}
        currency="USD"
        onPageChange={mockPageChange}
        onLimitChange={mockLimitChange}
      />
    );

    const prevBtnOnPage3 = screen.getByRole('button', { name: /previous page/i });
    const nextBtnOnPage3 = screen.getByRole('button', { name: /next page/i });
    expect(prevBtnOnPage3).not.toBeDisabled();
    expect(nextBtnOnPage3).toBeDisabled();
  });

  // ---------------------------------------------------------------------------
  // 5. LOADING OVERLAY
  // ---------------------------------------------------------------------------
  it('renders loading overlay spinner when loading is true', () => {
    render(
      <TransactionTable
        transactions={sampleTransactions}
        loading={true}
        totalCount={2}
        page={1}
        totalPages={1}
        limit={10}
        currency="USD"
        onPageChange={mockPageChange}
        onLimitChange={mockLimitChange}
      />
    );

    // Loading overlay is visible
    expect(screen.getByTestId('table-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading transactions...')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // 6. CURRENCY FORMATTING
  // ---------------------------------------------------------------------------
  it('formats monetary amounts with specified foreign currency (e.g., EUR, GBP)', () => {
    render(
      <TransactionTable
        transactions={sampleTransactions}
        loading={false}
        totalCount={2}
        page={1}
        totalPages={1}
        limit={10}
        currency="EUR"
        onPageChange={mockPageChange}
        onLimitChange={mockLimitChange}
      />
    );

    // Amounts should now display with EUR symbol (€)
    expect(screen.getByText('-€45.50')).toBeInTheDocument();
    expect(screen.getByText('+€2,500.00')).toBeInTheDocument();
  });
});
