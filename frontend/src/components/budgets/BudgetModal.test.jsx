import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BudgetModal from './BudgetModal.jsx';
import * as categoriesHook from '../../hooks/useCategories.js';

describe('BudgetModal Component', () => {
  const mockCategories = [
    { _id: 'cat1', name: 'Food & Dining', type: 'Expense', icon: 'FaUtensils' },
    { _id: 'cat2', name: 'Transportation', type: 'Expense', icon: 'FaCar' },
    { _id: 'cat3', name: 'Housing', type: 'Expense', icon: 'FaHome' },
  ];

  const mockUpdateBudget = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(categoriesHook, 'useCategories').mockReturnValue({
      expenseCategories: mockCategories,
      categories: mockCategories,
      loading: false,
      error: null,
      fetchCategories: vi.fn(),
    });
  });

  it('does not render when isOpen is false', () => {
    render(
      <BudgetModal
        isOpen={false}
        onClose={mockOnClose}
        updateBudget={mockUpdateBudget}
      />
    );

    expect(screen.queryByTestId('budget-modal')).not.toBeInTheDocument();
  });

  it('renders modal with month, year, overall budget, and dynamic category inputs', () => {
    render(
      <BudgetModal
        isOpen={true}
        onClose={mockOnClose}
        selectedMonth={11}
        selectedYear={2026}
        currency="$"
        updateBudget={mockUpdateBudget}
      />
    );

    expect(screen.getByTestId('budget-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /set monthly budget/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/select month/i)).toHaveValue('11');
    expect(screen.getByLabelText(/select year/i)).toHaveValue('2026');
    expect(screen.getByLabelText(/overall monthly budget/i)).toHaveValue(0);

    // Dynamic expense categories rendered
    expect(screen.getByText('Food & Dining')).toBeInTheDocument();
    expect(screen.getByText('Transportation')).toBeInTheDocument();
    expect(screen.getByText('Housing')).toBeInTheDocument();
  });

  it('prepopulates fields when currentBudget is provided', () => {
    const existingBudget = {
      _id: 'b1',
      month: 11,
      year: 2026,
      overallAmount: 2500,
      categoryLimits: [
        { categoryId: 'cat1', amount: 500 },
        { categoryId: 'cat2', amount: 300 },
      ],
    };

    render(
      <BudgetModal
        isOpen={true}
        onClose={mockOnClose}
        currentBudget={existingBudget}
        selectedMonth={11}
        selectedYear={2026}
        updateBudget={mockUpdateBudget}
      />
    );

    expect(screen.getByLabelText(/overall monthly budget/i)).toHaveValue(2500);
    expect(screen.getByTestId('category-limit-cat1')).toHaveValue(500);
    expect(screen.getByTestId('category-limit-cat2')).toHaveValue(300);
    expect(screen.getByTestId('category-limit-cat3')).toHaveValue(0);
  });

  it('validates overall amount before submitting', async () => {
    render(
      <BudgetModal
        isOpen={true}
        onClose={mockOnClose}
        updateBudget={mockUpdateBudget}
      />
    );

    // Set overall amount to negative
    fireEvent.change(screen.getByLabelText(/overall monthly budget/i), {
      target: { value: '-100' },
    });

    const submitBtn = screen.getByRole('button', { name: /save budget/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText(/overall budget amount must be non-negative/i)
    ).toBeInTheDocument();
    expect(mockUpdateBudget).not.toHaveBeenCalled();
  });

  it('submits valid budget configuration calling updateBudget and closes modal', async () => {
    mockUpdateBudget.mockResolvedValueOnce({
      success: true,
      budget: { _id: 'b_new' },
    });

    render(
      <BudgetModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        selectedMonth={12}
        selectedYear={2026}
        updateBudget={mockUpdateBudget}
      />
    );

    // Change overall amount
    fireEvent.change(screen.getByLabelText(/overall monthly budget/i), {
      target: { value: '3000' },
    });

    // Enter category limits
    fireEvent.change(screen.getByTestId('category-limit-cat1'), {
      target: { value: '600' },
    });
    fireEvent.change(screen.getByTestId('category-limit-cat3'), {
      target: { value: '1500' },
    });

    const submitBtn = screen.getByRole('button', { name: /save budget/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateBudget).toHaveBeenCalledWith({
        month: 12,
        year: 2026,
        overallAmount: 3000,
        categoryLimits: [
          { categoryId: 'cat1', amount: 600 },
          { categoryId: 'cat3', amount: 1500 },
        ],
      });
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('displays server error if updateBudget returns failure', async () => {
    mockUpdateBudget.mockResolvedValueOnce({
      success: false,
      error: 'Failed to save budget settings.',
    });

    render(
      <BudgetModal
        isOpen={true}
        onClose={mockOnClose}
        updateBudget={mockUpdateBudget}
      />
    );

    fireEvent.change(screen.getByLabelText(/overall monthly budget/i), {
      target: { value: '2000' },
    });

    const submitBtn = screen.getByRole('button', { name: /save budget/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('Failed to save budget settings.')
    ).toBeInTheDocument();
  });

  it('closes on Escape key press', () => {
    render(
      <BudgetModal
        isOpen={true}
        onClose={mockOnClose}
        updateBudget={mockUpdateBudget}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
