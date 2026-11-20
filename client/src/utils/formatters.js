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
