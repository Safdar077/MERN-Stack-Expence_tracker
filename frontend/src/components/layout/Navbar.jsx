import React from 'react';
import { FaBars, FaSignOutAlt, FaUserCircle, FaWallet } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth.js';
import NotificationBell from './NotificationBell.jsx';

/**
 * Navbar Component
 *
 * Primary top application bar handling:
 * 1. Mobile menu toggle button (hamburger icon) to expand the mobile drawer sidebar.
 * 2. Mobile brand display (visible when persistent desktop sidebar is hidden).
 * 3. Integrated NotificationBell with live counter and alerts dropdown.
 * 4. User profile overview (user full name, active currency indicator).
 * 5. 1-Click Logout action triggering `useAuth().logout()`.
 *
 * Strict Architectural Rule:
 * Pure React custom hooks only — NO Redux, NO RTK Query, NO Context API.
 * Uses `react-icons` exclusively.
 *
 * @param {Object} props
 * @param {Function} props.onToggleSidebar - Callback to toggle the mobile sidebar drawer
 */
const Navbar = ({ onToggleSidebar = () => {} }) => {
  // Access authenticated user profile and logout function from useAuth custom hook
  const { user, logout } = useAuth();

  // Extract display values with fallback defaults
  const userName = user?.name || 'User';
  const userCurrency = user?.currency || 'USD';
  const userEmail = user?.email || '';

  // Get user initials for avatar
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2.5 sm:px-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        {/* ------------------------------------------------------------------- */}
        {/* LEFT: Mobile Hamburger Toggle + Brand (Mobile Only)                 */}
        {/* ------------------------------------------------------------------- */}
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger Drawer Button */}
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            data-testid="sidebar-toggle-btn"
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <FaBars className="w-5 h-5" />
          </button>

          {/* Mobile Brand Title (Hidden on desktop since desktop sidebar displays it) */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <FaWallet className="w-4 h-4" />
            </div>
            <span className="font-bold text-slate-800 text-sm tracking-tight">Expense Tracker</span>
          </div>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* RIGHT: Notifications + User Profile Badge + Logout Button           */}
        {/* ------------------------------------------------------------------- */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notification Bell Component */}
          <NotificationBell />

          {/* User Currency Badge */}
          <div
            data-testid="user-currency-badge"
            className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
            title={`Active currency: ${userCurrency}`}
          >
            {userCurrency}
          </div>

          {/* User Profile Info Pill */}
          <div
            data-testid="user-profile-badge"
            className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200"
          >
            {/* User Avatar Circle */}
            <div
              className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm flex-shrink-0"
              title={userEmail || userName}
            >
              {initials}
            </div>

            {/* User Name Text */}
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                {userName}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{userEmail}</p>
            </div>
          </div>

          {/* Logout Action Button */}
          <button
            type="button"
            onClick={logout}
            aria-label="Log out"
            data-testid="logout-button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            <FaSignOutAlt className="w-3.5 h-3.5 text-slate-500 hover:text-red-600" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
