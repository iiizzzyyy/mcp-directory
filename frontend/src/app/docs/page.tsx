import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Import the main component with SSR disabled to prevent window is not defined errors
const ClientDocsPage = dynamic(
  () => import('./client-page'),
  { ssr: false }
);

/**
 * Main documentation index page
 */
export default function DocsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading documentation...</div>}>
      <ClientDocsPage />
    </Suspense>
  );
}
