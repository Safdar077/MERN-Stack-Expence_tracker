import React from 'react';
import { FaWallet } from 'react-icons/fa';

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="p-8 bg-white rounded-xl shadow-md max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full mb-4">
          <FaWallet className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Expense Tracker</h1>
        <p className="mt-2 text-slate-600">
          Frontend client initialized with Vite, Tailwind CSS, React Icons, Axios and EventBus.
        </p>
      </div>
    </div>
  );
}

export default App;
