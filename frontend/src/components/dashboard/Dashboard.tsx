"use client";

import React, { useState, useEffect, useRef } from 'react';
import { MetricsChart } from './MetricsChart';
import { MetricCard } from './MetricCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, BarChart2, Clock, Zap, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { mockServers, generateMockMetrics, shouldUseMockData } from '@/lib/mock-data';

// Simple toggle switch component
interface ToggleSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onCheckedChange, className = '' }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-200'} ${className}`}
      onClick={() => onCheckedChange(!checked)}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
};

// Type definitions for the metrics API response
interface MetricsData {
  server_id: string;
  data_points: number;
  period_summary: {
    avg_latency_ms: number;
    avg_uptime_percent: number;
    avg_memory_mb: number;
    avg_throughput_rps: number;
  };
  metrics: {
    latency_ms: number[];
    uptime_percent: number[];
    memory_mb: number[];
    throughput_rps: number[];
  };
  timestamps: string[];
}

interface ServerInfo {
  id: string;
  name: string;
}

interface DashboardProps {
  serverId?: string;
  initialPeriod?: string;
}

/**
 * Dashboard component for displaying real-time server metrics
 * 
 * @param props Component properties
 * @returns Dashboard component
 */
export function Dashboard({ serverId, initialPeriod = '1d' }: DashboardProps) {
  // State for metrics data and loading
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<string>(initialPeriod);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [availableServers, setAvailableServers] = useState<ServerInfo[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | undefined>(serverId);
  const [liveMode, setLiveMode] = useState<boolean>(false);
  const [updateMethod, setUpdateMethod] = useState<'polling' | 'realtime'>('polling');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // References for cleanup
  const pollingIntervalRef = useRef<number | null>(null);
  const supabaseClientRef = useRef<any>(null);
  const supabaseSubscriptionRef = useRef<any>(null);

  // Mock data is now imported at the top of the file

  // Function to fetch metrics data
  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if we should use mock data (for static deployment)
      if (shouldUseMockData()) {
        // Generate mock data based on selected period and server
        const serverId = selectedServerId || 'server-1';
        const mockData = generateMockMetrics(serverId, selectedPeriod);
        
        // Create formatted metrics data from mock data
        const formattedData: MetricsData = {
          server_id: serverId,
          data_points: mockData.length,
          period_summary: {
            avg_latency_ms: mockData.reduce((sum: number, item: any) => sum + item.latency_ms, 0) / mockData.length,
            avg_uptime_percent: mockData.reduce((sum: number, item: any) => sum + item.uptime, 0) / mockData.length * 100,
            avg_memory_mb: mockData.reduce((sum: number, item: any) => sum + item.memory_mb, 0) / mockData.length,
            avg_throughput_rps: mockData.reduce((sum: number, item: any) => sum + item.throughput, 0) / mockData.length
          },
          metrics: {
            latency_ms: mockData.map((item: any) => item.latency_ms),
            uptime_percent: mockData.map((item: any) => item.uptime * 100),
            memory_mb: mockData.map((item: any) => item.memory_mb),
            throughput_rps: mockData.map((item: any) => item.throughput)
          },
          timestamps: mockData.map((item: any) => item.timestamp)
        };
        
        setMetricsData(formattedData);
        
        // If we have a server ID but no server info, get mock server info
        if (selectedServerId && !serverInfo) {
          const mockServerInfo = mockServers.find(s => s.id === selectedServerId);
          if (mockServerInfo) {
            setServerInfo({
              id: mockServerInfo.id,
              name: mockServerInfo.name
            });
          }
        }
        
        // Add a slight delay to simulate loading
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
        return;
      }

      // For non-static deployments, use actual API
      // Build query URL based on whether we have a server ID
      const queryParams = new URLSearchParams();
      if (selectedServerId) {
        queryParams.append('server_id', selectedServerId);
      }
      queryParams.append('period', selectedPeriod);

      // Fetch data from metrics API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/metrics?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch metrics data');
      }

      const result = await response.json();
      setMetricsData(result.data);

      // If we have a server ID but no server info, fetch it
      if (selectedServerId && !serverInfo) {
        fetchServerInfo(selectedServerId);
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to fetch server information
  const fetchServerInfo = async (id: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/servers?id=eq.${id}&select=id,name`,
        {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch server information');
      }

      const [server] = await response.json();
      if (server) {
        setServerInfo({
          id: server.id,
          name: server.name
        });
      }
    } catch (err) {
      console.error('Error fetching server info:', err);
    }
  };

  // Function to fetch available servers
  const fetchAvailableServers = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/servers?select=id,name&order=name.asc`,
        {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch available servers');
      }

      const servers = await response.json();
      setAvailableServers(servers);
    } catch (err) {
      console.error('Error fetching servers:', err);
    }
  };

  // Handle period change
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
  };

  // Handle server change
  const handleServerChange = (id: string | undefined) => {
    setSelectedServerId(id);
    setServerInfo(null); // Clear server info to trigger a new fetch
  };

  /**
   * Initializes the Supabase client for real-time subscriptions
   */
  const initializeSupabaseClient = () => {
    if (!supabaseClientRef.current) {
      supabaseClientRef.current = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
    }
    return supabaseClientRef.current;
  };

  /**
   * Sets up polling for real-time updates
   */
  const setupPolling = () => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    if (liveMode && updateMethod === 'polling') {
      // Set up polling every 60 seconds
      pollingIntervalRef.current = window.setInterval(() => {
        fetchMetrics();
      }, 60000) as unknown as number;
    }
  };

  /**
   * Sets up real-time subscription to server_metrics table
   */
  const setupRealtimeSubscription = () => {
    // Clean up any existing subscription
    cleanupRealtimeSubscription();

    if (liveMode && updateMethod === 'realtime') {
      const supabase = initializeSupabaseClient();

      // Set up channel and subscription
      const channel = supabase.channel('server_metrics_changes');

      // Handle the insert event for server_metrics
      supabaseSubscriptionRef.current = channel
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'server_metrics',
          filter: selectedServerId ? `server_id=eq.${selectedServerId}` : undefined
        }, (payload: { new: Record<string, any> }) => {
          console.log('New metric data:', payload);
          fetchMetrics(); // Refresh metrics data when new data is inserted
          setLastUpdated(new Date());
        })
        .subscribe();
    }
  };

  /**
   * Cleans up real-time subscription
   */
  const cleanupRealtimeSubscription = () => {
    if (supabaseSubscriptionRef.current) {
      const supabase = supabaseClientRef.current;
      if (supabase) {
        supabase.channel('server_metrics_changes').unsubscribe();
      }
      supabaseSubscriptionRef.current = null;
    }
  };

  /**
   * Handles Live Mode toggle change
   */
  const handleLiveModeChange = (isEnabled: boolean) => {
    setLiveMode(isEnabled);
  };

  /**
   * Handles update method change (polling vs. realtime)
   */
  const handleUpdateMethodChange = (method: 'polling' | 'realtime') => {
    setUpdateMethod(method);
  };

  // Refresh data manually
  const refreshData = () => {
    fetchMetrics();
    setLastUpdated(new Date());
  };

  // Fetch metrics data initially and set up real-time updates based on selection
  useEffect(() => {
    fetchMetrics();
    setLastUpdated(new Date());
    
    return () => {
      // Clean up on unmount
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      cleanupRealtimeSubscription();
    };
  }, [selectedPeriod, selectedServerId]);

  // Set up or tear down real-time updates when live mode or update method changes
  useEffect(() => {
    if (liveMode) {
      if (updateMethod === 'polling') {
        setupPolling();
        cleanupRealtimeSubscription();
      } else {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
        setupRealtimeSubscription();
      }
    } else {
      // Clean up all real-time updates when live mode is off
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      cleanupRealtimeSubscription();
    }

    // Clean up on unmount or when dependencies change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      cleanupRealtimeSubscription();
    };
  }, [liveMode, updateMethod]);

  // Fetch available servers on component mount
  useEffect(() => {
    fetchAvailableServers();
  }, []);

  // Calculate trends between the last two data points
  const calculateTrend = (currentData: number[], previousData?: number[]) => {
    if (!previousData || previousData.length === 0 || currentData.length === 0) {
      return { direction: 0, percent: 0 };
    }

    const current = currentData[currentData.length - 1];
    const previous = previousData[previousData.length - 1];

    if (previous === 0) return { direction: 0, percent: 0 };

    const percentChange = ((current - previous) / previous) * 100;
    const direction = percentChange > 0 ? 1 : percentChange < 0 ? -1 : 0;

    return { direction, percent: Math.abs(percentChange) };
  };

  // Helper function to render summary cards
  const renderSummaryCards = () => {
    if (!metricsData) {
      return (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-8 w-1/2 mb-2" />
              <Skeleton className="h-12 w-full" />
            </Card>
          ))}
        </div>
      );
    }

    const { period_summary, metrics } = metricsData;

    // Get the latest 20 data points for sparklines
    const getSparklineData = (dataArray: number[]) => {
      return dataArray.slice(-20);
    };

    // Calculate trends
    const latencyTrend = calculateTrend(
      metrics.latency_ms,
      metrics.latency_ms.slice(0, -1)
    );
    const uptimeTrend = calculateTrend(
      metrics.uptime_percent,
      metrics.uptime_percent.slice(0, -1)
    );
    const memoryTrend = calculateTrend(
      metrics.memory_mb,
      metrics.memory_mb.slice(0, -1)
    );
    const throughputTrend = calculateTrend(
      metrics.throughput_rps,
      metrics.throughput_rps.slice(0, -1)
    );

    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Latency"
          value={period_summary.avg_latency_ms.toFixed(1)}
          unit="ms"
          icon={<Clock className="h-4 w-4" />}
          trend={latencyTrend.direction as 1 | 0 | -1}
          trendPercent={latencyTrend.percent}
          upIsGood={false} // Lower latency is better
          sparklineData={getSparklineData(metrics.latency_ms)}
          description="Average response time"
        />
        <MetricCard
          title="Uptime"
          value={period_summary.avg_uptime_percent.toFixed(2)}
          unit="%"
          icon={<Activity className="h-4 w-4" />}
          trend={uptimeTrend.direction as 1 | 0 | -1}
          trendPercent={uptimeTrend.percent}
          upIsGood={true} // Higher uptime is better
          sparklineData={getSparklineData(metrics.uptime_percent)}
          description="Server availability"
        />
        <MetricCard
          title="Memory Usage"
          value={period_summary.avg_memory_mb.toFixed(0)}
          unit="MB"
          icon={<BarChart2 className="h-4 w-4" />}
          trend={memoryTrend.direction as 1 | 0 | -1}
          trendPercent={memoryTrend.percent}
          upIsGood={false} // Lower memory usage is better
          sparklineData={getSparklineData(metrics.memory_mb)}
          description="Average memory consumption"
        />
        <MetricCard
          title="Throughput"
          value={period_summary.avg_throughput_rps.toFixed(1)}
          unit="rps"
          icon={<Zap className="h-4 w-4" />}
          trend={throughputTrend.direction as 1 | 0 | -1}
          trendPercent={throughputTrend.percent}
          upIsGood={true} // Higher throughput is better
          sparklineData={getSparklineData(metrics.throughput_rps)}
          description="Requests per second"
        />
      </div>
    );
  };

  // Render charts
  const renderCharts = () => {
    if (!metricsData || isLoading) {
      return (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-8 w-1/3 mb-2" />
              <Skeleton className="h-[200px] w-full" />
            </Card>
          ))}
        </div>
      );
    }

    const { metrics, timestamps } = metricsData;

    return (
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
        <MetricsChart
          title="Latency (ms)"
          data={metrics.latency_ms}
          timestamps={timestamps}
          dataKey="latency"
          yAxisLabel="ms"
          color="#0ea5e9"
          formatTooltip={(value) => `${value.toFixed(1)} ms`}
        />
        <MetricsChart
          title="Uptime (%)"
          data={metrics.uptime_percent}
          timestamps={timestamps}
          dataKey="uptime"
          yAxisLabel="%"
          color="#10b981"
          formatTooltip={(value) => `${value.toFixed(2)}%`}
        />
        <MetricsChart
          title="Memory Usage (MB)"
          data={metrics.memory_mb}
          timestamps={timestamps}
          dataKey="memory"
          yAxisLabel="MB"
          color="#f59e0b"
          formatTooltip={(value) => `${value.toFixed(0)} MB`}
        />
        <MetricsChart
          title="Throughput (rps)"
          data={metrics.throughput_rps}
          timestamps={timestamps}
          dataKey="throughput"
          yAxisLabel="rps"
          color="#8b5cf6"
          formatTooltip={(value) => `${value.toFixed(1)} rps`}
        />
      </div>
    );
  };

  // Render server selection and data info
  const renderDataInfo = () => {
    return (
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mt-4 mb-6">
        <div>
          {serverInfo ? (
            <h2 className="text-xl font-semibold mb-1">
              {serverInfo.name} <Badge variant="outline">{serverInfo.id}</Badge>
            </h2>
          ) : selectedServerId ? (
            <h2 className="text-xl font-semibold mb-1">
              <Skeleton className="h-6 w-40" />
            </h2>
          ) : (
            <h2 className="text-xl font-semibold mb-1">All Servers</h2>
          )}
          
          {metricsData && (
            <p className="text-sm text-muted-foreground">
              {metricsData.data_points} data points • Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-2 mt-4 md:mt-0">
          <div className="flex items-center gap-2 mr-4">
            <button 
              onClick={refreshData}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Live</span>
              <ToggleSwitch checked={liveMode} onCheckedChange={handleLiveModeChange} />
            </div>
            
            {liveMode && (
              <div className="flex items-center gap-2 ml-4">
                <select
                  className="px-2 py-1 border rounded-md text-xs"
                  value={updateMethod}
                  onChange={(e) => handleUpdateMethodChange(e.target.value as 'polling' | 'realtime')}
                >
                  <option value="polling">60s Polling</option>
                  <option value="realtime">Realtime</option>
                </select>
              </div>
            )}
          </div>
          
          <select 
            className="px-3 py-2 border rounded-md text-sm"
            value={selectedServerId || ""}
            onChange={(e) => handleServerChange(e.target.value || undefined)}
          >
            <option value="">All Servers</option>
            {availableServers.map(server => (
              <option key={server.id} value={server.id}>{server.name}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Performance Dashboard</h1>
        
        <Tabs 
          value={selectedPeriod} 
          onValueChange={handlePeriodChange}
          className="w-full md:w-auto"
        >
          <TabsList className="grid grid-cols-4 md:grid-cols-7 w-full md:w-auto">
            <TabsTrigger value="1h">1h</TabsTrigger>
            <TabsTrigger value="6h">6h</TabsTrigger>
            <TabsTrigger value="12h">12h</TabsTrigger>
            <TabsTrigger value="1d">1d</TabsTrigger>
            <TabsTrigger value="7d">7d</TabsTrigger>
            <TabsTrigger value="30d">30d</TabsTrigger>
            <TabsTrigger value="90d">90d</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      {renderDataInfo()}
      {renderSummaryCards()}
      {renderCharts()}
    </div>
  );
}
