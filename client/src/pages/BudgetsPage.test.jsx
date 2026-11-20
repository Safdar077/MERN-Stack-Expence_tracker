import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BudgetsPage from './BudgetsPage.jsx';
import * as budgetsHook from '../hooks/useBudgets.js';
import * as authHook from '../hooks/useAuth.js';
import * as categoriesHook from '../hooks/useCategories.js';

const renderWithRouter = (ui) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('BudgetsPage Component', () => {
  const mockBudget = {
    _id: 'b1',
    month: 11,
    year: 2026,
    overallAmount: 2000,
    categoryLimits: [
      { categoryId: { _id: 'cat1', name: 'Food & Dining', icon: 'FaUtensils' }, amount: 600 },
      { categoryId: { _id: 'cat2', name: 'Entertainment', icon: 'FaGamepad' }, amount: 200 },
    ],
  };

  const mockCategorySummaries = [
    {
      categoryId: 'cat1',
      categoryName: 'Food & Dining',
      icon: 'FaUtensils',
      spent: 550,
      limit: 600,
      remaining: 50,
      percentage: 91.67,
      status: '90%',
      warning: 'Warning: You have used 91.67% of your Food & Dining budget',
      isExceeded: false,
    },
    {
      categoryId: 'cat2',
      categoryName: 'Entertainment',
      icon: 'FaGamepad',
      spent: 250,
      limit: 200,
      remaining: -50,
      percentage: 125,
      status: 'exceeded',
      warning: 'Budget exceeded by $50.00!',
      isExceeded: true,
    },
  ];

  const mockWarnings = [
    {
      type: 'category',
      label: 'Food & Dining',
      status: '90%',
      warning: 'Warning: You have used 91.67% of your Food & Dining budget',
      isExceeded: false,
    },
    {
      type: 'category',
      label: 'Entertainment',
      status: 'exceeded',
      warning: 'Budget exceeded by $50.00!',
      isExceeded: true,
    },
  ];

  const mockFetchBudget = vi.fn();
  const mockUpdateBudget = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { name: 'Alex Johnson', currency: 'USD' },
    });

    vi.spyOn(categoriesHook, 'useCategories').mockReturnValue({
      expenseCategories: [
        { _id: 'cat1', name: 'Food & Dining', icon: 'FaUtensils' },
        { _id: 'cat2', name: 'Entertainment', icon: 'FaGamepad' },
      ],
      loading: false,
      error: null,
      fetchCategories: vi.fn(),
    });

    vi.spyOn(budgetsHook, 'useBudgets').mockReturnValue({
      budget: mockBudget,
      totalExpense: 1400,
      remaining: 600,
      percentageUsed: 70,
      warnings: mockWarnings,
      warningAlerts: mockWarnings,
      categoryBudgets: mockCategorySummaries,
      categoryLimits: mockBudget.categoryLimits,
      loading: false,
      error: null,
      fetchBudget: mockFetchBudget,
      updateBudget: mockUpdateBudget,
    });
  });

  it('renders page header, month selector, and Edit Budget CTA', () => {
    renderWithRouter(<BudgetsPage />);

    expect(screen.getByTestId('budgets-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /monthly budgets/i })).toBeInTheDocument();
    expect(screen.getByTestId('budget-month-select')).toBeInTheDocument();
    expect(screen.getByTestId('budget-year-select')).toBeInTheDocument();
    expect(screen.getByTestId('set-budget-cta')).toBeInTheDocument();
  });

  it('renders overall monthly budget card using BudgetProgressBar', () => {
    renderWithRouter(<BudgetsPage />);

    expect(screen.getByTestId('overall-budget-card')).toBeInTheDocument();
    expect(screen.getByText('Monthly Budget')).toBeInTheDocument();
    expect(screen.getByText('$1,400.00')).toBeInTheDocument();
    expect(screen.getByText('of $2,000.00')).toBeInTheDocument();
  });

  it('renders active warning banners section for threshold alerts', () => {
    renderWithRouter(<BudgetsPage />);

    expect(screen.getByTestId('budget-warnings-section')).toBeInTheDocument();
    expect(
      screen.getByText(/Warning: You have used 91.67% of your Food & Dining budget/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Budget exceeded by \$50.00!/i)).toBeInTheDocument();
  });

  it('renders per-category budget cards with progress, spent, limit, and status badges', () => {
    renderWithRouter(<BudgetsPage />);

    const categorySection = screen.getByTestId('category-budgets-section');
    expect(categorySection).toBeInTheDocument();
    expect(categorySection).toHaveTextContent('Food & Dining');
    expect(categorySection).toHaveTextContent('Entertainment');

    const categoryCards = screen.getAllByTestId('category-budget-card');
    expect(categoryCards).toHaveLength(2);

    // Food & Dining has 90% Near Limit badge
    expect(screen.getByTestId('status-badge-cat1')).toHaveTextContent(/90%|Near Limit/i);

    // Entertainment has Exceeded badge
    expect(screen.getByTestId('status-badge-cat2')).toHaveTextContent(/exceeded/i);
  });

  it('changes month/year and triggers fetchBudget with new month and year', () => {
    renderWithRouter(<BudgetsPage />);

    const monthSelect = screen.getByTestId('budget-month-select');
    fireEvent.change(monthSelect, { target: { value: '10' } });

    expect(mockFetchBudget).toHaveBeenCalledWith(10, expect.any(Number));
  });

  it('opens BudgetModal when Set / Edit Budget CTA is clicked', () => {
    renderWithRouter(<BudgetsPage />);

    const editBtn = screen.getByTestId('set-budget-cta');
    fireEvent.click(editBtn);

    expect(screen.getByTestId('budget-modal')).toBeInTheDocument();
  });

  it('renders clean empty state when no budget is configured for selected month', () => {
    vi.spyOn(budgetsHook, 'useBudgets').mockReturnValue({
      budget: null,
      totalExpense: 0,
      remaining: 0,
      percentageUsed: 0,
      warnings: [],
      warningAlerts: [],
      categoryBudgets: [],
      categoryLimits: [],
      loading: false,
      error: null,
      fetchBudget: mockFetchBudget,
      updateBudget: mockUpdateBudget,
    });

    renderWithRouter(<BudgetsPage />);

    expect(screen.getByTestId('empty-budget-state')).toBeInTheDocument();
    expect(screen.getByText(/no budget set for this month/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create monthly budget/i })).toBeInTheDocument();
  });
});
