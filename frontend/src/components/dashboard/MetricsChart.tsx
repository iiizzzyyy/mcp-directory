import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricsChartProps {
  title: string;
  data: number[];
  timestamps: string[];
  dataKey: string;
  yAxisLabel: string;
  color: string;
  formatTooltip?: (value: number) => string;
}

/**
 * Renders a line chart for a specific metric type
 * 
 * @param props Component properties
 * @returns Chart component for a specific metric
 */
export function MetricsChart({
  title,
  data,
  timestamps,
  dataKey,
  yAxisLabel,
  color,
  formatTooltip
}: MetricsChartProps) {
  // Format the timestamps for display
  const formattedData = data.map((value, index) => ({
    timestamp: new Date(timestamps[index]).toLocaleString(),
    [dataKey]: value
  }));

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{
                top: 5,
                right: 10,
                left: 10,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.1} />
              <XAxis 
                dataKey="timestamp" 
                tick={{ fontSize: 10 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                }}
              />
              <YAxis 
                label={{ 
                  value: yAxisLabel, 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fontSize: 10 }
                }} 
                tick={{ fontSize: 10 }}
              />
              <Tooltip 
                formatter={(value: number) => [
                  formatTooltip ? formatTooltip(value) : value, 
                  dataKey
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 6 }}
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
