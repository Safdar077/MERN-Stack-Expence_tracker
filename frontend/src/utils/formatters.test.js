import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, getCurrencySymbol, calculateNextDueDate } from './formatters.js';

describe('formatters utility', () => {
  describe('getCurrencySymbol', () => {
    it('returns known currency symbols', () => {
      expect(getCurrencySymbol('USD')).toBe('$');
      expect(getCurrencySymbol('EUR')).toBe('€');
      expect(getCurrencySymbol('GBP')).toBe('£');
      expect(getCurrencySymbol('INR')).toBe('₹');
    });

    it('returns direct symbols unchanged', () => {
      expect(getCurrencySymbol('$')).toBe('$');
      expect(getCurrencySymbol('€')).toBe('€');
    });
  });

  describe('formatCurrency', () => {
    it('formats positive and negative amounts correctly', () => {
      expect(formatCurrency(1250.5, 'USD')).toBe('$1,250.50');
      expect(formatCurrency(-50, 'USD')).toBe('-$50.00');
      expect(formatCurrency(0, 'EUR')).toBe('€0.00');
    });
  });

  describe('formatDate', () => {
    it('formats ISO dates cleanly', () => {
      const formatted = formatDate('2026-11-20');
      expect(formatted).toContain('2026');
      expect(formatted).toContain('Nov');
    });

    it('returns empty string for invalid date', () => {
      expect(formatDate('')).toBe('');
      expect(formatDate('invalid-date')).toBe('');
    });
  });

  describe('calculateNextDueDate', () => {
    it('advances Daily frequency by 1 day', () => {
      expect(calculateNextDueDate('2026-11-20', 'Daily')).toBe('2026-11-21');
    });

    it('advances Weekly frequency by 7 days', () => {
      expect(calculateNextDueDate('2026-11-20', 'Weekly')).toBe('2026-11-27');
    });

    it('advances Monthly frequency by 1 month', () => {
      expect(calculateNextDueDate('2026-11-20', 'Monthly')).toBe('2026-12-20');
      expect(calculateNextDueDate('2026-12-15', 'Monthly')).toBe('2027-01-15');
    });

    it('clamps month-end correctly for Monthly frequency (e.g. Jan 31 -> Feb 28)', () => {
      expect(calculateNextDueDate('2026-01-31', 'Monthly')).toBe('2026-02-28');
      expect(calculateNextDueDate('2024-01-31', 'Monthly')).toBe('2024-02-29'); // Leap year
    });

    it('advances Yearly frequency by 1 year', () => {
      expect(calculateNextDueDate('2026-11-20', 'Yearly')).toBe('2027-11-20');
      expect(calculateNextDueDate('2024-02-29', 'Yearly')).toBe('2025-02-28');
    });

    it('returns empty string when date is empty or invalid', () => {
      expect(calculateNextDueDate('', 'Monthly')).toBe('');
      expect(calculateNextDueDate(null, 'Monthly')).toBe('');
    });
  });
});
