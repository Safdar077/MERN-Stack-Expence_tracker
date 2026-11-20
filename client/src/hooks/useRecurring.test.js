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
    { _id: 'r1', name: 'Netflix', title: 'Netflix', amount: 15.99, frequency: 'Monthly', isActive: true, nextDueDate: '2026-11-20' },
    { _id: 'r2', name: 'Apartment Rent', title: 'Apartment Rent', amount: 1200, frequency: 'Monthly', isActive: true, nextDueDate: '2026-12-01' },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches recurring rules and normalizes name and title bidirectionally', async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 2,
        recurringRules: [
          { _id: 'r1', name: 'Netflix', amount: 15.99, frequency: 'Monthly', isActive: true, nextDueDate: '2026-11-20' },
          { _id: 'r2', title: 'Apartment Rent', amount: 1200, frequency: 'Monthly', isActive: true, nextDueDate: '2026-12-01' },
        ],
        dueItems: [
          { _id: 'r1', name: 'Netflix', amount: 15.99, frequency: 'Monthly', isActive: true, nextDueDate: '2026-11-20' },
        ],
        upcomingItems: [
          { _id: 'r2', title: 'Apartment Rent', amount: 1200, frequency: 'Monthly', isActive: true, nextDueDate: '2026-12-01' },
        ],
      },
    });

    const { result } = renderHook(() => useRecurring());

    await act(async () => {
      await Promise.resolve();
    });

    expect(axiosClient.get).toHaveBeenCalledWith('/recurring');
    expect(result.current.recurringList[0].name).toBe('Netflix');
    expect(result.current.recurringList[0].title).toBe('Netflix');
    expect(result.current.recurringList[1].name).toBe('Apartment Rent');
    expect(result.current.recurringList[1].title).toBe('Apartment Rent');
    expect(result.current.dueItems[0].name).toBe('Netflix');
    expect(result.current.upcomingItems[0].title).toBe('Apartment Rent');
  });

  it('adds recurring rule with normalized title/name and emits sync event', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');

    axiosClient.get.mockResolvedValueOnce({
      data: { success: true, count: 0, recurringRules: [], dueItems: [], upcomingItems: [] },
    });

    const { result } = renderHook(() => useRecurring());
    await act(async () => {
      await Promise.resolve();
    });

    const createdRuleResponse = { _id: 'r3', name: 'Gym', amount: 40, frequency: 'Monthly' };
    axiosClient.post.mockResolvedValueOnce({
      data: { success: true, rule: createdRuleResponse },
    });

    let res;
    await act(async () => {
      res = await result.current.addRecurring({ title: 'Gym', amount: 40, frequency: 'Monthly' });
    });

    expect(res.success).toBe(true);
    expect(axiosClient.post).toHaveBeenCalledWith('/recurring', {
      title: 'Gym',
      name: 'Gym',
      amount: 40,
      frequency: 'Monthly',
    });
    expect(emitSpy).toHaveBeenCalledWith('recurring:created', expect.objectContaining({
      name: 'Gym',
      title: 'Gym',
    }));
  });

  it('marks a recurring item as paid, emits sync events without double-fetching', async () => {
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

    let res;
    await act(async () => {
      res = await result.current.markAsPaid('r1');
    });

    expect(res.success).toBe(true);
    expect(axiosClient.post).toHaveBeenCalledWith('/recurring/r1/pay');
    expect(emitSpy).toHaveBeenCalledWith('recurring:paid', {
      rule: expect.objectContaining({ name: 'Netflix', title: 'Netflix' }),
      transaction: mockTx,
    });
    expect(emitSpy).toHaveBeenCalledWith('transaction:created', mockTx);
  });
});
