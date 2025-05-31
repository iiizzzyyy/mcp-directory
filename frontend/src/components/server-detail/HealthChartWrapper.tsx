"use client";

import { useState, useEffect } from 'react';
import HealthChart from './HealthChart';

interface HealthChartWrapperProps {
  serverId: string;
}

export default function HealthChartWrapper({ serverId }: HealthChartWrapperProps) {
  const [healthHistory, setHealthHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // In a real implementation, this would fetch health history data for the server
    // For now, we'll use mock data
    const mockHealthHistory = [
      { status: 'online', last_check_time: new Date(Date.now() - 86400000).toISOString(), response_time_ms: 120 },
      { status: 'online', last_check_time: new Date(Date.now() - 172800000).toISOString(), response_time_ms: 115 },
      { status: 'degraded', last_check_time: new Date(Date.now() - 259200000).toISOString(), response_time_ms: 350 },
      { status: 'online', last_check_time: new Date(Date.now() - 345600000).toISOString(), response_time_ms: 130 },
      { status: 'online', last_check_time: new Date(Date.now() - 432000000).toISOString(), response_time_ms: 125 },
    ];
    
    setHealthHistory(mockHealthHistory);
    setIsLoading(false);
  }, [serverId]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-20 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  return <HealthChart healthHistory={healthHistory} />;
}
