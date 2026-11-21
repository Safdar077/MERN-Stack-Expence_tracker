import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GoalCard from './GoalCard.jsx';

describe('GoalCard Component', () => {
  const inProgressGoal = {
    _id: 'g1',
    title: 'Emergency Fund',
    targetAmount: 5000,
    currentAmount: 2500,
    progress: 50,
    targetDate: '2027-06-30T00:00:00.000Z',
    isCompleted: false,
  };

  const completedGoal = {
    _id: 'g2',
    name: 'Vacation to Japan',
    targetAmount: 3000,
    currentAmount: 3000,
    progress: 100,
    targetDate: '2026-12-31T00:00:00.000Z',
    isCompleted: true,
  };

  it('renders in-progress goal details with amounts, date, progress bar, and status badge', () => {
    render(
      <GoalCard
        goal={inProgressGoal}
        currency="$"
        onContribute={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Goal title and target date
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument();
    expect(screen.getByText(/Target: Jun 30, 2027/i)).toBeInTheDocument();

    // Financial amounts
    expect(screen.getByTestId('goal-current-amount')).toHaveTextContent('$2,500.00');
    expect(screen.getByTestId('goal-target-amount')).toHaveTextContent('$5,000.00');

    // Progress percentage
    expect(screen.getByTestId('goal-progress-text')).toHaveTextContent('50%');
    expect(screen.getByTestId('goal-progress-bar')).toHaveStyle({ width: '50%' });

    // Status badge
    const badge = screen.getByTestId('goal-status-badge');
    expect(badge).toHaveTextContent(/In Progress/i);

    // Remaining text
    expect(screen.getByText('$2,500.00 remaining')).toBeInTheDocument();
  });

  it('renders completed status when goal is completed or current >= target', () => {
    render(
      <GoalCard
        goal={completedGoal}
        currency="$"
        onContribute={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Vacation to Japan')).toBeInTheDocument();
    expect(screen.getByTestId('goal-progress-text')).toHaveTextContent('100%');
    expect(screen.getByTestId('goal-status-badge')).toHaveTextContent(/Completed/i);
    expect(screen.getByText('Goal Achieved!')).toBeInTheDocument();
  });

  it('triggers onContribute callback with goal object when quick contribute button is clicked', () => {
    const handleContribute = vi.fn();
    render(
      <GoalCard
        goal={inProgressGoal}
        onContribute={handleContribute}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    const contributeBtn = screen.getByTestId('goal-contribute-button');
    fireEvent.click(contributeBtn);

    expect(handleContribute).toHaveBeenCalledTimes(1);
    expect(handleContribute).toHaveBeenCalledWith(inProgressGoal);
  });

  it('triggers onEdit callback with goal object when edit button is clicked', () => {
    const handleEdit = vi.fn();
    render(
      <GoalCard
        goal={inProgressGoal}
        onContribute={vi.fn()}
        onEdit={handleEdit}
        onDelete={vi.fn()}
      />
    );

    const editBtn = screen.getByTestId('goal-edit-button');
    fireEvent.click(editBtn);

    expect(handleEdit).toHaveBeenCalledTimes(1);
    expect(handleEdit).toHaveBeenCalledWith(inProgressGoal);
  });

  it('triggers onDelete callback with goal object when delete button is clicked', () => {
    const handleDelete = vi.fn();
    render(
      <GoalCard
        goal={inProgressGoal}
        onContribute={vi.fn()}
        onEdit={vi.fn()}
        onDelete={handleDelete}
      />
    );

    const deleteBtn = screen.getByTestId('goal-delete-button');
    fireEvent.click(deleteBtn);

    expect(handleDelete).toHaveBeenCalledTimes(1);
    expect(handleDelete).toHaveBeenCalledWith(inProgressGoal);
  });

  it('renders nothing safely if goal is null or undefined', () => {
    const { container } = render(<GoalCard goal={null} />);
    expect(container.firstChild).toBeNull();
  });
});
