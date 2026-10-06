'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmationModal({
  isOpen,
  title,
  description,
  cancelLabel = 'Cancel',
  confirmLabel = 'Confirm',
  isDestructive = true,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onConfirm();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-brand-green-deep/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-brand-beige-dark overflow-hidden flex flex-col p-5 sm:p-6 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
              isDestructive
                ? 'bg-red-50 text-red-600 border-red-200'
                : 'bg-brand-beige text-brand-green border-brand-beige-dark'
            }`}
          >
            {isDestructive ? (
              <Trash2 className="w-5 h-5 text-red-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-brand-green" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3
              id="confirmation-modal-title"
              className="font-extrabold text-base sm:text-lg text-brand-green leading-snug"
            >
              {title}
            </h3>
            <div className="text-xs sm:text-sm text-brand-green/70 mt-1 leading-relaxed break-words">
              {description}
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="w-7 h-7 rounded-full hover:bg-brand-beige text-brand-green/60 hover:text-brand-green flex items-center justify-center transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2.5 mt-6 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 rounded-xl border border-brand-beige-dark text-xs sm:text-sm font-bold text-brand-green hover:bg-brand-beige transition-all active:scale-95 disabled:opacity-50 min-h-[40px] cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50 min-h-[40px] cursor-pointer ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-brand-green hover:bg-brand-green-hover text-brand-beige'
            }`}
          >
            {isSubmitting ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
