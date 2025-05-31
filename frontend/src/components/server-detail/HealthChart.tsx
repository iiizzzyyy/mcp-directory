import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface HealthEntry {
  status: 'online' | 'degraded' | 'offline' | 'maintenance';
  last_check_time: string;
  response_time_ms?: number;
  error_message?: string;
}

interface HealthChartProps {
  healthHistory: HealthEntry[];
  daysToShow?: number;
}

/**
 * HealthChart - Visualizes server health history
 * 
 * Shows a 7-day history of server status checks with color-coded indicators
 */
export const HealthChart: React.FC<HealthChartProps> = ({
  healthHistory,
  daysToShow = 7
}) => {
  // Handle empty history
  if (!healthHistory || healthHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Health History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No health history available for this server.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort history by timestamp (newest first)
  const sortedHistory = [...healthHistory].sort((a, b) => 
    new Date(b.last_check_time).getTime() - new Date(a.last_check_time).getTime()
  );

  // Group health entries by day
  const groupedByDay: Record<string, HealthEntry[]> = {};
  
  // Calculate date range (last 7 days)
  const today = new Date();
  const dates: string[] = [];
  
  for (let i = 0; i < daysToShow; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    dates.unshift(dateStr);
    groupedByDay[dateStr] = [];
  }

  // Group entries by day
  sortedHistory.forEach(entry => {
    const dateStr = new Date(entry.last_check_time).toISOString().split('T')[0];
    if (groupedByDay[dateStr]) {
      groupedByDay[dateStr].push(entry);
    }
  });

  // Get color for status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      case 'maintenance': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  };

  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Format time for display
  const formatTime = (timeStr: string): string => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Health History (Last {daysToShow} Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          {/* Legend */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-green-500 mr-1"></div>
              <span>Online</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-yellow-500 mr-1"></div>
              <span>Degraded</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-red-500 mr-1"></div>
              <span>Offline</span>
            </div>
            <div className="flex items-center">
              <div className="h-3 w-3 rounded-full bg-blue-500 mr-1"></div>
              <span>Maintenance</span>
            </div>
          </div>
          
          {/* Health history chart */}
          <div className="grid grid-cols-7 gap-1 w-full">
            {dates.map(dateStr => (
              <div 
                key={dateStr}
                className="flex flex-col items-center"
              >
                <div className="text-xs text-center mb-1">{formatDate(dateStr)}</div>
                <div className="flex flex-col gap-1 items-center w-full">
                  {groupedByDay[dateStr].length > 0 ? (
                    groupedByDay[dateStr].map((entry, i) => (
                      <TooltipProvider key={i}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className={`h-4 w-4 rounded-full ${getStatusColor(entry.status)} cursor-pointer`}
                            ></div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <div>Status: <span className="capitalize">{entry.status}</span></div>
                              <div>Time: {formatTime(entry.last_check_time)}</div>
                              {entry.response_time_ms !== undefined && 
                                <div>Response: {entry.response_time_ms}ms</div>
                              }
                              {entry.error_message && 
                                <div className="text-xs text-red-500">{entry.error_message}</div>
                              }
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Uptime calculation */}
          {sortedHistory.length > 0 && (
            <div className="mt-4 text-sm">
              <div>
                Uptime: 
                <span className="font-medium ml-1">
                  {Math.round(sortedHistory.filter(entry => entry.status === 'online').length / sortedHistory.length * 100)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Based on {sortedHistory.length} checks in the last {daysToShow} days
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default HealthChart;
