'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

/**
 * Error component for the server detail page
 * Displayed when an error occurs during rendering or data fetching
 */
export default function ServerDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log the error to an error reporting service
  useEffect(() => {
    console.error('Server detail page error:', error);
    // Here you could send to an error reporting service
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
        <AlertCircle className="h-10 w-10 text-red-600" />
      </div>
      
      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        Error Loading Server Details
      </h1>
      
      <p className="mt-3 text-lg text-muted-foreground max-w-md">
        {error.message || "We couldn't load the server details. Please try again later."}
      </p>
      
      <div className="mt-8 flex gap-4">
        <Button onClick={reset} variant="default">
          Try Again
        </Button>
        <Button variant="outline" asChild>
          <Link href="/servers">
            Back to Servers List
          </Link>
        </Button>
      </div>
    </div>
  );
}
