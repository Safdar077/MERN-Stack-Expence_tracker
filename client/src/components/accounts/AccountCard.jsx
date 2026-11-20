import React from 'react';
import {
  FaMoneyBillWave,
  FaLandmark,
  FaCreditCard,
  FaWallet,
  FaPiggyBank,
  FaEdit,
  FaTrash,
  FaCheckCircle,
} from 'react-icons/fa';
import { formatCurrency } from '../../utils/formatters.js';

/**
 * AccountCard Component
 *
 * Displays financial account details including account name, type, current balance,
 * default status badge, and quick action buttons for editing and deleting.
 *
 * Key Design Features:
 * 1. Type-Specific Iconography: Each account type (Cash, Bank Account, Credit Card,
 *    Wallet, Savings) displays an intuitive React Icon from react-icons/fa.
 * 2. Distinct Savings Highlighting: "Savings" accounts are styled with an emerald
 *    gradient border and dedicated savings badge to clearly segregate savings from liquid cash.
 * 3. Default Account Badge: Highlights the user's primary/default account for transactions.
 * 4. Action Handlers: Provides intuitive Edit and Delete triggers.
 *
 * Strict Architectural Compliance:
 * - NO Redux, NO Context API.
 * - react-icons exclusively (no lucide-react).
 * - Beginner-friendly inline documentation.
 *
 * @param {Object} props
 * @param {Object} props.account - Financial account object ({ _id, name, type, balance, isDefault })
 * @param {string} [props.currency='$'] - Currency code or symbol for formatted balance
 * @param {Function} [props.onEdit] - Callback invoked when user clicks Edit button
 * @param {Function} [props.onDelete] - Callback invoked when user clicks Delete button
 */
const AccountCard = ({
  account,
  currency = '$',
  onEdit,
  onDelete,
}) => {
  if (!account) return null;

  const isSavings = account.type === 'Savings';
  const isDefault = Boolean(account.isDefault);

  /**
   * Resolves the visual icon and background color based on account type.
   */
  const getAccountTypeIcon = (type) => {
    switch (type) {
      case 'Cash':
        return {
          icon: <FaMoneyBillWave className="w-5 h-5 text-emerald-600" />,
          bgColor: 'bg-emerald-100',
        };
      case 'Bank Account':
        return {
          icon: <FaLandmark className="w-5 h-5 text-blue-600" />,
          bgColor: 'bg-blue-100',
        };
      case 'Credit Card':
        return {
          icon: <FaCreditCard className="w-5 h-5 text-purple-600" />,
          bgColor: 'bg-purple-100',
        };
      case 'Savings':
        return {
          icon: <FaPiggyBank className="w-5 h-5 text-teal-600" />,
          bgColor: 'bg-teal-100',
        };
      case 'Wallet':
      default:
        return {
          icon: <FaWallet className="w-5 h-5 text-amber-600" />,
          bgColor: 'bg-amber-100',
        };
    }
  };

  const typeDetails = getAccountTypeIcon(account.type);

  // Distinct styling for Savings accounts
  const cardBorderAndBg = isSavings
    ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 shadow-sm'
    : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm';

  return (
    <div
      data-testid="account-card"
      className={`relative rounded-2xl p-5 border transition-all duration-200 ${cardBorderAndBg}`}
    >
      {/* Header: Icon, Name, Type, and Badges */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${typeDetails.bgColor}`}
          >
            {typeDetails.icon}
          </div>
          <div className="min-w-0">
            <h3
              className="text-base font-semibold text-slate-800 truncate"
              title={account.name}
            >
              {account.name}
            </h3>
            <p className="text-xs text-slate-500 font-medium">{account.type}</p>
          </div>
        </div>

        {/* Action Buttons: Edit and Delete */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <button
              type="button"
              data-testid="edit-account-btn"
              onClick={() => onEdit(account)}
              aria-label={`Edit ${account.name}`}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Account"
            >
              <FaEdit className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              data-testid="delete-account-btn"
              onClick={() => onDelete(account)}
              aria-label={`Delete ${account.name}`}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete Account"
            >
              <FaTrash className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Badges Row: Default & Savings Tag */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {isDefault && (
          <span
            data-testid="default-badge"
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"
          >
            <FaCheckCircle className="w-3 h-3 text-blue-500" />
            Default
          </span>
        )}
        {isSavings && (
          <span
            data-testid="savings-badge"
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"
          >
            <FaPiggyBank className="w-3 h-3 text-emerald-600" />
            Savings
          </span>
        )}
      </div>

      {/* Balance Section */}
      <div className="pt-2 border-t border-slate-100">
        <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider mb-0.5">
          Current Balance
        </span>
        <span className="text-2xl font-bold text-slate-900 tracking-tight">
          {formatCurrency(account.balance, currency)}
        </span>
      </div>
    </div>
  );
};

export default AccountCard;
