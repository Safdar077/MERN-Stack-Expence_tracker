import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCategories } from './useCategories.js';
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

describe('useCategories hook', () => {
  const mockCategories = [
    { _id: 'c1', name: 'Food', type: 'Expense', icon: 'FaUtensils', isCustom: false },
    { _id: 'c2', name: 'Salary', type: 'Income', icon: 'FaMoneyBillWave', isCustom: false },
    { _id: 'c3', name: 'Travel', type: 'Expense', icon: 'FaCar', isCustom: false },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches categories and separates expense and income lists', async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 3,
        categories: mockCategories,
      },
    });

    const { result } = renderHook(() => useCategories());

    await act(async () => {
      await Promise.resolve();
    });

    expect(axiosClient.get).toHaveBeenCalledWith('/categories');
    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.expenseCategories).toHaveLength(2);
    expect(result.current.expenseCategories.map((c) => c.name)).toEqual(['Food', 'Travel']);
    expect(result.current.incomeCategories).toHaveLength(1);
    expect(result.current.incomeCategories[0].name).toBe('Salary');
  });

  it('creates a custom category, emits sync event, and re-fetches', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');

    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 0,
        categories: [],
      },
    });

    const { result } = renderHook(() => useCategories());
    await act(async () => {
      await Promise.resolve();
    });

    const newCat = { _id: 'c4', name: 'Coffee', type: 'Expense', icon: 'FaCoffee', isCustom: true };
    axiosClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        category: newCat,
      },
    });

    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 1,
        categories: [newCat],
      },
    });

    let res;
    await act(async () => {
      res = await result.current.createCustomCategory({ name: 'Coffee', type: 'Expense', icon: 'FaCoffee' });
    });

    expect(res.success).toBe(true);
    expect(axiosClient.post).toHaveBeenCalledWith('/categories', { name: 'Coffee', type: 'Expense', icon: 'FaCoffee' });
    expect(emitSpy).toHaveBeenCalledWith('category:created', newCat);
    expect(result.current.categories).toEqual([newCat]);
  });
});
