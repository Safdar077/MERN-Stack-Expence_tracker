import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeleteConfirmModal from './DeleteConfirmModal.jsx';

describe('DeleteConfirmModal Component', () => {
  const mockClose = vi.fn();
  const mockConfirm = vi.fn();

  const sampleTx = {
    _id: 'tx1',
    type: 'Expense',
    amount: 88.5,
    date: '2026-11-20T12:00:00.000Z',
    note: 'Dinner at restaurant',
    categoryId: { _id: 'cat1', name: 'Dining', icon: 'FaUtensils' },
    accountId: { _id: 'acc1', name: 'Credit Card' },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    mockClose.mockClear();
    mockConfirm.mockClear();
  });

  it('renders nothing when isOpen is false or transaction is null', () => {
    const { rerender } = render(
      <DeleteConfirmModal
        isOpen={false}
        onClose={mockClose}
        onConfirm={mockConfirm}
        transaction={sampleTx}
      />
    );
    expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();

    rerender(
      <DeleteConfirmModal
        isOpen={true}
        onClose={mockClose}
        onConfirm={mockConfirm}
        transaction={null}
      />
    );
    expect(screen.queryByTestId('delete-confirm-modal')).not.toBeInTheDocument();
  });

  it('renders modal with transaction summary details and action buttons', () => {
    render(
      <DeleteConfirmModal
        isOpen={true}
        onClose={mockClose}
        onConfirm={mockConfirm}
        transaction={sampleTx}
        currency="USD"
      />
    );

    expect(screen.getByRole('heading', { name: /delete transaction/i })).toBeInTheDocument();
    expect(screen.getByText('Dining')).toBeInTheDocument();
    expect(screen.getAllByText('Credit Card').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Dinner at restaurant')).toBeInTheDocument();
    expect(screen.getByText('-$88.50')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete transaction/i })).toBeInTheDocument();
  });

  it('triggers onConfirm callback when user clicks Delete Transaction button', () => {
    render(
      <DeleteConfirmModal
        isOpen={true}
        onClose={mockClose}
        onConfirm={mockConfirm}
        transaction={sampleTx}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /delete transaction/i });
    fireEvent.click(deleteBtn);

    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when user clicks Cancel or Close (X) button', () => {
    render(
      <DeleteConfirmModal
        isOpen={true}
        onClose={mockClose}
        onConfirm={mockConfirm}
        transaction={sampleTx}
      />
    );

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelBtn);
    expect(mockClose).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeBtn);
    expect(mockClose).toHaveBeenCalledTimes(2);
  });

  it('triggers onClose when backdrop is clicked', () => {
    render(
      <DeleteConfirmModal
        isOpen={true}
        onClose={mockClose}
        onConfirm={mockConfirm}
        transaction={sampleTx}
      />
    );

    const backdrop = screen.getByTestId('delete-confirm-modal');
    fireEvent.click(backdrop);

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when Escape key is pressed', () => {
    render(
      <DeleteConfirmModal
        isOpen={true}
        onClose={mockClose}
        onConfirm={mockConfirm}
        transaction={sampleTx}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('disables buttons, displays spinner, and prevents closing when loading is true', () => {
    render(
      <DeleteConfirmModal
        isOpen={true}
        onClose={mockClose}
        onConfirm={mockConfirm}
        transaction={sampleTx}
        loading={true}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /deleting\.\.\./i });
    expect(deleteBtn).toBeDisabled();

    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    expect(cancelBtn).toBeDisabled();

    // Escape should not trigger close while loading
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockClose).not.toHaveBeenCalled();

    // Backdrop click should not trigger close while loading
    const backdrop = screen.getByTestId('delete-confirm-modal');
    fireEvent.click(backdrop);
    expect(mockClose).not.toHaveBeenCalled();
  });
});
