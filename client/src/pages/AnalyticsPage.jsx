import React from 'react';
import { FaChartLine } from 'react-icons/fa';

/**
 * AnalyticsPage Stub Component
 *
 * Friendly placeholder for the charts and analytics view.
 * Will be fully constructed in Task 17 using Recharts (pie, bar, area charts).
 */
const AnalyticsPage = () => {
  return (
    <div data-testid="analytics-page" className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
          <FaChartLine className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financial Analytics</h1>
          <p className="text-sm text-slate-500">
            Interactive visual charts of category expenses, cash flow, and monthly trends.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm text-slate-600">
          Recharts spending graphs and financial metrics will be rendered here.
        </p>
      </div>
    </div>
  );
};

export default AnalyticsPage;
