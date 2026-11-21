import React from 'react';
import { formatCurrency } from '../../utils/formatters.js';

/**
 * SummaryCard Component
 *
 * Reusable metric card designed for top-level financial overviews:
 * - Total Balance (emerald theme)
 * - Total Income (emerald / green theme)
 * - Total Expenses (rose / red theme)
 * - Monthly Budget / Net Savings (blue / indigo theme)
 *
 * Features:
 * 1. Automatic monetary formatting with configurable currency symbol/code (defaults to '$').
 * 2. Visual color theme variants for positive, negative, and informational metrics.
 * 3. Support for custom React Icons (`react-icons`).
 * 4. Optional subtitle (e.g., trend text, percentage comparison).
 * 5. Optional badge pill (e.g., "This Month", "Active").
 * 6. Beginner-friendly inline documentation explaining every prop and styling class.
 *
 * @param {Object} props
 * @param {string} props.title - Card header title (e.g. "Total Balance", "Monthly Income")
 * @param {number} [props.value=0] - Monetary number to display
 * @param {string} [props.currency='$'] - Currency code ('USD', 'EUR', 'INR') or symbol ('$', '€', '₹')
 * @param {React.ElementType} [props.icon] - React-icons component reference (e.g. FaWallet)
 * @param {string} [props.subtitle] - Supporting description or percentage change string
 * @param {string} [props.badge] - Optional badge tag text (e.g. "This Month")
 * @param {'emerald'|'rose'|'blue'|'slate'} [props.theme='slate'] - Color accent theme
 * @param {string} [props.className=''] - Extra classes for custom overrides
 */
const SummaryCard = ({
  title,
  value = 0,
  currency = '$',
  icon: Icon,
  subtitle,
  badge,
  theme = 'slate',
  className = '',
}) => {
  // ---------------------------------------------------------------------------
  // 1. THEME CONFIGURATION
  // ---------------------------------------------------------------------------
  // Defines color accents for background pills, icon badges, and value text.
  // - emerald: Income, balance, positive net savings
  // - rose: Expenses, debt, deficits
  // - blue: Budgets, investments, savings goals
  // - slate: Neutral metric fallback
  const themeStyles = {
    emerald: {
      cardBorder: 'border-emerald-100 hover:border-emerald-200',
      iconBg: 'bg-emerald-50 text-emerald-600',
      valueText: 'text-emerald-700',
      badgeBg: 'bg-emerald-100 text-emerald-800',
    },
    rose: {
      cardBorder: 'border-rose-100 hover:border-rose-200',
      iconBg: 'bg-rose-50 text-rose-600',
      valueText: 'text-rose-700',
      badgeBg: 'bg-rose-100 text-rose-800',
    },
    blue: {
      cardBorder: 'border-blue-100 hover:border-blue-200',
      iconBg: 'bg-blue-50 text-blue-600',
      valueText: 'text-blue-700',
      badgeBg: 'bg-blue-100 text-blue-800',
    },
    slate: {
      cardBorder: 'border-slate-200 hover:border-slate-300',
      iconBg: 'bg-slate-100 text-slate-600',
      valueText: 'text-slate-900',
      badgeBg: 'bg-slate-100 text-slate-700',
    },
  };

  const activeTheme = themeStyles[theme] || themeStyles.slate;

  // Format the monetary value cleanly (e.g. $1,250.00 or -$50.25)
  const formattedValue = formatCurrency(value, currency);

  return (
    <div
      data-testid="summary-card"
      className={`bg-white rounded-2xl p-5 border shadow-sm transition-all duration-200 hover:shadow-md ${activeTheme.cardBorder} ${className}`}
    >
      {/* Header: Title, Icon, and Optional Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div
              data-testid="summary-card-icon"
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${activeTheme.iconBg}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-slate-500 tracking-wide">{title}</h3>
          </div>
        </div>

        {badge && (
          <span
            data-testid="summary-card-badge"
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${activeTheme.badgeBg}`}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="mt-4">
        <p className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${activeTheme.valueText}`}>
          {formattedValue}
        </p>

        {/* Optional Subtitle / Trend Indicator */}
        {subtitle && (
          <p className="mt-1 text-xs sm:text-sm text-slate-500 font-medium">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default SummaryCard;
