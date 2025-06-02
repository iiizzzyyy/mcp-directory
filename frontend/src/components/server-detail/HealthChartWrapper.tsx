"use client";

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import HealthChart from './HealthChart';
import { useFetch } from '@/hooks/useFetch';

interface HealthChartWrapperProps {
  serverId: string;
}

// Define TypeScript interfaces for API response
interface HealthEntry {
  status: 'online' | 'degraded' | 'offline' | 'maintenance';
  last_check_time: string;
  response_time_ms?: number;
  error_message?: string;
}

interface HealthHistoryResponse {
  health_history: HealthEntry[];
}

export default function HealthChartWrapper({ serverId }: HealthChartWrapperProps) {
  // Use our custom hook to fetch health data
  const { data, error, loading, refetch } = useFetch<HealthHistoryResponse>(
    `/api/servers/${serverId}/health`
  );
  
  // If there's an error, show an error message with retry button
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load health data: {error.message}
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
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // If no data or empty health history, use fallback
  if (!data || !data.health_history || data.health_history.length === 0) {
    return <HealthChart healthHistory={[]} />;
  }

  // Return the chart with the fetched data
  return <HealthChart healthHistory={data.health_history} />;
}
