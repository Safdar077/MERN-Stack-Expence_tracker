import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaExchangeAlt,
  FaCreditCard,
  FaPiggyBank,
  FaBullseye,
  FaChartLine,
  FaTimes,
  FaWallet,
} from 'react-icons/fa';

/**
 * Navigation items configuration for primary application views.
 * Each item contains a human-readable name, route path, and React Icon component.
 */
const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: FaTachometerAlt },
  { name: 'Transactions', path: '/transactions', icon: FaExchangeAlt },
  { name: 'Accounts', path: '/accounts', icon: FaCreditCard },
  { name: 'Budgets', path: '/budgets', icon: FaPiggyBank },
  { name: 'Goals', path: '/goals', icon: FaBullseye },
  { name: 'Analytics', path: '/analytics', icon: FaChartLine },
];

/**
 * Sidebar Component
 *
 * Implements a dual-mode responsive navigation experience:
 * 1. Persistent Sidebar on medium-and-above desktop viewports (md:flex).
 * 2. Slide-out Drawer on mobile devices triggered by the Navbar toggle button.
 *
 * Features:
 * - Active route styling via React Router's `<NavLink>` and Tailwind CSS.
 * - Accessible mobile backdrop overlay that dismisses drawer when tapped.
 * - Automatic close on link navigation when viewed on mobile screens.
 * - Strictly uses `react-icons` (no lucide-react).
 * - Pure React state, NO Redux or Context API.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Mobile drawer visibility flag
 * @param {Function} props.onClose - Callback triggered when closing the mobile drawer
 */
const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  // Shared navigation link list renderer
  const renderNavLinks = () => (
    <ul className="space-y-1.5 px-3 py-4">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <li key={item.path}>
            <NavLink
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700 font-semibold border-l-4 border-emerald-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`
              }
            >
              <IconComponent className="w-5 h-5 flex-shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      {/* --------------------------------------------------------------------- */}
      {/* 1. DESKTOP PERSISTENT SIDEBAR (Hidden on mobile, block on md screens) */}
      {/* --------------------------------------------------------------------- */}
      <aside
        data-testid="desktop-sidebar"
        className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 min-h-screen flex-shrink-0 z-20"
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <FaWallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">Expense Tracker</h1>
            <p className="text-[11px] text-slate-500 font-medium">Smart Finance Suite</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto">{renderNavLinks()}</nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="text-xs text-slate-400 text-center font-medium">
            ZA Charity Feed Foundation
          </div>
        </div>
      </aside>

      {/* --------------------------------------------------------------------- */}
      {/* 2. MOBILE SLIDE-OUT DRAWER OVERLAY (Rendered only on mobile viewports) */}
      {/* --------------------------------------------------------------------- */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop Shadow Overlay */}
          <div
            data-testid="mobile-backdrop"
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <aside
            data-testid="mobile-sidebar"
            className="fixed inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col z-50 transform transition-transform duration-300 ease-in-out"
          >
            {/* Drawer Header with Close Button */}
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <FaWallet className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-800 text-sm">Expense Tracker</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close sidebar navigation"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Nav Links */}
            <nav className="flex-1 overflow-y-auto py-2">{renderNavLinks()}</nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 text-center text-xs text-slate-400">
              MERN Stack Expense Tracker
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
