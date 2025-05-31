"use client";

import React from 'react';

// Simplified health chart component for the server detail page
interface HealthDataPoint {
  date: string;
  status: 'online' | 'degraded' | 'offline';
}

interface HealthChartProps {
  healthData: HealthDataPoint[];
}

export const HealthChart: React.FC<HealthChartProps> = ({ healthData }) => {
  if (!healthData || healthData.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No health data available.
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1">
      {healthData.map((item, index) => (
        <div key={index} className="flex flex-col items-center">
          <div 
            className={`w-6 h-6 rounded-full flex items-center justify-center ${
              item.status === 'online' 
                ? 'bg-green-100' 
                : item.status === 'degraded' 
                  ? 'bg-yellow-100' 
                  : 'bg-red-100'
            }`}
          >
            <div 
              className={`w-3 h-3 rounded-full ${
                item.status === 'online' 
                  ? 'bg-green-500' 
                  : item.status === 'degraded' 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
              }`} 
              title={`${item.date}: ${item.status}`}
            />
          </div>
          <span className="text-xs text-gray-500 mt-1">
            {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).replace(' ', '\n')}
          </span>
        </div>
      ))}
    </div>
  );
};

export default HealthChart;
