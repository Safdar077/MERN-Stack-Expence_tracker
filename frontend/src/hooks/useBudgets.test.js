import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBudgets } from './useBudgets.js';
import axiosClient from '../api/axiosClient.js';
import * as eventBus from '../utils/eventBus.js';

vi.mock('../api/axiosClient.js', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
    },
  };
});

describe('useBudgets hook', () => {
  const mockBudgetResponse = {
    success: true,
    month: 11,
    year: 2026,
    budget: {
      _id: 'b1',
      month: 11,
      year: 2026,
      overallAmount: 2000,
      categoryLimits: [{ categoryId: 'c1', amount: 500 }],
    },
    overall: {
      spent: 1200,
      remaining: 800,
      percentage: 60,
    },
    categorySummaries: [
      { categoryId: 'c1', categoryName: 'Food', spent: 300, limit: 500, remaining: 200, percentage: 60 },
    ],
    warnings: [
      { type: 'overall', message: 'You have reached 60% of your budget' },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches current budget data on mount', async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: mockBudgetResponse,
    });

    const { result } = renderHook(() => useBudgets());

    await act(async () => {
      await Promise.resolve();
    });

    expect(axiosClient.get).toHaveBeenCalledWith('/budgets/current');
    expect(result.current.budget).toEqual(mockBudgetResponse.budget);
    expect(result.current.totalExpense).toBe(1200);
    expect(result.current.remaining).toBe(800);
    expect(result.current.percentageUsed).toBe(60);
    expect(result.current.warnings).toEqual(mockBudgetResponse.warnings);
    expect(result.current.categoryBudgets).toEqual(mockBudgetResponse.categorySummaries);
    expect(result.current.categoryLimits).toEqual(mockBudgetResponse.budget.categoryLimits);
  });

  it('updates budget, emits sync event, and re-fetches', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');

    axiosClient.get.mockResolvedValueOnce({
      data: mockBudgetResponse,
    });

    const { result } = renderHook(() => useBudgets());
    await act(async () => {
      await Promise.resolve();
    });

    const updatedBudget = { ...mockBudgetResponse.budget, overallAmount: 2500 };
    axiosClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        budget: updatedBudget,
      },
    });

    axiosClient.get.mockResolvedValueOnce({
      data: {
        ...mockBudgetResponse,
        budget: updatedBudget,
      },
    });

    let res;
    await act(async () => {
      res = await result.current.updateBudget({ month: 11, year: 2026, overallAmount: 2500 });
    });

    expect(res.success).toBe(true);
    expect(axiosClient.post).toHaveBeenCalledWith('/budgets', { month: 11, year: 2026, overallAmount: 2500 });
    expect(emitSpy).toHaveBeenCalledWith('budget:updated', updatedBudget);
  });
});
