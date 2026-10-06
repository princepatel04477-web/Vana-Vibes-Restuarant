import React, { Suspense } from 'react';
import { MenuClient } from '@/components/MenuClient';

export default function VaanVibesLegacyMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-beige-light flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-brand-green border-t-transparent animate-spin" />
        </div>
      }
    >
      <MenuClient defaultCafeId="van-vibes" />
    </Suspense>
  );
}
