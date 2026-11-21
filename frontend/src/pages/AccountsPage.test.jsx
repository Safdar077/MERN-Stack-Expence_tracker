import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountsPage from './AccountsPage.jsx';
import * as accountsHook from '../hooks/useAccounts.js';
import * as authHook from '../hooks/useAuth.js';

describe('AccountsPage Component', () => {
  const mockAccounts = [
    {
      _id: 'acc1',
      name: 'Chase Checking',
      type: 'Bank Account',
      balance: 1500,
      isDefault: true,
    },
    {
      _id: 'acc2',
      name: 'Emergency Savings',
      type: 'Savings',
      balance: 5000,
      isDefault: false,
    },
    {
      _id: 'acc3',
      name: 'Pocket Cash',
      type: 'Cash',
      balance: 150,
      isDefault: false,
    },
  ];

  const mockDeleteAccount = vi.fn();
  const mockFetchAccounts = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { name: 'Alex Johnson', currency: 'USD' },
    });

    vi.spyOn(accountsHook, 'useAccounts').mockReturnValue({
      accounts: mockAccounts,
      totalBalance: 6650,
      loading: false,
      error: null,
      fetchAccounts: mockFetchAccounts,
      createAccount: vi.fn().mockResolvedValue({ success: true }),
      updateAccount: vi.fn().mockResolvedValue({ success: true }),
      deleteAccount: mockDeleteAccount,
    });
  });

  it('renders top summary banner with combined total net worth and account count', () => {
    render(<AccountsPage />);

    expect(screen.getByTestId('accounts-page')).toBeInTheDocument();
    expect(screen.getByText('Total Net Worth')).toBeInTheDocument();
    expect(screen.getByText('$6,650.00')).toBeInTheDocument();
    expect(screen.getByText(/3 Active Accounts/i)).toBeInTheDocument();
  });

  it('renders grid of accounts with AccountCards', () => {
    render(<AccountsPage />);

    expect(screen.getByText('Chase Checking')).toBeInTheDocument();
    expect(screen.getByText('Emergency Savings')).toBeInTheDocument();
    expect(screen.getByText('Pocket Cash')).toBeInTheDocument();

    const cards = screen.getAllByTestId('account-card');
    expect(cards).toHaveLength(3);
  });

  it('opens AccountModal in Add mode when Add Account CTA is clicked', () => {
    render(<AccountsPage />);

    const addBtn = screen.getByTestId('add-account-btn');
    fireEvent.click(addBtn);

    expect(screen.getByTestId('account-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /add account/i })).toBeInTheDocument();
  });

  it('opens AccountModal in Edit mode when Edit button on an AccountCard is clicked', () => {
    render(<AccountsPage />);

    const editBtns = screen.getAllByTestId('edit-account-btn');
    fireEvent.click(editBtns[0]); // Chase Checking

    expect(screen.getByTestId('account-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /edit account/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Chase Checking')).toBeInTheDocument();
  });

  it('opens delete confirmation dialog and executes deleteAccount on confirmation', async () => {
    mockDeleteAccount.mockResolvedValueOnce({ success: true });

    render(<AccountsPage />);

    const deleteBtns = screen.getAllByTestId('delete-account-btn');
    fireEvent.click(deleteBtns[1]); // Emergency Savings

    const deleteModal = screen.getByTestId('account-delete-modal');
    expect(deleteModal).toBeInTheDocument();
    expect(
      screen.getByText(/are you sure you want to delete/i)
    ).toBeInTheDocument();
    expect(deleteModal).toHaveTextContent('Emergency Savings');

    const confirmBtn = screen.getByTestId('confirm-delete-account-btn');
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalledWith('acc2');
    });
  });

  it('renders clean empty state when no accounts exist', () => {
    vi.spyOn(accountsHook, 'useAccounts').mockReturnValue({
      accounts: [],
      totalBalance: 0,
      loading: false,
      error: null,
      fetchAccounts: mockFetchAccounts,
      createAccount: vi.fn(),
      updateAccount: vi.fn(),
      deleteAccount: mockDeleteAccount,
    });

    render(<AccountsPage />);

    expect(screen.getByTestId('empty-accounts-state')).toBeInTheDocument();
    expect(screen.getByText(/no accounts added yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add your first account/i })).toBeInTheDocument();
  });
});
