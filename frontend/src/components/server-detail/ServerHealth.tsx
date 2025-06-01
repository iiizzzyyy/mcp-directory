import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import HealthChart from './HealthChart';

interface ServerHealthProps {
  serverId: string;
  daysToShow?: number;
}

// Define TypeScript interfaces for API response
interface HealthEntry {
  status: 'online' | 'degraded' | 'offline' | 'maintenance';
  last_check_time: string;
  response_time_ms?: number;
  error_message?: string;
}

export default async function ServerHealth({ 
  serverId, 
  daysToShow = 30 
}: ServerHealthProps) {
  try {
    // Create a Supabase client for server component
    const supabase = createServerComponentClient({ cookies });
    
    // Calculate date range filter based on daysToShow
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - daysToShow);

    // Query server_health table
    const { data: healthData, error } = await supabase
      .from('server_health')
      .select('*')
      .eq('server_id', serverId)
      .gte('last_check_time', fromDate.toISOString())
      .order('last_check_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch health data: ${error.message}`);
    }
    
    // If no health data found, try fetching from edge function as fallback
    if (!healthData || healthData.length === 0) {
      try {
        // Use a direct edge function call as fallback
        const { data, error } = await supabase.functions.invoke('get-server-health', {
          body: { serverId, daysToShow }
        });

        if (error) throw error;
        
        return <HealthChart healthHistory={data?.health_history || []} />;
      } catch (functionError) {
        console.error("Error fetching from edge function:", functionError);
        // Return empty chart rather than error for better UX
        return <HealthChart healthHistory={[]} />;
      }
    }
    
    // Map database result to expected format for the chart component
    const healthHistory = healthData.map(entry => ({
      status: entry.status as 'online' | 'degraded' | 'offline' | 'maintenance',
      last_check_time: entry.last_check_time,
      response_time_ms: entry.response_time_ms,
      error_message: entry.error_message
    }));
    
    // Return the chart with the fetched data
    return <HealthChart healthHistory={healthHistory} />;
    
  } catch (error) {
    console.error("Error in ServerHealth:", error);
    
    // Show error UI
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load health data"}
        </AlertDescription>
      </Alert>
    );
  }
}
