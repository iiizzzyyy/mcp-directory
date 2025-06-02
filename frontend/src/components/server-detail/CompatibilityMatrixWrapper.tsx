"use client";

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import CompatibilityMatrix from './CompatibilityMatrix';
import { CompatibilityItem } from './CompatibilityMatrix';
import { useFetch } from '@/hooks/useFetch';

interface CompatibilityMatrixWrapperProps {
  serverId: string;
}

// Define TypeScript interface for API response
interface CompatibilityResponse {
  compatibility: CompatibilityItem[];
}

export default function CompatibilityMatrixWrapper({ serverId }: CompatibilityMatrixWrapperProps) {
  // Use our custom hook to fetch compatibility data
  const { data, error, loading, refetch } = useFetch<CompatibilityResponse>(
    `/api/servers/${serverId}/compatibility`
  );
  
  // If there's an error, show an error message with retry button
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load compatibility data: {error.message}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()} 
            className="mt-2 ml-2"
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show skeleton UI while loading
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-[120px] w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  // If no data or empty compatibility, use empty array
  if (!data || !data.compatibility) {
    return <CompatibilityMatrix compatibility={[]} />;
  }

  // Return the compatibility matrix with the fetched data
  return <CompatibilityMatrix compatibility={data.compatibility} />;
}
