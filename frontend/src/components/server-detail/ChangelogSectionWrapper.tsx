"use client";

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ChangelogSection from './ChangelogSection';
import { ChangelogEntry } from './ChangelogSection';
import { useFetch } from '@/hooks/useFetch';

interface ChangelogSectionWrapperProps {
  serverId: string;
}

// Define TypeScript interface for API response
interface ChangelogResponse {
  changelog: ChangelogEntry[];
}

export default function ChangelogSectionWrapper({ serverId }: ChangelogSectionWrapperProps) {
  // Use our custom hook to fetch changelog data
  const { data, error, loading, refetch } = useFetch<ChangelogResponse>(
    `/api/servers/${serverId}/changelog`
  );
  
  // If there's an error, show an error message with retry button
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load changelog data: {error.message}
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

  // For demonstration purposes, if the response is missing or we're still waiting for real API,
  // we'll use mock data to show how the component should look
  const mockChangelogData: ChangelogEntry[] = [
      {
        version: '1.2.0',
        date: '2025-05-15',
        changes: [
          'Added support for TypeScript SDK',
          'Improved error handling',
          'Fixed cache invalidation issues'
        ]
      },
      {
        version: '1.1.0',
        date: '2025-04-01',
        changes: [
          'Added Python SDK support',
          'Performance improvements',
          'Bug fixes for authentication'
        ]
      },
      {
        version: '1.0.0',
        date: '2025-03-10',
        changes: [
          'Initial release',
          'Basic API functionality',
          'JavaScript SDK'
        ]
      }
    ];
    
  // Show skeleton UI while loading
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  // If no data or empty changelog, use the mock data as fallback
  // In a production environment, you would handle this differently
  if (!data || !data.changelog) {
    return <ChangelogSection changelog={mockChangelogData} />;
  }

  // Return the changelog with the fetched data
  return <ChangelogSection changelog={data.changelog} />;
}
