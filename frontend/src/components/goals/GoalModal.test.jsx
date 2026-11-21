import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GoalModal from './GoalModal.jsx';

// Mock useAccounts hook so it returns sample accounts
vi.mock('../../hooks/useAccounts.js', () => ({
  useAccounts: () => ({
    accounts: [
      { _id: 'acc1', name: 'Primary Checking', balance: 2500, type: 'Bank Account' },
      { _id: 'acc2', name: 'Cash Wallet', balance: 350, type: 'Cash' },
    ],
    loading: false,
    error: null,
  }),
}));

describe('GoalModal Component', () => {
  const mockGoal = {
    _id: 'g1',
    title: 'New Car Down Payment',
    targetAmount: 8000,
    currentAmount: 2000,
    progress: 25,
    targetDate: '2027-12-31T00:00:00.000Z',
  };

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    createGoal: vi.fn(),
    updateGoal: vi.fn(),
    contributeGoal: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<GoalModal {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders in Create mode by default with empty fields', () => {
    render(<GoalModal {...defaultProps} mode="create" />);

    expect(screen.getByRole('heading', { name: /Create New Savings Goal/i })).toBeInTheDocument();
    expect(screen.getByTestId('goal-title-input')).toHaveValue('');
    expect(screen.getByTestId('goal-target-amount-input')).toHaveValue(null);
    expect(screen.getByTestId('goal-current-amount-input')).toHaveValue(0);
    expect(screen.getByTestId('goal-modal-submit-button')).toHaveTextContent(/Create Goal/i);
  });

  it('validates required fields in Create mode', async () => {
    render(<GoalModal {...defaultProps} mode="create" />);

    const submitBtn = screen.getByTestId('goal-modal-submit-button');
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Goal name or title is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/Target amount must be a number greater than 0/i)).toBeInTheDocument();
    expect(defaultProps.createGoal).not.toHaveBeenCalled();
  });

  it('submits valid new goal in Create mode', async () => {
    const createGoalMock = vi.fn().mockResolvedValue({
      success: true,
      goal: { _id: 'g2', title: 'Vacation', targetAmount: 3000, currentAmount: 0 },
    });
    const onSuccessMock = vi.fn();

    render(
      <GoalModal
        {...defaultProps}
        mode="create"
        createGoal={createGoalMock}
        onSuccess={onSuccessMock}
      />
    );

    fireEvent.change(screen.getByTestId('goal-title-input'), {
      target: { value: 'Vacation' },
    });
    fireEvent.change(screen.getByTestId('goal-target-amount-input'), {
      target: { value: '3000' },
    });
    fireEvent.change(screen.getByTestId('goal-current-amount-input'), {
      target: { value: '150' },
    });
    fireEvent.change(screen.getByTestId('goal-target-date-input'), {
      target: { value: '2027-08-15' },
    });

    fireEvent.click(screen.getByTestId('goal-modal-submit-button'));

    await waitFor(() => {
      expect(createGoalMock).toHaveBeenCalledTimes(1);
      expect(createGoalMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Vacation',
          name: 'Vacation',
          targetAmount: 3000,
          currentAmount: 150,
          targetDate: '2027-08-15',
        })
      );
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('renders in Edit mode with prefilled values and updates goal', async () => {
    const updateGoalMock = vi.fn().mockResolvedValue({
      success: true,
      goal: { ...mockGoal, title: 'Updated Car Goal' },
    });

    render(
      <GoalModal
        {...defaultProps}
        mode="edit"
        goal={mockGoal}
        updateGoal={updateGoalMock}
      />
    );

    expect(screen.getByRole('heading', { name: /Edit Savings Goal/i })).toBeInTheDocument();
    expect(screen.getByTestId('goal-title-input')).toHaveValue('New Car Down Payment');
    expect(screen.getByTestId('goal-target-amount-input')).toHaveValue(8000);
    expect(screen.getByTestId('goal-current-amount-input')).toHaveValue(2000);
    expect(screen.getByTestId('goal-target-date-input')).toHaveValue('2027-12-31');

    fireEvent.change(screen.getByTestId('goal-title-input'), {
      target: { value: 'Updated Car Goal' },
    });

    fireEvent.click(screen.getByTestId('goal-modal-submit-button'));

    await waitFor(() => {
      expect(updateGoalMock).toHaveBeenCalledTimes(1);
      expect(updateGoalMock).toHaveBeenCalledWith(
        'g1',
        expect.objectContaining({
          title: 'Updated Car Goal',
          targetAmount: 8000,
          currentAmount: 2000,
        })
      );
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('renders in Contribute mode with target status, amount input, and source account dropdown', () => {
    render(
      <GoalModal
        {...defaultProps}
        mode="contribute"
        goal={mockGoal}
      />
    );

    expect(screen.getByRole('heading', { name: /Contribute to New Car Down Payment/i })).toBeInTheDocument();
    expect(screen.getByText(/Target: \$8,000.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Currently Saved: \$2,000.00/i)).toBeInTheDocument();
    expect(screen.getByText(/25% completed/i)).toBeInTheDocument();

    expect(screen.getByTestId('goal-contribution-amount-input')).toBeInTheDocument();
    expect(screen.getByTestId('goal-source-account-select')).toBeInTheDocument();
    expect(screen.getByText(/Primary Checking — \$2,500.00 \(Bank Account\)/i)).toBeInTheDocument();
    expect(screen.getByTestId('goal-modal-submit-button')).toHaveTextContent(/Add Contribution/i);
  });

  it('validates contribution amount and prevents submission if invalid', async () => {
    render(
      <GoalModal
        {...defaultProps}
        mode="contribute"
        goal={mockGoal}
      />
    );

    fireEvent.click(screen.getByTestId('goal-modal-submit-button'));

    expect(await screen.findByText(/Contribution amount must be greater than 0/i)).toBeInTheDocument();
    expect(defaultProps.contributeGoal).not.toHaveBeenCalled();
  });

  it('submits contribution calling contributeGoal with amount and accountId', async () => {
    const contributeGoalMock = vi.fn().mockResolvedValue({
      success: true,
      goal: { ...mockGoal, currentAmount: 2500, progress: 31.25 },
      transaction: { _id: 'tx1', amount: 500 },
    });
    const onSuccessMock = vi.fn();

    render(
      <GoalModal
        {...defaultProps}
        mode="contribute"
        goal={mockGoal}
        contributeGoal={contributeGoalMock}
        onSuccess={onSuccessMock}
      />
    );

    fireEvent.change(screen.getByTestId('goal-contribution-amount-input'), {
      target: { value: '500' },
    });
    fireEvent.change(screen.getByTestId('goal-source-account-select'), {
      target: { value: 'acc1' },
    });

    fireEvent.click(screen.getByTestId('goal-modal-submit-button'));

    await waitFor(() => {
      expect(contributeGoalMock).toHaveBeenCalledTimes(1);
      expect(contributeGoalMock).toHaveBeenCalledWith('g1', 500, 'acc1');
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('displays server error message when API call fails', async () => {
    const createGoalMock = vi.fn().mockResolvedValue({
      success: false,
      error: 'Goal with this title already exists',
    });

    render(
      <GoalModal
        {...defaultProps}
        mode="create"
        createGoal={createGoalMock}
      />
    );

    fireEvent.change(screen.getByTestId('goal-title-input'), {
      target: { value: 'Duplicate Goal' },
    });
    fireEvent.change(screen.getByTestId('goal-target-amount-input'), {
      target: { value: '1000' },
    });

    fireEvent.click(screen.getByTestId('goal-modal-submit-button'));

    expect(await screen.findByTestId('goal-modal-error')).toHaveTextContent(
      'Goal with this title already exists'
    );
  });

  it('closes on Escape key and backdrop click', () => {
    render(<GoalModal {...defaultProps} mode="create" />);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('goal-modal'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(2);
  });
});
