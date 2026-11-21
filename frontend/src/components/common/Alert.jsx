import React from 'react';
import {
  FaExclamationCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimes,
} from 'react-icons/fa';

/**
 * Visual configuration lookup dictionary for alert variants.
 * Maps each supported variant ('error', 'success', 'warning', 'info') to its
 * corresponding Tailwind container styles, text colors, and React Icon component.
 */
const VARIANT_CONFIG = {
  error: {
    containerClass: 'bg-red-50 border-red-200 text-red-800',
    iconClass: 'text-red-500',
    Icon: FaExclamationCircle,
  },
  success: {
    containerClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    iconClass: 'text-emerald-500',
    Icon: FaCheckCircle,
  },
  warning: {
    containerClass: 'bg-amber-50 border-amber-200 text-amber-800',
    iconClass: 'text-amber-500',
    Icon: FaExclamationTriangle,
  },
  info: {
    containerClass: 'bg-blue-50 border-blue-200 text-blue-800',
    iconClass: 'text-blue-500',
    Icon: FaInfoCircle,
  },
};

/**
 * Alert Component
 *
 * A reusable banner component designed to communicate status, errors, warnings,
 * and informative updates across the application (e.g. form validation, server responses).
 *
 * @param {Object} props - Component properties
 * @param {'error'|'success'|'warning'|'info'} [props.variant='info'] - Alert appearance style
 * @param {'error'|'success'|'warning'|'info'} [props.type] - Alias for variant
 * @param {string} [props.title] - Optional heading emphasized above message content
 * @param {string|React.ReactNode} [props.message] - Main message text to display
 * @param {React.ReactNode} [props.children] - Fallback message content if message prop is absent
 * @param {Function} [props.onClose] - Optional callback function to render a dismiss (x) button
 * @param {string} [props.className] - Additional custom CSS utility classes
 * @returns {React.ReactElement|null} The alert banner element, or null if no content exists
 */
const Alert = ({
  variant,
  type,
  title,
  message,
  children,
  onClose,
  className = '',
}) => {
  // Allow 'type' prop as a convenient alias for 'variant'
  const resolvedVariant = variant || type || 'info';
  const config = VARIANT_CONFIG[resolvedVariant] || VARIANT_CONFIG.info;
  const { Icon, containerClass, iconClass } = config;

  // Resolved text content
  const content = message || children;

  // If there's neither a title nor content to display, render nothing
  if (!title && !content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-testid="alert-banner"
      className={`flex items-start gap-3 p-3.5 rounded-xl border text-sm transition-all duration-200 ${containerClass} ${className}`}
    >
      {/* Variant Icon */}
      <div className={`mt-0.5 flex-shrink-0 text-base ${iconClass}`}>
        <Icon aria-hidden="true" />
      </div>

      {/* Message & Title Body */}
      <div className="flex-1 min-w-0">
        {title && <h4 className="font-semibold text-sm mb-0.5">{title}</h4>}
        {content && <div className="leading-relaxed">{content}</div>}
      </div>

      {/* Optional Dismiss Button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close alert"
          className="ml-auto -mr-1 -mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400"
        >
          <FaTimes className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default Alert;
