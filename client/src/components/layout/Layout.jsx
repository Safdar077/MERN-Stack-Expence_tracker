import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

/**
 * Layout Component
 *
 * The foundational UI shell for all authenticated views in the application.
 *
 * Structure:
 * - Persistent desktop sidebar on md/lg displays (md:flex).
 * - Off-canvas sliding drawer on mobile devices toggled by hamburger button.
 * - Top sticky Navbar with branding, notifications, user details, and logout.
 * - Scrollable `<main>` viewport hosting nested route pages via `<Outlet />`.
 *
 * Responsive Breakdown:
 * - Mobile (< 768px):
 *   Sidebar is hidden by default offscreen. When hamburger button in Navbar is
 *   tapped, `isMobileMenuOpen` state becomes `true`, showing the drawer and backdrop.
 * - Desktop (>= 768px):
 *   Sidebar is rendered persistently on the left edge as a sticky column.
 *
 * Strict Architectural Rule:
 * Pure React custom hooks & useState only — NO Redux, NO Context API.
 */
const Layout = () => {
  // Local state controlling the mobile slide-out drawer visibility
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toggle function passed down to Navbar hamburger button
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  // Close function passed down to Sidebar drawer backdrop and nav links
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row">
      {/* ------------------------------------------------------------------- */}
      {/* 1. SIDEBAR (Desktop persistent + Mobile slide-out drawer)           */}
      {/* ------------------------------------------------------------------- */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />

      {/* ------------------------------------------------------------------- */}
      {/* 2. MAIN APPLICATION CONTENT AREA                                    */}
      {/* ------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Sticky Top Navbar */}
        <Navbar onToggleSidebar={toggleMobileMenu} />

        {/* Scrollable Viewport for Nested Page Routes */}
        <main
          data-testid="app-main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-50"
        >
          <div className="max-w-7xl mx-auto">
            {/* React Router Outlet renders matching child route component */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
