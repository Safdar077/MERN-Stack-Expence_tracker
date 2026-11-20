import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FaWallet, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import SummaryCard from './SummaryCard.jsx';

describe('SummaryCard Component', () => {
  it('renders title and formatted monetary value with default currency ($)', () => {
    render(
      <SummaryCard
        title="Total Balance"
        value={1250.5}
      />
    );

    expect(screen.getByText('Total Balance')).toBeInTheDocument();
    expect(screen.getByText('$1,250.50')).toBeInTheDocument();
  });

  it('renders value with custom currency symbol or code', () => {
    const { rerender } = render(
      <SummaryCard
        title="Monthly Income"
        value={4500}
        currency="€"
      />
    );
    expect(screen.getByText('€4,500.00')).toBeInTheDocument();

    rerender(
      <SummaryCard
        title="Monthly Income"
        value={4500}
        currency="INR"
      />
    );
    expect(screen.getByText('₹4,500.00')).toBeInTheDocument();
  });

  it('renders icon and subtitle/trend when provided', () => {
    render(
      <SummaryCard
        title="Total Income"
        value={3200}
        icon={FaArrowUp}
        subtitle="+12% from last month"
      />
    );

    expect(screen.getByText('+12% from last month')).toBeInTheDocument();
    expect(screen.getByTestId('summary-card-icon')).toBeInTheDocument();
  });

  it('renders optional badge when provided', () => {
    render(
      <SummaryCard
        title="Total Expenses"
        value={850}
        badge="This Month"
      />
    );

    expect(screen.getByText('This Month')).toBeInTheDocument();
  });

  it('applies color theme classes for emerald, rose, and blue', () => {
    const { container, rerender } = render(
      <SummaryCard
        title="Total Balance"
        value={1000}
        theme="emerald"
        icon={FaWallet}
      />
    );
    expect(container.querySelector('.text-emerald-700') || container.querySelector('.bg-emerald-50')).toBeTruthy();

    rerender(
      <SummaryCard
        title="Total Expenses"
        value={1000}
        theme="rose"
        icon={FaWallet}
      />
    );
    expect(container.querySelector('.text-rose-700') || container.querySelector('.bg-rose-50')).toBeTruthy();

    rerender(
      <SummaryCard
        title="Monthly Budget"
        value={1000}
        theme="blue"
        icon={FaWallet}
      />
    );
    expect(container.querySelector('.text-blue-700') || container.querySelector('.bg-blue-50')).toBeTruthy();
  });

  it('handles negative and zero values cleanly', () => {
    const { rerender } = render(
      <SummaryCard
        title="Net Savings"
        value={0}
      />
    );
    expect(screen.getByText('$0.00')).toBeInTheDocument();

    rerender(
      <SummaryCard
        title="Net Savings"
        value={-150.25}
      />
    );
    expect(screen.getByText('-$150.25')).toBeInTheDocument();
  });
});
