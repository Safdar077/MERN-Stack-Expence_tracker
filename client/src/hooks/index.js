/**
 * Central barrel export for all pure React state hooks.
 *
 * Strict Architectural Rule:
 * NO Redux, NO RTK Query, NO Context API.
 * All state is managed through these pure custom hooks using native useState,
 * useEffect, and the browser-native window EventBus (emitSync / onSync).
 */

export { useAuth } from './useAuth.js';
export { useAccounts } from './useAccounts.js';
export { useCategories } from './useCategories.js';
export { useTransactions } from './useTransactions.js';
export { useBudgets } from './useBudgets.js';
export { useGoals } from './useGoals.js';
export { useRecurring } from './useRecurring.js';
export { useAnalytics } from './useAnalytics.js';
