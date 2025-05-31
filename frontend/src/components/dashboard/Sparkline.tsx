import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area,
} from 'recharts';

interface SparklineProps {
  /**
   * Data points for the sparkline
   */
  data: number[];
  
  /**
   * Color of the sparkline (without the text- prefix)
   */
  color?: string;
  
  /**
   * Height of the sparkline
   */
  height?: number;
}

/**
 * Small inline chart for showing trends in MetricCard components
 * 
 * @param props Component properties
 * @returns Sparkline component
 */
export function Sparkline({ data, color = 'blue-500', height = 40 }: SparklineProps) {
  // Convert the data array to the format expected by Recharts
  const chartData = data.map((value, index) => ({ value }));
  
  // Get the base color without the text- prefix
  const baseColor = color.replace('text-', '');
  
  // Determine fill and stroke colors
  const getStrokeColor = () => {
    switch (baseColor) {
      case 'green-500': return '#10b981';
      case 'red-500': return '#ef4444';
      case 'blue-500': return '#3b82f6';
      case 'gray-500': return '#6b7280';
      default: return '#3b82f6'; // Default to blue
    }
  };
  
  const getFillColor = () => {
    switch (baseColor) {
      case 'green-500': return 'rgba(16, 185, 129, 0.2)';
      case 'red-500': return 'rgba(239, 68, 68, 0.2)';
      case 'blue-500': return 'rgba(59, 130, 246, 0.2)';
      case 'gray-500': return 'rgba(107, 114, 128, 0.2)';
      default: return 'rgba(59, 130, 246, 0.2)'; // Default to blue
    }
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id={`sparkline-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={getStrokeColor()} stopOpacity={0.3} />
            <stop offset="95%" stopColor={getStrokeColor()} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={getStrokeColor()}
          strokeWidth={2}
          fill={`url(#sparkline-gradient-${color})`}
          fillOpacity={1}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
