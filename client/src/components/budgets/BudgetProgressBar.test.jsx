import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BudgetProgressBar from './BudgetProgressBar.jsx';

const renderWithRouter = (ui) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('BudgetProgressBar Component', () => {
  it('renders fallback state when no budget limit is set', () => {
    renderWithRouter(
      <BudgetProgressBar
        spent={0}
        limit={0}
      />
    );

    expect(screen.getByText(/no monthly budget set/i)).toBeInTheDocument();
  });

  it('renders spent, limit, remaining, and percentage correctly', () => {
    renderWithRouter(
      <BudgetProgressBar
        spent={400}
        limit={1000}
        currency="$"
      />
    );

    expect(screen.getByText('$400.00')).toBeInTheDocument();
    expect(screen.getByText(/of \$1,000.00/i)).toBeInTheDocument();
    expect(screen.getByText(/40%/i)).toBeInTheDocument();
    expect(screen.getByText(/\$600.00 remaining/i)).toBeInTheDocument();
  });

  it('applies green color theme when spent is under 50%', () => {
    const { container } = renderWithRouter(
      <BudgetProgressBar
        spent={300}
        limit={1000}
      />
    );

    // Green progress bar indicator (< 50%)
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-emerald-500');
  });

  it('applies blue color theme when spent is between 50% and 89%', () => {
    const { container } = renderWithRouter(
      <BudgetProgressBar
        spent={750}
        limit={1000}
      />
    );

    // Blue progress bar indicator (50-89%)
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-blue-500');
  });

  it('applies orange/amber color theme when spent is between 90% and 99%', () => {
    const { container } = renderWithRouter(
      <BudgetProgressBar
        spent={920}
        limit={1000}
      />
    );

    // Orange progress bar indicator (90-99%)
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-amber-500');
  });

  it('applies red color theme when spent is >= 100% or exceeded', () => {
    const { container } = renderWithRouter(
      <BudgetProgressBar
        spent={1150}
        limit={1000}
      />
    );

    // Red progress bar indicator (>= 100%)
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-rose-500');
  });

  it('renders descriptive warning text when warning prop is passed', () => {
    renderWithRouter(
      <BudgetProgressBar
        spent={950}
        limit={1000}
        warning="You have used 95% of your monthly budget."
      />
    );

    expect(screen.getByText('You have used 95% of your monthly budget.')).toBeInTheDocument();
  });

  it('displays budget exceeded warning when spent exceeds limit', () => {
    renderWithRouter(
      <BudgetProgressBar
        spent={1250}
        limit={1000}
      />
    );

    expect(screen.getByText(/budget exceeded by \$250\.00/i)).toBeInTheDocument();
  });

  it('formats amounts with custom currency', () => {
    renderWithRouter(
      <BudgetProgressBar
        spent={500}
        limit={1000}
        currency="EUR"
      />
    );

    expect(screen.getByText('€500.00')).toBeInTheDocument();
    expect(screen.getByText(/of €1,000.00/i)).toBeInTheDocument();
  });
});
