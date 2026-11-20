import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTransactions } from './useTransactions.js';
import axiosClient from '../api/axiosClient.js';
import * as eventBus from '../utils/eventBus.js';

// Mock axiosClient
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

describe('useTransactions hook', () => {
  const mockTransactions = [
    {
      _id: 't1',
      amount: 45.5,
      type: 'Expense',
      categoryId: { _id: 'c1', name: 'Food' },
      accountId: { _id: 'a1', name: 'Cash' },
      date: '2026-11-20T10:00:00Z',
      note: 'Lunch at cafe',
    },
    {
      _id: 't2',
      amount: 2500,
      type: 'Income',
      categoryId: { _id: 'c2', name: 'Salary' },
      accountId: { _id: 'a2', name: 'Main Bank' },
      date: '2026-11-01T10:00:00Z',
      note: 'Monthly salary',
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('fetches transactions on initial mount and sets state', async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 2,
        total: 10,
        page: 1,
        pages: 5,
        transactions: mockTransactions,
      },
    });

    const { result } = renderHook(() => useTransactions());

    // Wait for initial fetch
    await act(async () => {
      await Promise.resolve();
    });

    expect(axiosClient.get).toHaveBeenCalledWith('/transactions', {
      params: expect.any(Object),
    });
    expect(result.current.transactions).toEqual(mockTransactions);
    expect(result.current.totalCount).toBe(10);
    expect(result.current.page).toBe(1);
    expect(result.current.totalPages).toBe(5);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('adds transaction, emits sync event, and re-fetches list', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');

    // 1st get: initial fetch
    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 0,
        total: 0,
        page: 1,
        pages: 1,
        transactions: [],
      },
    });

    const { result } = renderHook(() => useTransactions());
    await act(async () => {
      await Promise.resolve();
    });

    const newTx = {
      _id: 't3',
      amount: 15,
      type: 'Expense',
      categoryId: 'c1',
      accountId: 'a1',
      note: 'Coffee',
    };

    // Mock post response
    axiosClient.post.mockResolvedValueOnce({
      data: {
        success: true,
        transaction: newTx,
      },
    });

    // Mock subsequent get refetch response
    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 1,
        total: 1,
        page: 1,
        pages: 1,
        transactions: [newTx],
      },
    });

    let addResult;
    await act(async () => {
      addResult = await result.current.addTransaction(newTx);
    });

    expect(addResult.success).toBe(true);
    expect(axiosClient.post).toHaveBeenCalledWith('/transactions', newTx);
    expect(emitSpy).toHaveBeenCalledWith('transaction:created', newTx);
  });

  it('edits transaction, emits sync event, and updates state', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');

    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 1,
        total: 1,
        page: 1,
        pages: 1,
        transactions: [mockTransactions[0]],
      },
    });

    const { result } = renderHook(() => useTransactions());
    await act(async () => {
      await Promise.resolve();
    });

    const updatedTx = { ...mockTransactions[0], amount: 50 };
    axiosClient.put.mockResolvedValueOnce({
      data: {
        success: true,
        transaction: updatedTx,
      },
    });

    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 1,
        total: 1,
        page: 1,
        pages: 1,
        transactions: [updatedTx],
      },
    });

    let editResult;
    await act(async () => {
      editResult = await result.current.editTransaction('t1', { amount: 50 });
    });

    expect(editResult.success).toBe(true);
    expect(axiosClient.put).toHaveBeenCalledWith('/transactions/t1', { amount: 50 });
    expect(emitSpy).toHaveBeenCalledWith('transaction:updated', updatedTx);
  });

  it('deletes transaction and emits sync event', async () => {
    const emitSpy = vi.spyOn(eventBus, 'emitSync');

    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 1,
        total: 1,
        page: 1,
        pages: 1,
        transactions: [mockTransactions[0]],
      },
    });

    const { result } = renderHook(() => useTransactions());
    await act(async () => {
      await Promise.resolve();
    });

    axiosClient.delete.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Transaction deleted successfully',
      },
    });

    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 0,
        total: 0,
        page: 1,
        pages: 1,
        transactions: [],
      },
    });

    let deleteResult;
    await act(async () => {
      deleteResult = await result.current.deleteTransaction('t1');
    });

    expect(deleteResult.success).toBe(true);
    expect(axiosClient.delete).toHaveBeenCalledWith('/transactions/t1');
    expect(emitSpy).toHaveBeenCalledWith('transaction:deleted', { id: 't1' });
  });

  it('calls exportCSV to download CSV export', async () => {
    const blobData = new Blob(['Date,Type,Amount\n2026-11-20,Expense,45.5'], { type: 'text/csv' });
    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 0,
        total: 0,
        page: 1,
        pages: 1,
        transactions: [],
      },
    });

    const { result } = renderHook(() => useTransactions());
    await act(async () => {
      await Promise.resolve();
    });

    axiosClient.get.mockResolvedValueOnce({
      data: blobData,
    });

    let exportResult;
    await act(async () => {
      exportResult = await result.current.exportCSV({ type: 'Expense' });
    });

    expect(exportResult.success).toBe(true);
    expect(axiosClient.get).toHaveBeenCalledWith('/transactions/export', expect.objectContaining({
      params: expect.objectContaining({ type: 'Expense' }),
      responseType: 'blob',
    }));
  });

  it('automatically refetches transactions when onSync receives an event', async () => {
    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 1,
        total: 1,
        page: 1,
        pages: 1,
        transactions: [mockTransactions[0]],
      },
    });

    renderHook(() => useTransactions());
    await act(async () => {
      await Promise.resolve();
    });

    expect(axiosClient.get).toHaveBeenCalledTimes(1);

    // Mock refetch response
    axiosClient.get.mockResolvedValueOnce({
      data: {
        success: true,
        count: 2,
        total: 2,
        page: 1,
        pages: 1,
        transactions: mockTransactions,
      },
    });

    // Trigger sync event through eventBus
    await act(async () => {
      eventBus.emitSync('transaction:created', mockTransactions[1]);
      await Promise.resolve();
    });

    expect(axiosClient.get).toHaveBeenCalledTimes(2);
  });

  it('persists active page across sync refetches', async () => {
    // 1. Initial mount fetches page 1
    axiosClient.get.mockResolvedValueOnce({
      data: { success: true, count: 10, total: 30, page: 1, pages: 3, transactions: [] },
    });

    const { result } = renderHook(() => useTransactions({ page: 1 }));
    await act(async () => {
      await Promise.resolve();
    });

    // 2. User changes to page 2
    axiosClient.get.mockResolvedValueOnce({
      data: { success: true, count: 10, total: 30, page: 2, pages: 3, transactions: [] },
    });

    await act(async () => {
      await result.current.fetchTransactions({ page: 2 });
    });

    expect(result.current.page).toBe(2);

    // 3. A sync event fires (e.g., from another hook or component)
    axiosClient.get.mockResolvedValueOnce({
      data: { success: true, count: 10, total: 31, page: 2, pages: 4, transactions: [] },
    });

    await act(async () => {
      eventBus.emitSync('transaction:created', { _id: 'new' });
      await Promise.resolve();
    });

    // Verify the sync refetch requested page: 2, not page: 1
    expect(axiosClient.get).toHaveBeenLastCalledWith('/transactions', {
      params: expect.objectContaining({ page: 2 }),
    });
    expect(result.current.page).toBe(2);
  });
});
