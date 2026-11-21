/**
 * Formatter Utilities
 *
 * Provides reusable formatting functions for currency symbols, monetary amounts,
 * percentages, and dates across the financial tracker client.
 */

// Mapping of ISO currency codes to visual symbols
const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  CAD: 'C$',
  AUD: 'A$',
  CHF: 'CHF',
  CNY: '¥',
};

/**
 * Resolves a currency string (ISO code like 'USD' or direct symbol like '€')
 * to its standard display symbol.
 *
 * @param {string} [currency='USD'] - Currency code or symbol
 * @returns {string} Visual currency symbol (e.g. '$', '€', '₹')
 */
export const getCurrencySymbol = (currency = '$') => {
  if (!currency) return '$';
  const trimmed = String(currency).trim();
  // If it's already a symbol like $, €, £, ₹, ¥
  if (['$', '€', '£', '₹', '¥'].includes(trimmed)) {
    return trimmed;
  }
  // If uppercase code matches our dictionary
  const upper = trimmed.toUpperCase();
  if (CURRENCY_SYMBOLS[upper]) {
    return CURRENCY_SYMBOLS[upper];
  }
  return trimmed;
};

/**
 * Formats a numeric monetary value into a user-friendly string with currency symbol.
 * Handles negative values cleanly (e.g. -$150.25).
 *
 * @param {number} amount - Numeric amount to format
 * @param {string} [currency='$'] - Currency code or symbol
 * @param {number} [decimalPlaces=2] - Number of decimal places
 * @returns {string} Formatted string e.g. "$1,250.50" or "-$50.00"
 */
export const formatCurrency = (amount, currency = '$', decimalPlaces = 2) => {
  const numericAmount = typeof amount === 'number' ? amount : Number(amount) || 0;
  const symbol = getCurrencySymbol(currency);
  const isNegative = numericAmount < 0;
  const absValue = Math.abs(numericAmount);

  const formattedNumber = absValue.toLocaleString('en-US', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });

  if (isNegative) {
    return `-${symbol}${formattedNumber}`;
  }
  return `${symbol}${formattedNumber}`;
};

/**
 * Formats a Date object or ISO date string into a friendly localized display date.
 *
 * @param {string|Date} dateInput - ISO string or Date instance
 * @returns {string} Formatted date (e.g. "Nov 20, 2026")
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '';
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj.getTime())) return '';
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Calculates the next due date by advancing a base date by a recurring frequency interval.
 * Uses exact calendar math with month-end and leap-year clamping.
 *
 * @param {string|Date} currentDate - ISO string, YYYY-MM-DD string, or Date instance
 * @param {'Daily'|'Weekly'|'Monthly'|'Yearly'} [frequency='Monthly'] - Recurrence frequency
 * @returns {string} Next due date formatted as YYYY-MM-DD
 */
export const calculateNextDueDate = (currentDate, frequency = 'Monthly') => {
  if (!currentDate) return '';

  let year, month, day;
  if (typeof currentDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(currentDate)) {
    const parts = currentDate.split('T')[0].split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1; // 0-indexed month
    day = parts[2];
  } else {
    const d = new Date(currentDate);
    if (isNaN(d.getTime())) return '';
    year = d.getFullYear();
    month = d.getMonth();
    day = d.getDate();
  }

  const nextDate = new Date(year, month, day);

  switch (frequency) {
    case 'Daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'Weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'Monthly': {
      const targetDay = day;
      nextDate.setDate(1);
      nextDate.setMonth(nextDate.getMonth() + 1);
      const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(targetDay, daysInMonth));
      break;
    }
    case 'Yearly': {
      const targetDay = day;
      nextDate.setDate(1);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(targetDay, daysInMonth));
      break;
    }
    default: {
      const targetDay = day;
      nextDate.setDate(1);
      nextDate.setMonth(nextDate.getMonth() + 1);
      const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
      nextDate.setDate(Math.min(targetDay, daysInMonth));
      break;
    }
  }

  const y = nextDate.getFullYear();
  const m = String(nextDate.getMonth() + 1).padStart(2, '0');
  const d = String(nextDate.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
