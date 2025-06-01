"use client";

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import StaticDocumentationSection from './StaticDocumentationSection';
import { useFetch } from '@/hooks/useFetch';

interface StaticDocumentationSectionWrapperProps {
  serverId: string;
}

// Define TypeScript interface for API response
interface DocumentationResponse {
  content: string;
  format: 'markdown' | 'html';
  title?: string;
}

export default function StaticDocumentationSectionWrapper({ 
  serverId 
}: StaticDocumentationSectionWrapperProps) {
  // Use our custom hook to fetch documentation data
  const { data, error, loading, refetch } = useFetch<DocumentationResponse>(
    `/api/servers/${serverId}/documentation`
  );
  
  // If there's an error, show an error message with retry button
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load documentation: {error.message}
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
      <div className="space-y-4">
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  // If no data, show empty state
  if (!data || !data.content) {
    return <StaticDocumentationSection documentation={null} />;
  }

  // Return the documentation section with the fetched data
  return <StaticDocumentationSection documentation={data} />;
}
