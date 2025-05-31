"use client";

import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';

/**
 * Data point for trends and sparklines
 */
export interface DataPoint {
  value: number;
  timestamp?: string | number;
}

/**
 * Stat change indicator properties
 */
export interface StatChangeProps {
  /**
   * Current value
   */
  value: number;
  
  /**
   * Previous value for comparison
   */
  previousValue: number;
  
  /**
   * Whether a higher value is better (affects color)
   */
  isPositiveGood?: boolean;
  
  /**
   * Text to display before the percentage
   */
  label?: string;
  
  /**
   * Show as raw difference instead of percentage
   */
  showRawDifference?: boolean;
}

/**
 * Stat card properties
 */
export interface StatCardProps {
  /**
   * Card title
   */
  title: string;
  
  /**
   * Card description/subtitle
   */
  description?: string;
  
  /**
   * Main value to display
   */
  value: string | number;
  
  /**
   * Chart/trend data points
   */
  trendData?: DataPoint[];
  
  /**
   * Trend comparison data
   */
  change?: StatChangeProps;
  
  /**
   * Accent color for the chart
   */
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  
  /**
   * Whether to use Recharts (true) or Tailwind sparkline (false)
   */
  useRecharts?: boolean;
  
  /**
   * Icon to display
   */
  icon?: React.ReactNode;
  
  /**
   * Additional CSS class names
   */
  className?: string;
}

/**
 * Component to display a percentage or raw change with colored indicator
 */
export function StatChange({
  value,
  previousValue,
  isPositiveGood = true,
  label = "",
  showRawDifference = false
}: StatChangeProps) {
  // Calculate change percentage or raw difference
  const calculateChange = () => {
    if (previousValue === 0) return value > 0 ? 100 : 0;
    
    if (showRawDifference) {
      return value - previousValue;
    }
    
    return ((value - previousValue) / Math.abs(previousValue)) * 100;
  };
  
  const change = calculateChange();
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  // Determine color and icon based on change and whether higher is better
  const isGood = (isPositiveGood && isPositive) || (!isPositiveGood && !isPositive);
  
  let textColorClass = 'text-muted-foreground';
  let icon = <Minus className="h-4 w-4" />;
  
  if (!isNeutral) {
    textColorClass = isGood ? 'text-emerald-500' : 'text-rose-500';
    icon = isPositive 
      ? <ArrowUp className={`h-4 w-4 ${isGood ? 'text-emerald-500' : 'text-rose-500'}`} />
      : <ArrowDown className={`h-4 w-4 ${isGood ? 'text-emerald-500' : 'text-rose-500'}`} />;
  }
  
  // Format the displayed change value
  const formattedChange = showRawDifference
    ? Math.abs(change).toLocaleString(undefined, { 
        maximumFractionDigits: 2,
        minimumFractionDigits: 0
      })
    : Math.abs(change).toFixed(1) + '%';
  
  return (
    <div className={`flex items-center space-x-1 ${textColorClass}`}>
      {icon}
      <span className="text-sm font-medium">
        {label}
        {isPositive ? '+' : isNeutral ? '' : '-'}{formattedChange}
      </span>
    </div>
  );
}

/**
 * Simple sparkline implementation using Tailwind CSS
 */
export function TailwindSparkline({
  data,
  color = 'primary',
  height = 24
}: {
  data: DataPoint[];
  color?: StatCardProps['color'];
  height?: number;
}) {
  if (!data || data.length === 0) return null;
  
  // Normalize data for display
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // Avoid division by zero
  
  // Map values to heights
  const normPoints = values.map(val => {
    const normalized = ((val - min) / range) * height;
    return Math.max(1, normalized); // Ensure at least 1px height
  });
  
  // Get color class based on the color prop
  const getColorClass = () => {
    switch (color) {
      case 'primary': return 'bg-primary';
      case 'secondary': return 'bg-secondary';
      case 'success': return 'bg-emerald-500';
      case 'warning': return 'bg-amber-500';
      case 'danger': return 'bg-rose-500';
      default: return 'bg-slate-200 dark:bg-slate-700';
    }
  };
  
  const colorClass = getColorClass();
  
  return (
    <div className="flex items-end justify-between h-6 gap-[1px]">
      {normPoints.map((height, i) => (
        <div
          key={i}
          className={`w-1 rounded-sm ${colorClass} opacity-80`}
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
}

/**
 * Recharts implementation of sparkline
 */
export function RechartsSparkline({
  data,
  color = 'primary'
}: {
  data: DataPoint[];
  color?: StatCardProps['color'];
}) {
  if (!data || data.length === 0) return null;
  
  // Get color based on the color prop
  const getColor = () => {
    switch (color) {
      case 'primary': return 'hsl(var(--primary))';
      case 'secondary': return 'hsl(var(--secondary))';
      case 'success': return '#10b981'; // emerald-500
      case 'warning': return '#f59e0b'; // amber-500
      case 'danger': return '#f43f5e'; // rose-500
      default: return 'hsl(var(--muted))';
    }
  };
  
  const chartColor = getColor();
  
  return (
    <div className="h-[60px] w-full mt-1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
              <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
                    <div className="font-medium">{payload[0].value}</div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartColor}
            fillOpacity={1}
            fill={`url(#gradient-${color})`}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Stat card component for dashboards
 * 
 * Displays a title, value, and trend/sparkline with optional change indicator
 */
export function StatCard({
  title,
  description,
  value,
  trendData,
  change,
  color = 'default',
  useRecharts = false,
  icon,
  className
}: StatCardProps) {
  // Determine if we should show trend data
  const hasTrendData = trendData && trendData.length > 0;
  
  // Get trend direction for icon if change exists
  const getTrendIcon = () => {
    if (!change) return null;
    
    const isPositive = change.value > change.previousValue;
    const isNeutral = change.value === change.previousValue;
    
    if (isNeutral) return <Minus className="h-4 w-4 text-muted-foreground" />;
    
    const isGood = (change.isPositiveGood && isPositive) || 
                  (!change.isPositiveGood && !isPositive);
    
    const iconColor = isGood ? 'text-emerald-500' : 'text-rose-500';
    
    return isPositive 
      ? <TrendingUp className={`h-4 w-4 ${iconColor}`} />
      : <TrendingDown className={`h-4 w-4 ${iconColor}`} />;
  };
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium">
            {title}
          </CardTitle>
          {description && (
            <CardDescription>
              {description}
            </CardDescription>
          )}
        </div>
        {icon && (
          <div className="text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
        </div>
        
        {/* Change indicator */}
        {change && (
          <div className="mt-1">
            <StatChange {...change} />
          </div>
        )}
        
        {/* Trend visualization */}
        {hasTrendData && (
          <div className="mt-3">
            {useRecharts ? (
              <RechartsSparkline data={trendData} color={color} />
            ) : (
              <TailwindSparkline data={trendData} color={color} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default StatCard;
