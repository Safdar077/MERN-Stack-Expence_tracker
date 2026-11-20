import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAccounts } from './useAccounts.js';
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

describe('useAccounts hook', () => {
  const mockAccounts = [
    { _id: 'a1', name: 'Cash', type: 'Cash', balance: 150, isDefault: true },
    { _id: 'a2', name: 'Main Bank', type: 'Bank Account', balance: 2500, isDefault: false },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches accounts and total balance on mount', async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 2,
        totalBalance: 2650,
        accounts: mockAccounts,
      },
    });

    const { result } = renderHook(() => useAccounts());

    await act(async () => {
      await Promise.resolve();
    });

    expect(axiosClient.get).toHaveBeenCalledWith('/accounts');
    expect(result.current.accounts).toEqual(mockAccounts);
    expect(result.current.totalBalance).toBe(2650);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('creates an account, emits sync event, and re-fetches list', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');

    // 1st get (initial mount)
    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 0,
        totalBalance: 0,
        accounts: [],
      },
    });

    const { result } = renderHook(() => useAccounts());
    await act(async () => {
      await Promise.resolve();
    });

    const newAcc = { _id: 'a3', name: 'Savings', type: 'Savings', balance: 500 };
    axiosClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        account: newAcc,
      },
    });

    // 2nd get (refetch)
    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 1,
        totalBalance: 500,
        accounts: [newAcc],
      },
    });

    let res;
    await act(async () => {
      res = await result.current.createAccount(newAcc);
    });

    expect(res.success).toBe(true);
    expect(axiosClient.post).toHaveBeenCalledWith('/accounts', newAcc);
    expect(emitSpy).toHaveBeenCalledWith('account:created', newAcc);
    expect(result.current.accounts).toEqual([newAcc]);
    expect(result.current.totalBalance).toBe(500);
  });

  it('updates an account and emits sync event', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');

    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 1,
        totalBalance: 150,
        accounts: [mockAccounts[0]],
      },
    });

    const { result } = renderHook(() => useAccounts());
    await act(async () => {
      await Promise.resolve();
    });

    const updated = { ...mockAccounts[0], balance: 200 };
    axiosClient.put.mockResolvedValueOnce({
      data: {
        success: true,
        account: updated,
      },
    });

    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 1,
        totalBalance: 200,
        accounts: [updated],
      },
    });

    let res;
    await act(async () => {
      res = await result.current.updateAccount('a1', { balance: 200 });
    });

    expect(res.success).toBe(true);
    expect(axiosClient.put).toHaveBeenCalledWith('/accounts/a1', { balance: 200 });
    expect(emitSpy).toHaveBeenCalledWith('account:updated', updated);
  });

  it('deletes an account and emits sync event', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');

    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 1,
        totalBalance: 150,
        accounts: [mockAccounts[0]],
      },
    });

    const { result } = renderHook(() => useAccounts());
    await act(async () => {
      await Promise.resolve();
    });

    axiosClient.delete.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Account removed successfully',
      },
    });

    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 0,
        totalBalance: 0,
        accounts: [],
      },
    });

    let res;
    await act(async () => {
      res = await result.current.deleteAccount('a1');
    });

    expect(res.success).toBe(true);
    expect(axiosClient.delete).toHaveBeenCalledWith('/accounts/a1');
    expect(emitSpy).toHaveBeenCalledWith('account:deleted', { id: 'a1' });
    expect(result.current.accounts).toEqual([]);
    expect(result.current.totalBalance).toBe(0);
  });
});
