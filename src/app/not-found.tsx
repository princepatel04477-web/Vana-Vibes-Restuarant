import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
          404 Error
        </span>
        <h1 className="text-2xl font-bold">Page Not Found</h1>
        <p className="text-sm text-slate-500">
          The requested page could not be found.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-block px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 hover:opacity-90 transition-opacity"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
