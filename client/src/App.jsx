import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout & Route Guards
import Layout from './components/layout/Layout.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';

// Application Page Views (Stubs implemented in Task 10, expanded in Tasks 11-17)
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TransactionsPage from './pages/TransactionsPage.jsx';
import AccountsPage from './pages/AccountsPage.jsx';
import BudgetsPage from './pages/BudgetsPage.jsx';
import GoalsPage from './pages/GoalsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';

/**
 * App Root Component
 *
 * Configures the primary client routing structure for the Expense Tracker application.
 *
 * Routing Hierarchy:
 *
 * 1. Public Routes:
 *    - `/login` -> LoginPage (User authentication)
 *    - `/register` -> RegisterPage (New user onboarding)
 *
 * 2. Protected Routes (Wrapped in `<ProtectedRoute>` and `<Layout>`):
 *    - Guards access against unauthenticated visits by checking JWT token.
 *    - Renders the responsive Layout shell (Sidebar + Navbar + Content Viewport).
 *    - `/` -> Redirects automatically to `/dashboard`
 *    - `/dashboard` -> DashboardPage (Main summary & overview)
 *    - `/transactions` -> TransactionsPage (Expense/income ledger & filters)
 *    - `/accounts` -> AccountsPage (Checking, savings, credit cards)
 *    - `/budgets` -> BudgetsPage (Monthly budget targets & threshold alerts)
 *    - `/goals` -> GoalsPage (Savings target progress tracking)
 *    - `/analytics` -> AnalyticsPage (Recharts visual spending trends)
 *
 * 3. Fallback Route:
 *    - `*` -> Catch-all route redirecting unrecognized URLs to `/`
 *
 * Strict Architectural Rule:
 * `main.jsx` already wraps `<App />` with `<BrowserRouter>`.
 * Do NOT wrap `<Routes>` in an inner `<BrowserRouter>`.
 * State is managed purely via custom hooks and window EventBus (NO Redux, NO Context API).
 */
function App() {
  return (
    <Routes>
      {/* ----------------------------------------------------------------- */}
      {/* 1. PUBLIC ROUTES (Accessible without authentication)              */}
      {/* ----------------------------------------------------------------- */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* ----------------------------------------------------------------- */}
      {/* 2. PROTECTED ROUTES (Requires valid JWT session)                  */}
      {/* ----------------------------------------------------------------- */}
      <Route element={<ProtectedRoute />}>
        {/* Layout wraps all protected views with persistent Sidebar and Navbar */}
        <Route element={<Layout />}>
          {/* Default index route redirects to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>
      </Route>

      {/* ----------------------------------------------------------------- */}
      {/* 3. WILDCARD FALLBACK (Redirect unknown routes to home)             */}
      {/* ----------------------------------------------------------------- */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
