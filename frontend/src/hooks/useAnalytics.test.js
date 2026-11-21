import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnalytics } from './useAnalytics.js';
import axiosClient from '../api/axiosClient.js';

vi.mock('../api/axiosClient.js', () => {
  return {
    default: {
      get: vi.fn(),
    },
  };
});

describe('useAnalytics hook', () => {
  const mockOverview = {
    totalIncome: 5000,
    totalExpense: 2000,
    netSavings: 3000,
    monthlyIncome: 2500,
    monthlyExpense: 1000,
    monthlyNetSavings: 1500,
    budgetUsagePercentage: 50,
  };

  const mockCategories = {
    timeframe: 'Month',
    totalExpenses: 1000,
    categories: [{ categoryName: 'Food', amount: 400, percentage: 40 }],
  };

  const mockTrends = {
    timeframe: 'Month',
    trends: [{ date: '2026-11-01', income: 2500, expense: 500, net: 2000 }],
    totalIncome: 2500,
    totalExpense: 1000,
    netSavings: 1500,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches overview, categories, and trends concurrently on mount', async () => {
    axiosClient.get.mockImplementation((url) => {
      if (url === '/analytics/overview') {
        return Promise.resolve({ data: { success: true, data: mockOverview } });
      }
      if (url === '/analytics/categories') {
        return Promise.resolve({ data: { success: true, ...mockCategories } });
      }
      if (url === '/analytics/trends') {
        return Promise.resolve({ data: { success: true, ...mockTrends } });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });

    const { result } = renderHook(() => useAnalytics('Month'));

    await act(async () => {
      await Promise.resolve();
    });

    expect(axiosClient.get).toHaveBeenCalledWith('/analytics/overview');
    expect(axiosClient.get).toHaveBeenCalledWith('/analytics/categories', {
      params: { timeframe: 'Month' },
    });
    expect(axiosClient.get).toHaveBeenCalledWith('/analytics/trends', {
      params: { timeframe: 'Month' },
    });

    expect(result.current.overview).toEqual(mockOverview);
    expect(result.current.categoryBreakdown).toEqual({ success: true, ...mockCategories });
    expect(result.current.spendingTrends).toEqual({ success: true, ...mockTrends });
    expect(result.current.loading).toBe(false);
  });

  it('parses overview when response payload has data.overview', async () => {
    axiosClient.get.mockImplementation((url) => {
      if (url === '/analytics/overview') {
        return Promise.resolve({ data: { success: true, overview: mockOverview } });
      }
      return Promise.resolve({ data: {} });
    });

    const { result } = renderHook(() => useAnalytics('Month'));
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.overview).toEqual(mockOverview);
  });
});
