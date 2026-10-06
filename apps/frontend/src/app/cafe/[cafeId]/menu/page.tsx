import React, { Suspense } from 'react';
import { MenuClient } from '@/components/MenuClient';
import { Spinner } from '@/components/ui/Spinner';

export default async function CafeMenuPage(props: {
  params: Promise<{ cafeId: string }>;
}) {
  const { cafeId } = await props.params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-beige-light flex items-center justify-center">
          <Spinner size="lg" color="green" />
        </div>
      }
    >
      <MenuClient defaultCafeId={cafeId} />
    </Suspense>
  );
}
