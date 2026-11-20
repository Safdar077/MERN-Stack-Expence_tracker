import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout.jsx';
import * as authHook from '../../hooks/useAuth.js';
import * as recurringHook from '../../hooks/useRecurring.js';
import * as budgetsHook from '../../hooks/useBudgets.js';

describe('Layout component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: { name: 'Alex Johnson', email: 'alex@example.com', currency: 'EUR' },
      logout: vi.fn(),
    });
    vi.spyOn(recurringHook, 'useRecurring').mockReturnValue({
      dueItems: [],
      markAsPaid: vi.fn(),
    });
    vi.spyOn(budgetsHook, 'useBudgets').mockReturnValue({
      warnings: [],
    });
  });

  it('renders desktop sidebar, navbar, and nested child route via Outlet', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<div data-testid="test-child">Dashboard Child Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Notification Center/i })).toBeInTheDocument();
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Child Content')).toBeInTheDocument();
  });

  it('toggles mobile drawer when hamburger button is clicked', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<div>Child Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    // Initially mobile drawer is not open
    expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();

    // Click hamburger toggle button in Navbar
    const toggleBtn = screen.getByTestId('sidebar-toggle-btn');
    fireEvent.click(toggleBtn);

    // Now mobile drawer should be in document
    expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();

    // Close mobile drawer by clicking backdrop
    fireEvent.click(screen.getByTestId('mobile-backdrop'));
    expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();
  });
});
