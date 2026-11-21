import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SpendingTrendChart from './SpendingTrendChart.jsx';

describe('SpendingTrendChart Component', () => {
  const mockTrends = [
    { label: 'Nov 14', date: '2026-11-14', income: 1200, expense: 450, net: 750 },
    { label: 'Nov 15', date: '2026-11-15', income: 0, expense: 80, net: -80 },
    { label: 'Nov 16', date: '2026-11-16', income: 300, expense: 150, net: 150 },
  ];

  it('renders clean empty state when trends array is empty or zero activity', () => {
    render(<SpendingTrendChart data={[]} />);

    expect(screen.getByTestId('spending-trend-empty')).toBeInTheDocument();
    expect(screen.getByText(/No Spending Trends/i)).toBeInTheDocument();
    expect(
      screen.getByText(/No income or expense records were found for this timeframe/i)
    ).toBeInTheDocument();
  });

  it('renders empty state when all data items have zero income and expense', () => {
    const zeroTrends = [
      { label: 'Nov 14', income: 0, expense: 0 },
      { label: 'Nov 15', income: 0, expense: 0 },
    ];
    render(<SpendingTrendChart data={zeroTrends} />);

    expect(screen.getByTestId('spending-trend-empty')).toBeInTheDocument();
  });

  it('renders chart container and header labels when trend data is provided', () => {
    render(
      <SpendingTrendChart
        data={mockTrends}
        currency="$"
      />
    );

    expect(screen.getByTestId('spending-trend-chart')).toBeInTheDocument();
    expect(screen.getByText('Spending Trends')).toBeInTheDocument();
    expect(screen.getByText('Chronological income vs expenses')).toBeInTheDocument();
  });

  it('supports spendingTrends server aggregation object prop', () => {
    const spendingTrends = {
      trends: [
        { label: 'Week 1', income: 2500, expense: 1200, net: 1300 },
        { label: 'Week 2', income: 800, expense: 600, net: 200 },
      ],
      totalIncome: 3300,
      totalExpense: 1800,
      netSavings: 1500,
    };

    render(
      <SpendingTrendChart
        spendingTrends={spendingTrends}
        currency="€"
      />
    );

    expect(screen.getByTestId('spending-trend-chart')).toBeInTheDocument();
    expect(screen.getByText('Spending Trends')).toBeInTheDocument();
  });
});
