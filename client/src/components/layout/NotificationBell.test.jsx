import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import NotificationBell from './NotificationBell.jsx';
import * as recurringHook from '../../hooks/useRecurring.js';
import * as budgetsHook from '../../hooks/useBudgets.js';

describe('NotificationBell component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders bell icon and no badge when total alerts is 0', () => {
    vi.spyOn(recurringHook, 'useRecurring').mockReturnValue({
      dueItems: [],
      markAsPaid: vi.fn(),
    });
    vi.spyOn(budgetsHook, 'useBudgets').mockReturnValue({
      warnings: [],
    });

    render(<NotificationBell />);

    const bellBtn = screen.getByRole('button', { name: /Notification Center/i });
    expect(bellBtn).toBeInTheDocument();
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
  });

  it('renders badge counter with sum of due recurring and budget alerts', () => {
    vi.spyOn(recurringHook, 'useRecurring').mockReturnValue({
      dueItems: [
        { _id: 'r1', title: 'Netflix Subscription', amount: 15.99, nextDueDate: '2026-11-20' },
      ],
      markAsPaid: vi.fn(),
    });
    vi.spyOn(budgetsHook, 'useBudgets').mockReturnValue({
      warnings: [
        { type: 'category', categoryName: 'Dining', status: '90%', percentage: 92, warning: 'Warning: 92% Dining used' },
        { type: 'overall', label: 'Overall Budget', status: 'exceeded', percentage: 110, warning: 'Budget exceeded by $50' },
      ],
    });

    render(<NotificationBell />);

    const badge = screen.getByTestId('notification-badge');
    expect(badge).toBeInTheDocument();
    // 1 recurring + 2 budget warnings = 3
    expect(badge).toHaveTextContent('3');
  });

  it('displays empty state message when clicked and no alerts exist', () => {
    vi.spyOn(recurringHook, 'useRecurring').mockReturnValue({
      dueItems: [],
      markAsPaid: vi.fn(),
    });
    vi.spyOn(budgetsHook, 'useBudgets').mockReturnValue({
      warnings: [],
    });

    render(<NotificationBell />);

    // Click to open dropdown
    fireEvent.click(screen.getByRole('button', { name: /Notification Center/i }));

    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();
    expect(
      screen.getByText('All caught up! No pending payments or budget alerts')
    ).toBeInTheDocument();
  });

  it('displays budget warnings with correct color thresholds (50% yellow, 90% orange, 100%+ red)', () => {
    vi.spyOn(recurringHook, 'useRecurring').mockReturnValue({
      dueItems: [],
      markAsPaid: vi.fn(),
    });
    vi.spyOn(budgetsHook, 'useBudgets').mockReturnValue({
      warnings: [
        {
          type: 'category',
          categoryName: 'Groceries',
          status: '50%',
          percentage: 55,
          spent: 110,
          limit: 200,
          warning: 'You have reached 55% of your Groceries budget',
        },
        {
          type: 'category',
          categoryName: 'Entertainment',
          status: '90%',
          percentage: 91,
          spent: 182,
          limit: 200,
          warning: 'Warning: You have used 91% of your Entertainment budget',
        },
        {
          type: 'overall',
          label: 'Overall Budget',
          status: 'exceeded',
          percentage: 105,
          spent: 1050,
          limit: 1000,
          warning: 'Budget exceeded by $50.00!',
        },
      ],
    });

    render(<NotificationBell />);

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /Notification Center/i }));

    const warningItems = screen.getAllByTestId('budget-warning-item');
    expect(warningItems).toHaveLength(3);

    // 50% notice - contains yellow classes
    expect(warningItems[0].className).toContain('bg-yellow-50');
    expect(screen.getByText('50% Notice')).toBeInTheDocument();

    // 90% warning - contains orange classes
    expect(warningItems[1].className).toContain('bg-orange-50');
    expect(screen.getByText('90% Warning')).toBeInTheDocument();

    // 100%+ limit - contains red classes
    expect(warningItems[2].className).toContain('bg-red-50');
    expect(screen.getByText('100%+ Limit')).toBeInTheDocument();
  });

  it('displays due recurring items and triggers markAsPaid on 1-click button', async () => {
    const mockMarkAsPaid = vi.fn().mockResolvedValue({ success: true });
    vi.spyOn(recurringHook, 'useRecurring').mockReturnValue({
      dueItems: [
        {
          _id: 'rec-123',
          title: 'Gym Membership',
          amount: 45.0,
          nextDueDate: '2026-11-20T00:00:00.000Z',
          categoryId: { name: 'Fitness' },
        },
      ],
      markAsPaid: mockMarkAsPaid,
    });
    vi.spyOn(budgetsHook, 'useBudgets').mockReturnValue({
      warnings: [],
    });

    render(<NotificationBell />);

    // Open dropdown
    fireEvent.click(screen.getByRole('button', { name: /Notification Center/i }));

    expect(screen.getByText('Gym Membership')).toBeInTheDocument();
    expect(screen.getByText('$45.00')).toBeInTheDocument();
    expect(screen.getByText('Fitness')).toBeInTheDocument();

    const markPaidBtn = screen.getByRole('button', { name: /Mark Gym Membership as paid/i });
    expect(markPaidBtn).toBeInTheDocument();

    // Click "Mark as Paid" and wait for async completion
    await act(async () => {
      fireEvent.click(markPaidBtn);
    });

    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    expect(mockMarkAsPaid).toHaveBeenCalledWith('rec-123');
  });

  it('closes dropdown when escape key is pressed', () => {
    vi.spyOn(recurringHook, 'useRecurring').mockReturnValue({
      dueItems: [],
      markAsPaid: vi.fn(),
    });
    vi.spyOn(budgetsHook, 'useBudgets').mockReturnValue({
      warnings: [],
    });

    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: /Notification Center/i }));
    expect(screen.getByTestId('notification-dropdown')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('notification-dropdown')).not.toBeInTheDocument();
  });
});
