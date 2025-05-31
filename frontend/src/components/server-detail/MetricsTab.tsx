"use client";

import React, { useState } from 'react';
import { Info, Clock, Activity, Zap } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Metric period options
type MetricPeriod = '1h' | '6h' | '12h' | '1d' | '7d' | '30d' | '90d';

interface MetricData {
  timestamp: string;
  value: number;
}

interface ServerMetrics {
  uptime: MetricData[];
  latency: MetricData[];
  requests: MetricData[];
  memory: MetricData[];
}

interface MetricsTabProps {
  serverId: string;
  isLoading?: boolean;
  metrics?: ServerMetrics;
}

/**
 * MetricsTab component displays performance metrics for the MCP server
 */
export function MetricsTab({ serverId, isLoading = false, metrics }: MetricsTabProps) {
  // State for the selected time period
  const [period, setPeriod] = useState<MetricPeriod>('7d');
  
  // Handle period change
  const handlePeriodChange = (value: string) => {
    setPeriod(value as MetricPeriod);
  };
  
  // Empty state when no metrics available
  if (!metrics && !isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
          <Info className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No metrics available</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Performance metrics for this MCP server have not been collected yet.
        </p>
      </div>
    );
  }
  
  // Calculate summary metrics (averages, totals)
  const calculateSummaryMetrics = () => {
    if (!metrics) return null;
    
    // Get data for the selected period
    // In a real implementation, we would filter by the selected period
    
    // Calculate average latency
    const avgLatency = metrics.latency.length > 0
      ? metrics.latency.reduce((acc, item) => acc + item.value, 0) / metrics.latency.length
      : 0;
    
    // Calculate uptime percentage
    const uptimePercentage = metrics.uptime.length > 0
      ? (metrics.uptime.filter(item => item.value === 1).length / metrics.uptime.length) * 100
      : 0;
    
    // Calculate total requests
    const totalRequests = metrics.requests.reduce((acc, item) => acc + item.value, 0);
    
    // Calculate average memory usage
    const avgMemory = metrics.memory.length > 0
      ? metrics.memory.reduce((acc, item) => acc + item.value, 0) / metrics.memory.length
      : 0;
    
    return {
      avgLatency,
      uptimePercentage,
      totalRequests,
      avgMemory
    };
  };
  
  const summaryMetrics = calculateSummaryMetrics();
  
  return (
    <div className="space-y-6">
      {/* Time period selector */}
      <div className="flex justify-end">
        <Tabs value={period} onValueChange={handlePeriodChange} className="w-auto">
          <TabsList>
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
      
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Uptime card */}
        <MetricCard
          title="Uptime"
          value={isLoading ? undefined : `${summaryMetrics?.uptimePercentage.toFixed(2)}%`}
          icon={<Clock className="h-4 w-4" />}
          description={`Over the last ${period}`}
          isLoading={isLoading}
        />
        
        {/* Latency card */}
        <MetricCard
          title="Avg. Latency"
          value={isLoading ? undefined : `${summaryMetrics?.avgLatency.toFixed(2)}ms`}
          icon={<Activity className="h-4 w-4" />}
          description={`Over the last ${period}`}
          isLoading={isLoading}
        />
        
        {/* Requests card */}
        <MetricCard
          title="Total Requests"
          value={isLoading ? undefined : summaryMetrics?.totalRequests.toLocaleString()}
          icon={<Zap className="h-4 w-4" />}
          description={`Over the last ${period}`}
          isLoading={isLoading}
        />
        
        {/* Memory card */}
        <MetricCard
          title="Avg. Memory"
          value={isLoading ? undefined : `${(summaryMetrics?.avgMemory || 0).toFixed(2)}MB`}
          icon={<Info className="h-4 w-4" />}
          description={`Over the last ${period}`}
          isLoading={isLoading}
        />
      </div>
      
      {/* Charts section - we would implement actual charts here */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uptime & Latency chart */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">Uptime & Latency</h3>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <div className="h-[300px] w-full flex items-center justify-center bg-muted rounded-md">
              <p className="text-muted-foreground">Chart visualization would go here</p>
            </div>
          )}
        </div>
        
        {/* Requests chart */}
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">Request Volume</h3>
          {isLoading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <div className="h-[300px] w-full flex items-center justify-center bg-muted rounded-md">
              <p className="text-muted-foreground">Chart visualization would go here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper component for metric cards
interface MetricCardProps {
  title: string;
  value?: string;
  icon: React.ReactNode;
  description?: string;
  isLoading?: boolean;
}

function MetricCard({ title, value, icon, description, isLoading = false }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-7 w-1/2 mb-1" />
        ) : (
          <div className="text-2xl font-bold">{value || 'N/A'}</div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default MetricsTab;
