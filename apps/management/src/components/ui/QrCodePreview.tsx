'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Loader2, QrCode as QrIcon } from 'lucide-react';

interface QrCodePreviewProps {
  value: string;
  tableNumber: number;
  size?: number;
  className?: string;
  fallbackUrl?: string;
}

export function QrCodePreview({
  value,
  tableNumber,
  size = 180,
  className = '',
  fallbackUrl,
}: QrCodePreviewProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    if (!value) {
      if (fallbackUrl) {
        setDataUrl(fallbackUrl);
        setLoading(false);
      }
      return;
    }

    QRCode.toDataURL(value, {
      width: size * 2, // 2x for retina sharpness
      margin: 2,
      color: {
        dark: '#18312B', // Brand Green
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) {
          setDataUrl(url);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn(`Client-side QR generation failed for table ${tableNumber}:`, err);
        if (active) {
          if (fallbackUrl) {
            setDataUrl(fallbackUrl);
          } else {
            setError(true);
          }
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [value, size, tableNumber, fallbackUrl]);

  if (loading) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-brand-beige-light/50 ${className}`}>
        <Loader2 className="w-5 h-5 animate-spin text-brand-green/60" />
        <span className="text-[10px] text-brand-green/50 mt-1 font-mono">Generating QR...</span>
      </div>
    );
  }

  if (error || !dataUrl) {
    return (
      <div className={`w-full h-full flex flex-col items-center justify-center bg-amber-50 p-2 text-center ${className}`}>
        <QrIcon className="w-6 h-6 text-amber-700 mb-1" />
        <span className="text-[10px] text-amber-800 font-bold">QR Unavailable</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`Table ${tableNumber} QR`}
      className={`w-full h-full object-contain ${className}`}
      loading="lazy"
    />
  );
}
