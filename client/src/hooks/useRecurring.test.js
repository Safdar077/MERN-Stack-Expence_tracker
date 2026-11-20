import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecurring } from './useRecurring.js';
import axiosClient from '../api/axiosClient.js';
import * as eventBus from '../utils/eventBus.js';

vi.mock('../api/axiosClient.js', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

describe('useRecurring hook', () => {
  const mockRules = [
    { _id: 'r1', name: 'Netflix', amount: 15.99, frequency: 'Monthly', isActive: true, nextDueDate: '2026-11-20' },
    { _id: 'r2', name: 'Apartment Rent', amount: 1200, frequency: 'Monthly', isActive: true, nextDueDate: '2026-12-01' },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches recurring rules and populates recurringList, dueItems, upcomingItems', async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 2,
        recurringRules: mockRules,
        dueItems: [mockRules[0]],
        upcomingItems: [mockRules[1]],
      },
    });

    const { result } = renderHook(() => useRecurring());

    await act(async () => {
      await Promise.resolve();
    });

    expect(axiosClient.get).toHaveBeenCalledWith('/recurring');
    expect(result.current.recurringList).toEqual(mockRules);
    expect(result.current.dueItems).toEqual([mockRules[0]]);
    expect(result.current.upcomingItems).toEqual([mockRules[1]]);
  });

  it('marks a recurring item as paid, emits sync events, and re-fetches', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');

    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 1,
        recurringRules: [mockRules[0]],
        dueItems: [mockRules[0]],
        upcomingItems: [],
      },
    });

    const { result } = renderHook(() => useRecurring());
    await act(async () => {
      await Promise.resolve();
    });

    const updatedRule = { ...mockRules[0], nextDueDate: '2026-12-20' };
    const mockTx = { _id: 't10', amount: 15.99, note: 'Recurring: Netflix' };

    axiosClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        rule: updatedRule,
        transaction: mockTx,
      },
    });

    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 1,
        recurringRules: [updatedRule],
        dueItems: [],
        upcomingItems: [],
      },
    });

    let res;
    await act(async () => {
      res = await result.current.markAsPaid('r1');
    });

    expect(res.success).toBe(true);
    expect(axiosClient.post).toHaveBeenCalledWith('/recurring/r1/pay');
    expect(emitSpy).toHaveBeenCalledWith('recurring:paid', { rule: updatedRule, transaction: mockTx });
    expect(emitSpy).toHaveBeenCalledWith('transaction:created', mockTx);
  });
});
