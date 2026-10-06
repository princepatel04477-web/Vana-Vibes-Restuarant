import React from 'react';
import { Spinner } from '@/components/ui/Spinner';

export default function Loading() {
  return (
    <div className="min-h-screen bg-brand-beige-light flex items-center justify-center p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" color="green" />
        <span className="text-xs font-mono text-brand-green/70 uppercase tracking-wider">
          Loading Vaan Vibes...
        </span>
      </div>
    </div>
  );
}
