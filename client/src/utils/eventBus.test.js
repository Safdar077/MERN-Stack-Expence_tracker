import { describe, it, expect, vi } from 'vitest';
import { emitSync, onSync, SYNC_EVENT_NAME } from './eventBus.js';

describe('eventBus', () => {
  it('dispatches app:sync custom event when emitSync is called', () => {
    const listener = vi.fn();
    window.addEventListener(SYNC_EVENT_NAME, listener);

    emitSync('transaction:created', { id: 'tx-1' });

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0];
    expect(event.detail.type).toBe('transaction:created');
    expect(event.detail.payload).toEqual({ id: 'tx-1' });
    expect(typeof event.detail.timestamp).toBe('number');

    window.removeEventListener(SYNC_EVENT_NAME, listener);
  });

  it('notifies subscribers registered via onSync', () => {
    const callback = vi.fn();
    const unsubscribe = onSync(callback);

    emitSync('account:updated', { balance: 500 });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'account:updated',
        payload: { balance: 500 },
      })
    );

    unsubscribe();

    emitSync('budget:alert', { percent: 90 });
    expect(callback).toHaveBeenCalledTimes(1); // not called again
  });
});
