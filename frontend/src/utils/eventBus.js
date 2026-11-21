/**
 * Pure EventBus Architecture using Native Browser Custom Events.
 *
 * Designed to provide reactive inter-component synchronization without external
 * state management dependencies (Strict Rule: NO Redux, NO RTK Query, NO Context API).
 *
 * When an account, transaction, budget, goal, or recurring item changes,
 * calling `emitSync('account:updated')` notifies all active subscriber hooks
 * (such as `useTransactions`, `useAccounts`, `useBudgets`, etc.) to refetch
 * fresh data from the server.
 */

export const SYNC_EVENT_NAME = 'app:sync';

/**
 * Dispatches an 'app:sync' custom event on the window object.
 *
 * @param {string} eventType - Descriptive name of the mutation event (e.g., 'transaction:created', 'budget:updated')
 * @param {any} [payload=null] - Optional additional data associated with the event
 */
export const emitSync = (eventType, payload = null) => {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    const detail = {
      type: eventType,
      payload,
      timestamp: Date.now(),
    };
    const syncEvent = new CustomEvent(SYNC_EVENT_NAME, { detail });
    window.dispatchEvent(syncEvent);
  }
};

/**
 * Subscribes a listener callback to 'app:sync' events on the window object.
 *
 * @param {function(detail: {type: string, payload: any, timestamp: number}): void} callback - Handler function
 * @returns {function(): void} Cleanup/unsubscribe function that removes the event listener
 */
export const onSync = (callback) => {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {};
  }

  const handler = (event) => {
    if (typeof callback === 'function') {
      try {
        callback(event.detail);
      } catch (err) {
        console.error('[EventBus] Error executing subscriber callback:', err);
      }
    }
  };

  window.addEventListener(SYNC_EVENT_NAME, handler);

  // Return unsubscribe closure for use in useEffect cleanup
  return () => {
    window.removeEventListener(SYNC_EVENT_NAME, handler);
  };
};
