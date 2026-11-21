import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Alert from './Alert.jsx';

describe('Alert Component', () => {
  it('renders alert banner with message and default info variant', () => {
    render(<Alert message="This is an informative message" />);

    const alertBanner = screen.getByTestId('alert-banner');
    expect(alertBanner).toBeInTheDocument();
    expect(screen.getByText('This is an informative message')).toBeInTheDocument();
  });

  it('renders children as message fallback if message prop is not provided', () => {
    render(
      <Alert>
        <span>Child content alert</span>
      </Alert>
    );

    expect(screen.getByText('Child content alert')).toBeInTheDocument();
  });

  it('renders error variant styling correctly', () => {
    render(<Alert variant="error" message="Invalid credentials" />);

    const alertBanner = screen.getByTestId('alert-banner');
    expect(alertBanner).toHaveClass('bg-red-50');
    expect(alertBanner).toHaveClass('text-red-800');
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('supports "type" prop as an alias for "variant"', () => {
    render(<Alert type="success" message="Operation successful!" />);

    const alertBanner = screen.getByTestId('alert-banner');
    expect(alertBanner).toHaveClass('bg-emerald-50');
    expect(screen.getByText('Operation successful!')).toBeInTheDocument();
  });

  it('renders warning variant styling correctly', () => {
    render(<Alert variant="warning" message="Session expiring soon" />);

    const alertBanner = screen.getByTestId('alert-banner');
    expect(alertBanner).toHaveClass('bg-amber-50');
    expect(alertBanner).toHaveClass('text-amber-800');
  });

  it('renders optional title when provided', () => {
    render(<Alert variant="info" title="Important Notice" message="Please review your settings." />);

    expect(screen.getByText('Important Notice')).toBeInTheDocument();
    expect(screen.getByText('Please review your settings.')).toBeInTheDocument();
  });

  it('renders dismiss button when onClose is provided and triggers callback on click', () => {
    const handleClose = vi.fn();
    render(<Alert message="Dismissable alert" onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: /close alert/i });
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render dismiss button when onClose is omitted', () => {
    render(<Alert message="Static non-dismissable alert" />);

    const closeBtn = screen.queryByRole('button', { name: /close alert/i });
    expect(closeBtn).not.toBeInTheDocument();
  });

  it('returns null if neither message, children, nor title are provided', () => {
    const { container } = render(<Alert />);
    expect(container.firstChild).toBeNull();
  });
});
