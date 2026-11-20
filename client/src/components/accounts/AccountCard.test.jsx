import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AccountCard from './AccountCard.jsx';

describe('AccountCard Component', () => {
  const mockAccount = {
    _id: 'acc1',
    name: 'Chase Checking',
    type: 'Bank Account',
    balance: 2450.75,
    isDefault: false,
  };

  const mockSavingsAccount = {
    _id: 'acc2',
    name: 'Emergency Fund',
    type: 'Savings',
    balance: 10000,
    isDefault: true,
  };

  it('renders account details: name, type, formatted balance, and action buttons', () => {
    const handleEdit = vi.fn();
    const handleDelete = vi.fn();

    render(
      <AccountCard
        account={mockAccount}
        currency="$"
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );

    expect(screen.getByText('Chase Checking')).toBeInTheDocument();
    expect(screen.getByText('Bank Account')).toBeInTheDocument();
    expect(screen.getByText('$2,450.75')).toBeInTheDocument();
    expect(screen.queryByTestId('default-badge')).not.toBeInTheDocument();

    const editBtn = screen.getByRole('button', { name: /edit/i });
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    expect(editBtn).toBeInTheDocument();
    expect(deleteBtn).toBeInTheDocument();
  });

  it('renders default badge when account is marked as default', () => {
    render(
      <AccountCard
        account={mockSavingsAccount}
        currency="$"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const defaultBadge = screen.getByTestId('default-badge');
    expect(defaultBadge).toBeInTheDocument();
    expect(defaultBadge).toHaveTextContent(/default/i);
  });

  it('distinctly highlights Savings accounts with special styling and badge', () => {
    const { container } = render(
      <AccountCard
        account={mockSavingsAccount}
        currency="$"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Should render a savings badge or distinct highlight
    expect(screen.getByTestId('savings-badge')).toBeInTheDocument();
    expect(screen.getByText('$10,000.00')).toBeInTheDocument();

    // Verify card wrapper has savings accent class
    const card = screen.getByTestId('account-card');
    expect(card.className).toContain('emerald');
  });

  it('triggers onEdit callback with account object when Edit button is clicked', () => {
    const handleEdit = vi.fn();
    render(
      <AccountCard
        account={mockAccount}
        currency="$"
        onEdit={handleEdit}
        onDelete={vi.fn()}
      />
    );

    const editBtn = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editBtn);

    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(mockAccount);
  });

  it('triggers onDelete callback with account object when Delete button is clicked', () => {
    const handleDelete = vi.fn();
    render(
      <AccountCard
        account={mockAccount}
        currency="$"
        onEdit={vi.fn()}
        onDelete={handleDelete}
      />
    );

    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);

    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleDelete).toHaveBeenCalledWith(mockAccount);
  });
});
