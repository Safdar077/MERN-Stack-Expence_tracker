import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterBar from './FilterBar.jsx';
import * as categoriesHook from '../../hooks/useCategories.js';
import * as accountsHook from '../../hooks/useAccounts.js';

describe('FilterBar Component', () => {
  const mockFilterChange = vi.fn();
  const mockReset = vi.fn();
  const mockExport = vi.fn();

  const mockCategories = [
    { _id: 'cat1', name: 'Groceries', type: 'Expense' },
    { _id: 'cat2', name: 'Transport', type: 'Expense' },
    { _id: 'cat3', name: 'Salary', type: 'Income' },
    { _id: 'cat4', name: 'Freelance', type: 'Income' },
  ];

  const mockAccounts = [
    { _id: 'acc1', name: 'Cash Wallet', type: 'Cash' },
    { _id: 'acc2', name: 'Checking Account', type: 'Bank Account' },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    mockFilterChange.mockClear();
    mockReset.mockClear();
    mockExport.mockClear();

    vi.spyOn(categoriesHook, 'useCategories').mockReturnValue({
      categories: mockCategories,
      loading: false,
    });

    vi.spyOn(accountsHook, 'useAccounts').mockReturnValue({
      accounts: mockAccounts,
      loading: false,
    });
  });

  it('renders all filter controls and action buttons', () => {
    render(
      <FilterBar
        filters={{}}
        onFilterChange={mockFilterChange}
        onReset={mockReset}
        onExport={mockExport}
      />
    );

    expect(screen.getByLabelText(/search transactions/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/transaction type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^category$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^account$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/min amount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max amount/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset filters/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
  });

  it('triggers onFilterChange when search text is entered', () => {
    render(
      <FilterBar
        filters={{ search: '' }}
        onFilterChange={mockFilterChange}
        onReset={mockReset}
        onExport={mockExport}
      />
    );

    const searchInput = screen.getByLabelText(/search transactions/i);
    fireEvent.change(searchInput, { target: { value: 'coffee' } });

    expect(mockFilterChange).toHaveBeenCalledWith('search', 'coffee');
  });

  it('triggers onFilterChange when transaction type is selected', () => {
    render(
      <FilterBar
        filters={{ type: '' }}
        onFilterChange={mockFilterChange}
        onReset={mockReset}
        onExport={mockExport}
      />
    );

    const typeSelect = screen.getByLabelText(/transaction type/i);
    fireEvent.change(typeSelect, { target: { value: 'Expense' } });

    expect(mockFilterChange).toHaveBeenCalledWith('type', 'Expense');
  });

  it('filters category dropdown options when type is Expense or Income', () => {
    const { rerender } = render(
      <FilterBar
        filters={{ type: 'Expense' }}
        onFilterChange={mockFilterChange}
        onReset={mockReset}
        onExport={mockExport}
      />
    );

    // Should include Expense categories and exclude Income categories
    expect(screen.getByRole('option', { name: 'Groceries' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Transport' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Salary' })).not.toBeInTheDocument();

    // Rerender with Income filter
    rerender(
      <FilterBar
        filters={{ type: 'Income' }}
        onFilterChange={mockFilterChange}
        onReset={mockReset}
        onExport={mockExport}
      />
    );

    expect(screen.getByRole('option', { name: 'Salary' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Freelance' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Groceries' })).not.toBeInTheDocument();
  });

  it('clears categoryId when switching to a type incompatible with current category', () => {
    // cat1 is an Expense category ('Groceries')
    render(
      <FilterBar
        filters={{ type: 'Expense', categoryId: 'cat1' }}
        onFilterChange={mockFilterChange}
        onReset={mockReset}
        onExport={mockExport}
      />
    );

    const typeSelect = screen.getByLabelText(/transaction type/i);
    fireEvent.change(typeSelect, { target: { value: 'Income' } });

    expect(mockFilterChange).toHaveBeenCalledWith('categoryId', '');
    expect(mockFilterChange).toHaveBeenCalledWith('type', 'Income');
  });

  it('triggers onFilterChange when category or account dropdown is selected', () => {
    render(
      <FilterBar
        filters={{ categoryId: '', accountId: '' }}
        onFilterChange={mockFilterChange}
        onReset={mockReset}
        onExport={mockExport}
      />
    );

    const catSelect = screen.getByLabelText(/^category$/i);
    fireEvent.change(catSelect, { target: { value: 'cat1' } });
    expect(mockFilterChange).toHaveBeenCalledWith('categoryId', 'cat1');

    const accSelect = screen.getByLabelText(/^account$/i);
    fireEvent.change(accSelect, { target: { value: 'acc2' } });
    expect(mockFilterChange).toHaveBeenCalledWith('accountId', 'acc2');
  });

  it('triggers onFilterChange when date or amount range inputs change', () => {
    render(
      <FilterBar
        filters={{ startDate: '', endDate: '', minAmount: '', maxAmount: '' }}
        onFilterChange={mockFilterChange}
        onReset={mockReset}
        onExport={mockExport}
      />
    );

    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: '2026-11-01' },
    });
    expect(mockFilterChange).toHaveBeenCalledWith('startDate', '2026-11-01');

    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: '2026-11-20' },
    });
    expect(mockFilterChange).toHaveBeenCalledWith('endDate', '2026-11-20');

    fireEvent.change(screen.getByLabelText(/min amount/i), {
      target: { value: '25' },
    });
    expect(mockFilterChange).toHaveBeenCalledWith('minAmount', '25');

    fireEvent.change(screen.getByLabelText(/max amount/i), {
      target: { value: '150' },
    });
    expect(mockFilterChange).toHaveBeenCalledWith('maxAmount', '150');
  });

  it('triggers onReset callback when Reset Filters button is clicked', () => {
    render(
      <FilterBar
        filters={{ search: 'keyword', type: 'Expense' }}
        onFilterChange={mockFilterChange}
        onReset={mockReset}
        onExport={mockExport}
      />
    );

    const resetButton = screen.getByRole('button', { name: /reset filters/i });
    fireEvent.click(resetButton);

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  it('triggers onExport callback when Export CSV button is clicked', () => {
    render(
      <FilterBar
        filters={{ search: 'keyword' }}
        onFilterChange={mockFilterChange}
        onReset={mockReset}
        onExport={mockExport}
        isExporting={false}
      />
    );

    const exportBtn = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportBtn);

    expect(mockExport).toHaveBeenCalledTimes(1);
  });

  it('disables Export CSV button and shows loading text while exporting', () => {
    render(
      <FilterBar
        filters={{}}
        onFilterChange={mockFilterChange}
        onReset={mockReset}
        onExport={mockExport}
        isExporting={true}
      />
    );

    const exportBtn = screen.getByRole('button', { name: /exporting\.\.\./i });
    expect(exportBtn).toBeDisabled();
  });
});
