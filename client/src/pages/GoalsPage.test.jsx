import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GoalsPage from './GoalsPage.jsx';

// Mock custom hooks: useGoals, useAuth, useAccounts
const mockCreateGoal = vi.fn();
const mockUpdateGoal = vi.fn();
const mockDeleteGoal = vi.fn();
const mockContributeGoal = vi.fn();

let mockGoalsState = {
  goals: [],
  loading: false,
  error: null,
  createGoal: mockCreateGoal,
  updateGoal: mockUpdateGoal,
  deleteGoal: mockDeleteGoal,
  contributeGoal: mockContributeGoal,
};

vi.mock('../hooks/useGoals.js', () => ({
  useGoals: () => mockGoalsState,
}));

vi.mock('../hooks/useAuth.js', () => ({
  useAuth: () => ({
    user: { name: 'Alex Johnson', currency: '$' },
  }),
}));

vi.mock('../hooks/useAccounts.js', () => ({
  useAccounts: () => ({
    accounts: [{ _id: 'acc1', name: 'Checking Account', balance: 4000, type: 'Bank Account' }],
  }),
}));

describe('GoalsPage Component', () => {
  const sampleGoals = [
    {
      _id: 'g1',
      title: 'Emergency Fund',
      targetAmount: 5000,
      currentAmount: 2500,
      progress: 50,
      targetDate: '2027-01-01',
      isCompleted: false,
    },
    {
      _id: 'g2',
      title: 'Holiday Trip',
      targetAmount: 2000,
      currentAmount: 2000,
      progress: 100,
      targetDate: '2026-12-25',
      isCompleted: true,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGoalsState = {
      goals: [],
      loading: false,
      error: null,
      createGoal: mockCreateGoal,
      updateGoal: mockUpdateGoal,
      deleteGoal: mockDeleteGoal,
      contributeGoal: mockContributeGoal,
    };
  });

  it('renders clean empty state when no goals exist', () => {
    mockGoalsState.goals = [];
    render(<GoalsPage />);

    expect(screen.getByTestId('goals-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No Savings Goals Yet')).toBeInTheDocument();
    expect(screen.getByTestId('empty-create-goal-button')).toBeInTheDocument();
  });

  it('renders overview summary banner metrics with target, saved, and completion rate', () => {
    mockGoalsState.goals = sampleGoals;
    render(<GoalsPage />);

    // Total target = 5000 + 2000 = 7000
    expect(screen.getByTestId('summary-total-target')).toHaveTextContent('$7,000.00');
    // Total saved = 2500 + 2000 = 4500
    expect(screen.getByTestId('summary-total-saved')).toHaveTextContent('$4,500.00');
    // Overall completion rate = (4500 / 7000) * 100 = 64%
    expect(screen.getByTestId('summary-completion-rate')).toHaveTextContent('64%');
    // Status counts: 1 Completed / 1 Active
    expect(screen.getByTestId('summary-goals-status')).toHaveTextContent(/1 Completed \/ 1 Active/i);
  });

  it('renders goal cards in responsive grid', () => {
    mockGoalsState.goals = sampleGoals;
    render(<GoalsPage />);

    expect(screen.getByTestId('goals-grid')).toBeInTheDocument();
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByText('Holiday Trip')).toBeInTheDocument();
  });

  it('opens GoalModal in Create mode when Create Goal button is clicked', () => {
    mockGoalsState.goals = sampleGoals;
    render(<GoalsPage />);

    fireEvent.click(screen.getByTestId('create-goal-cta-button'));

    expect(screen.getByTestId('goal-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Create New Savings Goal/i })).toBeInTheDocument();
  });

  it('opens GoalModal in Contribute mode when quick contribute is clicked on a card', () => {
    mockGoalsState.goals = sampleGoals;
    render(<GoalsPage />);

    const contributeButtons = screen.getAllByTestId('goal-contribute-button');
    fireEvent.click(contributeButtons[0]);

    expect(screen.getByTestId('goal-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Contribute to Emergency Fund/i })).toBeInTheDocument();
    expect(screen.getByTestId('goal-contribution-amount-input')).toBeInTheDocument();
  });

  it('prompts delete confirmation dialog and deletes goal upon confirmation', async () => {
    mockDeleteGoal.mockResolvedValueOnce({ success: true });
    mockGoalsState.goals = sampleGoals;
    render(<GoalsPage />);

    const deleteButtons = screen.getAllByTestId('goal-delete-button');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByTestId('goal-delete-dialog')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to permanently delete/i)).toBeInTheDocument();
    expect(screen.getByText(/"Emergency Fund"/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('confirm-delete-goal-button'));

    await waitFor(() => {
      expect(mockDeleteGoal).toHaveBeenCalledTimes(1);
      expect(mockDeleteGoal).toHaveBeenCalledWith('g1');
    });
  });

  it('cancels delete dialog when cancel button is clicked', () => {
    mockGoalsState.goals = sampleGoals;
    render(<GoalsPage />);

    const deleteButtons = screen.getAllByTestId('goal-delete-button');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByTestId('goal-delete-dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('cancel-delete-goal-button'));
    expect(screen.queryByTestId('goal-delete-dialog')).not.toBeInTheDocument();
    expect(mockDeleteGoal).not.toHaveBeenCalled();
  });
});
