'use client';

import React, { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Application Exception Boundary]:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <span className="text-xs font-mono uppercase tracking-widest text-rose-500">
          Error
        </span>
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-sm text-slate-500">
          An unexpected error occurred. Please try again.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
