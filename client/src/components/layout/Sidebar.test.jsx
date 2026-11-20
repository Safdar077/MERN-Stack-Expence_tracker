import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

describe('Sidebar component', () => {
  it('renders all primary navigation links on desktop', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isOpen={false} onClose={vi.fn()} />
      </MemoryRouter>
    );

    const desktopSidebar = screen.getByTestId('desktop-sidebar');
    expect(desktopSidebar).toBeInTheDocument();

    expect(screen.getAllByRole('link', { name: /Dashboard/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Transactions/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Accounts/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Budgets/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Goals/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Analytics/i })[0]).toBeInTheDocument();
  });

  it('renders mobile drawer and backdrop when isOpen is true', () => {
    const mockClose = vi.fn();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isOpen={true} onClose={mockClose} />
      </MemoryRouter>
    );

    expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-backdrop')).toBeInTheDocument();

    // Click backdrop
    fireEvent.click(screen.getByTestId('mobile-backdrop'));
    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('triggers onClose when close button or mobile nav link is clicked', () => {
    const mockClose = vi.fn();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar isOpen={true} onClose={mockClose} />
      </MemoryRouter>
    );

    // Click close button
    const closeBtn = screen.getByRole('button', { name: /Close sidebar navigation/i });
    fireEvent.click(closeBtn);
    expect(mockClose).toHaveBeenCalledTimes(1);

    // Click a mobile nav link
    const mobileLinks = screen.getAllByRole('link', { name: /Transactions/i });
    fireEvent.click(mobileLinks[mobileLinks.length - 1]);
    expect(mockClose).toHaveBeenCalledTimes(2);
  });
});
