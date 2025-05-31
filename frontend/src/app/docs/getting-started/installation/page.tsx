"use client";

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Import the component with no SSR to prevent 'window is not defined' errors
const InstallationClient = dynamic(
  () => import('./client-page'),
  { ssr: false }
);

/**
 * Installation documentation page with client-side rendering only
 */
export default function InstallationPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading documentation...</div>}>
      <InstallationClient />
    </Suspense>
  );
}
