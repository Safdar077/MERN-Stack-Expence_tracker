import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGoals } from './useGoals.js';
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

describe('useGoals hook', () => {
  const mockGoals = [
    {
      _id: 'g1',
      name: 'Emergency Fund',
      title: 'Emergency Fund',
      targetAmount: 5000,
      currentAmount: 2500,
      progress: 50,
      targetDate: '2027-01-01',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches savings goals on mount and normalizes name and title bidirectionally', async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 1,
        goals: [{ _id: 'g1', name: 'Emergency Fund', targetAmount: 5000, currentAmount: 2500, progress: 50, targetDate: '2027-01-01' }],
      },
    });

    const { result } = renderHook(() => useGoals());

    await act(async () => {
      await Promise.resolve();
    });

    expect(axiosClient.get).toHaveBeenCalledWith('/goals');
    expect(result.current.goals).toEqual(mockGoals);
    expect(result.current.goals[0].name).toBe('Emergency Fund');
    expect(result.current.goals[0].title).toBe('Emergency Fund');
    expect(result.current.loading).toBe(false);
  });

  it('creates goal with bidirectional name and title and emits sync event', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');

    axiosClient.get.mockResolvedValueOnce({
      data: { success: true, count: 0, goals: [] },
    });

    const { result } = renderHook(() => useGoals());
    await act(async () => {
      await Promise.resolve();
    });

    const newGoalResponse = { _id: 'g2', name: 'New Laptop', targetAmount: 1200, currentAmount: 0, progress: 0 };
    axiosClient.post.mockResolvedValueOnce({
      data: { success: true, goal: newGoalResponse },
    });

    let res;
    await act(async () => {
      res = await result.current.createGoal({ title: 'New Laptop', targetAmount: 1200 });
    });

    expect(res.success).toBe(true);
    expect(axiosClient.post).toHaveBeenCalledWith('/goals', {
      title: 'New Laptop',
      name: 'New Laptop',
      targetAmount: 1200,
    });
    expect(emitSpy).toHaveBeenCalledWith('goal:created', expect.objectContaining({
      name: 'New Laptop',
      title: 'New Laptop',
    }));
  });

  it('contributes to a goal and emits sync events', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');

    axiosClient.get.mockResolvedValueOnce({
      data: { success: true, count: 1, goals: mockGoals },
    });

    const { result } = renderHook(() => useGoals());
    await act(async () => {
      await Promise.resolve();
    });

    const updatedGoal = { ...mockGoals[0], currentAmount: 3000, progress: 60 };
    const mockTx = { _id: 't99', amount: 500, type: 'Expense' };

    axiosClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        goal: updatedGoal,
        transaction: mockTx,
      },
    });

    let res;
    await act(async () => {
      res = await result.current.contributeGoal('g1', { amount: 500, accountId: 'a1' });
    });

    expect(res.success).toBe(true);
    expect(axiosClient.post).toHaveBeenCalledWith('/goals/g1/contribute', { amount: 500, accountId: 'a1' });
    expect(emitSpy).toHaveBeenCalledWith('goal:contributed', {
      goal: expect.objectContaining({ name: 'Emergency Fund', title: 'Emergency Fund' }),
      transaction: mockTx,
    });
  });
});
