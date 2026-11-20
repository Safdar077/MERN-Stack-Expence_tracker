import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountModal from './AccountModal.jsx';

describe('AccountModal Component', () => {
  const mockCreateAccount = vi.fn();
  const mockUpdateAccount = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render anything when isOpen is false', () => {
    render(
      <AccountModal
        isOpen={false}
        onClose={mockOnClose}
        createAccount={mockCreateAccount}
        updateAccount={mockUpdateAccount}
      />
    );

    expect(screen.queryByTestId('account-modal')).not.toBeInTheDocument();
  });

  it('renders modal in Add mode with default empty fields', () => {
    render(
      <AccountModal
        isOpen={true}
        onClose={mockOnClose}
        initialData={null}
        createAccount={mockCreateAccount}
        updateAccount={mockUpdateAccount}
      />
    );

    expect(screen.getByTestId('account-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /add account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/account name/i)).toHaveValue('');
    expect(screen.getByLabelText(/account type/i)).toHaveValue('Bank Account');
    expect(screen.getByLabelText(/balance/i)).toHaveValue(0);
    expect(screen.getByLabelText(/default account/i)).not.toBeChecked();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('renders modal in Edit mode prepopulated with existing account data', () => {
    const existingAccount = {
      _id: 'acc123',
      name: 'Amex Gold',
      type: 'Credit Card',
      balance: -450.5,
      isDefault: true,
    };

    render(
      <AccountModal
        isOpen={true}
        onClose={mockOnClose}
        initialData={existingAccount}
        createAccount={mockCreateAccount}
        updateAccount={mockUpdateAccount}
      />
    );

    expect(screen.getByRole('heading', { name: /edit account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/account name/i)).toHaveValue('Amex Gold');
    expect(screen.getByLabelText(/account type/i)).toHaveValue('Credit Card');
    expect(screen.getByLabelText(/balance/i)).toHaveValue(-450.5);
    expect(screen.getByLabelText(/default account/i)).toBeChecked();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
  });

  it('validates empty account name before submitting', async () => {
    render(
      <AccountModal
        isOpen={true}
        onClose={mockOnClose}
        createAccount={mockCreateAccount}
        updateAccount={mockUpdateAccount}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/account name is required/i)).toBeInTheDocument();
    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  it('submits new account successfully and calls onSuccess and onClose', async () => {
    mockCreateAccount.mockResolvedValueOnce({ success: true, account: { _id: 'new1' } });

    render(
      <AccountModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        createAccount={mockCreateAccount}
        updateAccount={mockUpdateAccount}
      />
    );

    fireEvent.change(screen.getByLabelText(/account name/i), {
      target: { value: 'Main Savings' },
    });
    fireEvent.change(screen.getByLabelText(/account type/i), {
      target: { value: 'Savings' },
    });
    fireEvent.change(screen.getByLabelText(/balance/i), {
      target: { value: '5000' },
    });
    fireEvent.click(screen.getByLabelText(/default account/i));

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockCreateAccount).toHaveBeenCalledWith({
        name: 'Main Savings',
        type: 'Savings',
        balance: 5000,
        isDefault: true,
      });
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('updates existing account successfully and calls onSuccess and onClose', async () => {
    const existingAccount = {
      _id: 'acc999',
      name: 'Cash Pocket',
      type: 'Cash',
      balance: 100,
      isDefault: false,
    };
    mockUpdateAccount.mockResolvedValueOnce({ success: true, account: existingAccount });

    render(
      <AccountModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        initialData={existingAccount}
        createAccount={mockCreateAccount}
        updateAccount={mockUpdateAccount}
      />
    );

    fireEvent.change(screen.getByLabelText(/account name/i), {
      target: { value: 'Cash Stash' },
    });
    fireEvent.change(screen.getByLabelText(/balance/i), {
      target: { value: '250' },
    });

    const submitBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockUpdateAccount).toHaveBeenCalledWith('acc999', {
        name: 'Cash Stash',
        type: 'Cash',
        balance: 250,
        isDefault: false,
      });
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('displays error message when submission fails', async () => {
    mockCreateAccount.mockResolvedValueOnce({
      success: false,
      error: 'An account with this name already exists.',
    });

    render(
      <AccountModal
        isOpen={true}
        onClose={mockOnClose}
        createAccount={mockCreateAccount}
        updateAccount={mockUpdateAccount}
      />
    );

    fireEvent.change(screen.getByLabelText(/account name/i), {
      target: { value: 'Duplicate Bank' },
    });

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitBtn);

    expect(
      await screen.findByText('An account with this name already exists.')
    ).toBeInTheDocument();
  });

  it('closes on Escape key press', () => {
    render(
      <AccountModal
        isOpen={true}
        onClose={mockOnClose}
        createAccount={mockCreateAccount}
        updateAccount={mockUpdateAccount}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
