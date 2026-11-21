import React from 'react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver for Recharts in jsdom test environment
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mock ResponsiveContainer so Recharts charts render in jsdom without 0-dimension skips
vi.mock('recharts', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    ResponsiveContainer: ({ children, height = 300 }) =>
      React.createElement(
        'div',
        { className: 'recharts-responsive-container', style: { width: 500, height } },
        React.isValidElement(children)
          ? React.cloneElement(children, { width: 500, height: 300 })
          : children
      ),
  };
});
