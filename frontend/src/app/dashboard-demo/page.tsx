"use client";

import React, { useState } from 'react';
import { StatCard, DataPoint } from '@/components/dashboard/stat-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  ArrowUpRight, 
  Users, 
  Server, 
  Activity, 
  Clock, 
  Star, 
  Code, 
  DownloadCloud, 
  Zap 
} from 'lucide-react';

/**
 * Generates sample data for demonstration
 * 
 * @param points - Number of data points to generate
 * @param trend - Trend direction (up, down, volatile)
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Array of data points
 */
function generateSampleData(
  points: number = 20, 
  trend: 'up' | 'down' | 'volatile' = 'up',
  min: number = 10,
  max: number = 100
): DataPoint[] {
  const data: DataPoint[] = [];
  
  let value = Math.floor(Math.random() * (max - min) + min);
  
  for (let i = 0; i < points; i++) {
    // Generate next value based on trend
    if (trend === 'up') {
      // Upward trend with some noise
      value += Math.floor(Math.random() * 10) - 3;
    } else if (trend === 'down') {
      // Downward trend with some noise
      value -= Math.floor(Math.random() * 10) - 3;
    } else {
      // Volatile/random
      value += Math.floor(Math.random() * 20) - 10;
    }
    
    // Keep within bounds
    value = Math.max(min, Math.min(max, value));
    
    // Add to data array
    data.push({
      value,
      timestamp: Date.now() - (points - i) * 3600000 // hourly data going back in time
    });
  }
  
  return data;
}

/**
 * Demo page for stat cards with various configurations
 */
export default function DashboardDemoPage() {
  const [useRecharts, setUseRecharts] = useState(true);
  
  // Generate sample data sets
  const upwardTrend = generateSampleData(24, 'up', 50, 200);
  const downwardTrend = generateSampleData(24, 'down', 50, 200);
  const volatileTrend = generateSampleData(24, 'volatile', 50, 200);
  
  // Current and previous values for change indicators
  const currentActiveUsers = 1243;
  const previousActiveUsers = 987;
  
  const currentServers = 87;
  const previousServers = 92;
  
  const currentAvgLatency = 217;
  const previousAvgLatency = 289;
  
  const currentUptime = 99.98;
  const previousUptime = 99.95;
  
  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Dashboard Stat Cards</h1>
      <p className="text-muted-foreground mb-8">
        Demonstration of stat cards with title, value, trend/sparkline for dashboard use
      </p>
      
      {/* Visualization toggle */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-semibold">Visualization Options</h2>
        <div className="flex items-center space-x-4">
          <Button
            variant={useRecharts ? "default" : "outline"}
            onClick={() => setUseRecharts(true)}
          >
            Recharts
          </Button>
          <Button
            variant={!useRecharts ? "default" : "outline"}
            onClick={() => setUseRecharts(false)}
          >
            Tailwind Sparkline
          </Button>
        </div>
      </div>
      
      {/* Dashboard examples */}
      <Tabs defaultValue="realtime" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="realtime">Real-Time Metrics</TabsTrigger>
          <TabsTrigger value="business">Business Metrics</TabsTrigger>
          <TabsTrigger value="variations">Variations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="realtime">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Active Users"
              value={currentActiveUsers.toLocaleString()}
              trendData={upwardTrend}
              change={{
                value: currentActiveUsers,
                previousValue: previousActiveUsers,
                isPositiveGood: true,
                label: "vs. last week: "
              }}
              icon={<Users className="h-4 w-4" />}
              color="primary"
              useRecharts={useRecharts}
            />
            
            <StatCard
              title="MCP Servers"
              value={currentServers.toLocaleString()}
              trendData={downwardTrend}
              change={{
                value: currentServers,
                previousValue: previousServers,
                isPositiveGood: true,
                label: "vs. last week: "
              }}
              icon={<Server className="h-4 w-4" />}
              color="secondary"
              useRecharts={useRecharts}
            />
            
            <StatCard
              title="Avg. Latency"
              value={`${currentAvgLatency.toLocaleString()} ms`}
              trendData={downwardTrend}
              change={{
                value: currentAvgLatency,
                previousValue: previousAvgLatency,
                isPositiveGood: false,
                label: "vs. last week: "
              }}
              icon={<Activity className="h-4 w-4" />}
              color="danger"
              useRecharts={useRecharts}
            />
            
            <StatCard
              title="Uptime"
              value={`${currentUptime.toFixed(2)}%`}
              trendData={upwardTrend}
              change={{
                value: currentUptime,
                previousValue: previousUptime,
                isPositiveGood: true,
                label: "vs. last week: "
              }}
              icon={<Clock className="h-4 w-4" />}
              color="success"
              useRecharts={useRecharts}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="business">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Users"
              value="12,438"
              trendData={upwardTrend}
              change={{
                value: 12438,
                previousValue: 10234,
                isPositiveGood: true
              }}
              icon={<Users className="h-4 w-4" />}
              color="primary"
              useRecharts={useRecharts}
            />
            
            <StatCard
              title="Average Rating"
              value="4.8"
              trendData={upwardTrend}
              change={{
                value: 4.8,
                previousValue: 4.6,
                isPositiveGood: true
              }}
              icon={<Star className="h-4 w-4" />}
              color="warning"
              useRecharts={useRecharts}
            />
            
            <StatCard
              title="API Calls"
              value="1.2M"
              trendData={volatileTrend}
              change={{
                value: 1200000,
                previousValue: 980000,
                isPositiveGood: true
              }}
              icon={<Code className="h-4 w-4" />}
              color="secondary"
              useRecharts={useRecharts}
            />
            
            <StatCard
              title="Downloads"
              value="24,892"
              trendData={upwardTrend}
              change={{
                value: 24892,
                previousValue: 18945,
                isPositiveGood: true
              }}
              icon={<DownloadCloud className="h-4 w-4" />}
              color="success"
              useRecharts={useRecharts}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="variations">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="No Trend"
              description="Value and change only"
              value="6,789"
              change={{
                value: 6789,
                previousValue: 5432,
                isPositiveGood: true
              }}
              icon={<Zap className="h-4 w-4" />}
              color="primary"
              useRecharts={useRecharts}
            />
            
            <StatCard
              title="No Change"
              description="Value and trend only"
              value="42"
              trendData={volatileTrend}
              icon={<ArrowUpRight className="h-4 w-4" />}
              color="warning"
              useRecharts={useRecharts}
            />
            
            <StatCard
              title="Raw Difference"
              description="Shows absolute change"
              value="$12,345"
              trendData={upwardTrend}
              change={{
                value: 12345,
                previousValue: 10000,
                isPositiveGood: true,
                showRawDifference: true,
                label: "Increase of $"
              }}
              color="success"
              useRecharts={useRecharts}
            />
            
            <StatCard
              title="Negative Change"
              description="Decreasing metric"
              value="567"
              trendData={downwardTrend}
              change={{
                value: 567,
                previousValue: 892,
                isPositiveGood: true
              }}
              color="danger"
              useRecharts={useRecharts}
            />
            
            <StatCard
              title="Negative is Good"
              description="Lower is better"
              value="28ms"
              trendData={downwardTrend}
              change={{
                value: 28,
                previousValue: 42,
                isPositiveGood: false
              }}
              color="success"
              useRecharts={useRecharts}
            />
            
            <StatCard
              title="Basic"
              description="Simple value only"
              value="42,314"
              useRecharts={useRecharts}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
