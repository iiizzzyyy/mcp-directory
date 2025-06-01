'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

/**
 * Error component for the servers list page
 * Displayed when an error occurs during rendering or data fetching
 */
export default function ServersListError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Servers list page error:', error);
    // Here you could send to an error reporting service
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <AlertCircle className="h-10 w-10 text-red-600" />
      </div>
      
      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        Error Loading Servers
      </h1>
      
      <p className="mt-3 text-lg text-muted-foreground max-w-md">
        {error.message || "We couldn't load the servers list. Please try again later."}
      </p>
      
      <div className="mt-8">
        <Button onClick={reset} variant="default">
          Try Again
        </Button>
      </div>
    </div>
  );
}
