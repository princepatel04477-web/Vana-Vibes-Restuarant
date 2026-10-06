import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 dark:border-slate-700 dark:border-t-white rounded-full animate-spin" />
        <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
          Loading...
        </span>
      </div>
    </div>
  );
}
