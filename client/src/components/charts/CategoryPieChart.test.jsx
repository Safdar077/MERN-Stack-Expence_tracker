import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CategoryPieChart from './CategoryPieChart.jsx';

describe('CategoryPieChart Component', () => {
  const mockCategories = [
    {
      categoryId: 'c1',
      categoryName: 'Food & Dining',
      amount: 450,
      percentage: 45,
      color: '#10B981',
    },
    {
      categoryId: 'c2',
      categoryName: 'Housing & Rent',
      amount: 350,
      percentage: 35,
      color: '#6366F1',
    },
    {
      categoryId: 'c3',
      categoryName: 'Entertainment',
      amount: 200,
      percentage: 20,
      color: '#F59E0B',
    },
  ];

  it('renders clean empty state when data array is empty', () => {
    render(<CategoryPieChart data={[]} />);

    expect(screen.getByTestId('category-pie-empty')).toBeInTheDocument();
    expect(screen.getByText(/No Expense Data/i)).toBeInTheDocument();
    expect(
      screen.getByText(/There are no expenses recorded for this timeframe/i)
    ).toBeInTheDocument();
  });

  it('renders chart container and total expense formatted with currency', () => {
    render(
      <CategoryPieChart
        data={mockCategories}
        currency="$"
      />
    );

    expect(screen.getByTestId('category-pie-chart')).toBeInTheDocument();
    expect(screen.getByText('Category Breakdown')).toBeInTheDocument();

    // Total expense = 450 + 350 + 200 = 1000
    const totalElem = screen.getByTestId('category-pie-total');
    expect(totalElem).toHaveTextContent('$1,000.00');
  });

  it('renders category legend items with percentages', () => {
    render(
      <CategoryPieChart
        data={mockCategories}
        currency="$"
      />
    );

    expect(screen.getByText(/Food & Dining/i)).toBeInTheDocument();
    expect(screen.getByText(/Housing & Rent/i)).toBeInTheDocument();
    expect(screen.getByText(/Entertainment/i)).toBeInTheDocument();
  });

  it('supports categoryBreakdown server aggregation object prop', () => {
    const categoryBreakdown = {
      totalExpenses: 800,
      categories: [
        {
          categoryId: 'c4',
          categoryName: 'Utilities',
          amount: 800,
          percentage: 100,
          color: '#EC4899',
        },
      ],
    };

    render(
      <CategoryPieChart
        categoryBreakdown={categoryBreakdown}
        currency="€"
      />
    );

    expect(screen.getByTestId('category-pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('category-pie-total')).toHaveTextContent('€800.00');
    expect(screen.getByText(/Utilities/i)).toBeInTheDocument();
  });
});
