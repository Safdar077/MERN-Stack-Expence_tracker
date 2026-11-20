import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Navbar from './Navbar.jsx';
import * as authHook from '../../hooks/useAuth.js';
import * as recurringHook from '../../hooks/useRecurring.js';
import * as budgetsHook from '../../hooks/useBudgets.js';

describe('Navbar component', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { name: 'Sarah Connor', email: 'sarah@example.com', currency: 'USD' },
      logout: mockLogout,
    });
    vi.spyOn(recurringHook, 'useRecurring').mockReturnValue({
      dueItems: [],
      markAsPaid: vi.fn(),
    });
    vi.spyOn(budgetsHook, 'useBudgets').mockReturnValue({
      warnings: [],
    });
  });

  it('renders user information, currency badge, and notification bell', () => {
    render(<Navbar onToggleSidebar={vi.fn()} />);

    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Notification Center/i })).toBeInTheDocument();
  });

  it('triggers onToggleSidebar when mobile hamburger button is clicked', () => {
    const mockToggle = vi.fn();
    render(<Navbar onToggleSidebar={mockToggle} />);

    const toggleBtn = screen.getByTestId('sidebar-toggle-btn');
    fireEvent.click(toggleBtn);

    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it('calls logout when logout button is clicked', () => {
    render(<Navbar onToggleSidebar={vi.fn()} />);

    const logoutBtn = screen.getByTestId('logout-button');
    fireEvent.click(logoutBtn);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
