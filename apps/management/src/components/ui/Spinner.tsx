import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: 'green' | 'gold' | 'white';
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-12 h-12 border-3',
};

const colorClasses = {
  green: 'border-brand-green border-t-transparent',
  gold: 'border-brand-gold border-t-transparent',
  white: 'border-white border-t-transparent',
};

export function Spinner({
  size = 'lg',
  className = '',
  color = 'green',
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`rounded-full animate-spin shrink-0 ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
