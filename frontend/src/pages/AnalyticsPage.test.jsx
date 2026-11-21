import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnalyticsPage from './AnalyticsPage.jsx';

// Track timeframe passed to useAnalytics
let capturedTimeframe = null;
let mockAnalyticsState = {};

vi.mock('../hooks/useAnalytics.js', () => ({
  useAnalytics: (timeframe) => {
    capturedTimeframe = timeframe;
    return mockAnalyticsState;
  },
}));

vi.mock('../hooks/useAuth.js', () => ({
  useAuth: () => ({
    user: { name: 'Alex Johnson', currency: '$' },
  }),
}));

describe('AnalyticsPage Component', () => {
  const sampleOverview = {
    totalIncome: 12000,
    totalExpense: 7500,
    netSavings: 4500,
    budgetUsagePercentage: 62.5,
    budget: {
      limit: 2000,
      spent: 1250,
      remaining: 750,
      percentage: 62.5,
      isExceeded: false,
    },
  };

  const sampleCategoryBreakdown = {
    totalExpenses: 2500,
    categories: [
      {
        categoryId: 'c1',
        categoryName: 'Food & Dining',
        amount: 1500,
        percentage: 60,
        color: '#10B981',
      },
      {
        categoryId: 'c2',
        categoryName: 'Shopping',
        amount: 1000,
        percentage: 40,
        color: '#6366F1',
      },
    ],
  };

  const sampleSpendingTrends = {
    timeframe: 'Month',
    trends: [
      { label: 'Week 1', income: 1500, expense: 800, net: 700 },
      { label: 'Week 2', income: 2000, expense: 1200, net: 800 },
    ],
    totalIncome: 3500,
    totalExpense: 2000,
    netSavings: 1500,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedTimeframe = null;
    mockAnalyticsState = {
      overview: sampleOverview,
      categoryBreakdown: sampleCategoryBreakdown,
      spendingTrends: sampleSpendingTrends,
      loading: false,
      error: null,
      fetchAnalytics: vi.fn(),
    };
  });

  it('renders page header and all timeframe selector tabs with Month active by default', () => {
    render(<AnalyticsPage />);

    expect(screen.getByRole('heading', { name: /Financial Analytics/i })).toBeInTheDocument();
    expect(screen.getByTestId('timeframe-tab-Week')).toBeInTheDocument();
    expect(screen.getByTestId('timeframe-tab-Month')).toBeInTheDocument();
    expect(screen.getByTestId('timeframe-tab-3Months')).toBeInTheDocument();
    expect(screen.getByTestId('timeframe-tab-Year')).toBeInTheDocument();

    // Default timeframe is Month
    expect(capturedTimeframe).toBe('Month');
  });

  it('renders high-level financial summary metric cards', () => {
    render(<AnalyticsPage />);

    // Total income from sampleSpendingTrends: $3,500.00
    expect(screen.getByTestId('metric-total-income')).toHaveTextContent('$3,500.00');
    // Total expense from sampleSpendingTrends: $2,000.00
    expect(screen.getByTestId('metric-total-expenses')).toHaveTextContent('$2,000.00');
    // Net savings: $1,500.00
    expect(screen.getByTestId('metric-net-savings')).toHaveTextContent('$1,500.00');
    // Budget usage: 63% (rounded from 62.5%)
    expect(screen.getByTestId('metric-budget-usage')).toHaveTextContent('63%');
  });

  it('renders visual charts layout with CategoryPieChart and SpendingTrendChart', () => {
    render(<AnalyticsPage />);

    expect(screen.getByTestId('analytics-charts-grid')).toBeInTheDocument();
    expect(screen.getByTestId('category-pie-chart')).toBeInTheDocument();
    expect(screen.getByTestId('spending-trend-chart')).toBeInTheDocument();
  });

  it('updates timeframe and passes selected timeframe to useAnalytics hook when a tab is clicked', () => {
    const { rerender } = render(<AnalyticsPage />);

    expect(capturedTimeframe).toBe('Month');

    // Click 'Week' tab
    fireEvent.click(screen.getByTestId('timeframe-tab-Week'));
    rerender(<AnalyticsPage />);
    expect(capturedTimeframe).toBe('Week');

    // Click '3 Months' tab
    fireEvent.click(screen.getByTestId('timeframe-tab-3Months'));
    rerender(<AnalyticsPage />);
    expect(capturedTimeframe).toBe('3Months');

    // Click 'Year' tab
    fireEvent.click(screen.getByTestId('timeframe-tab-Year'));
    rerender(<AnalyticsPage />);
    expect(capturedTimeframe).toBe('Year');
  });

  it('renders error notice banner and retry button when error occurs', () => {
    const fetchAnalyticsMock = vi.fn();
    mockAnalyticsState = {
      ...mockAnalyticsState,
      error: 'Failed to aggregate analytics data from server',
      fetchAnalytics: fetchAnalyticsMock,
    };

    render(<AnalyticsPage />);

    expect(screen.getByTestId('analytics-error-banner')).toBeInTheDocument();
    expect(
      screen.getByText('Failed to aggregate analytics data from server')
    ).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Retry/i });
    fireEvent.click(retryBtn);

    expect(fetchAnalyticsMock).toHaveBeenCalledWith('Month');
  });

  it('renders loading state when initial data is being fetched', () => {
    mockAnalyticsState = {
      overview: null,
      categoryBreakdown: null,
      spendingTrends: null,
      loading: true,
      error: null,
      fetchAnalytics: vi.fn(),
    };

    render(<AnalyticsPage />);

    expect(screen.getByTestId('analytics-loading')).toBeInTheDocument();
    expect(
      screen.getByText(/Aggregating financial charts for Month.../i)
    ).toBeInTheDocument();
  });
});
