import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';

export interface MetricCardProps {
  /**
   * Title of the metric
   */
  title: string;
  
  /**
   * Current value of the metric
   */
  value: number | string;
  
  /**
   * Unit of measurement (e.g., ms, %, MB)
   */
  unit?: string;
  
  /**
   * Icon component to display
   */
  icon?: React.ReactNode;
  
  /**
   * Change direction (1 = up, 0 = no change, -1 = down)
   */
  trend?: 1 | 0 | -1;
  
  /**
   * Trend percent change (absolute value)
   */
  trendPercent?: number;
  
  /**
   * Whether up is good (green) or bad (red)
   */
  upIsGood?: boolean;
  
  /**
   * Historical data for sparkline
   */
  sparklineData?: number[];
  
  /**
   * Description or additional context
   */
  description?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Reusable metric card component for displaying key metrics with optional
 * trend indicators and sparklines
 */
export function MetricCard({
  title,
  value,
  unit = '',
  icon,
  trend,
  trendPercent,
  upIsGood = true,
  sparklineData,
  description,
  className = '',
}: MetricCardProps) {
  // Determine trend color based on direction and whether up is good
  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return 'text-gray-500';
    const isPositive = upIsGood ? trend > 0 : trend < 0;
    return isPositive ? 'text-green-500' : 'text-red-500';
  };
  
  // Render trend arrow based on direction
  const renderTrendIndicator = () => {
    if (trend === undefined) return null;
    
    return (
      <div className={`flex items-center ${getTrendColor()}`}>
        {trend > 0 ? (
          <ArrowUpIcon className="h-4 w-4 mr-1" />
        ) : trend < 0 ? (
          <ArrowDownIcon className="h-4 w-4 mr-1" />
        ) : (
          <MinusIcon className="h-4 w-4 mr-1" />
        )}
        {trendPercent !== undefined && (
          <span className="text-xs font-medium">{trendPercent.toFixed(1)}%</span>
        )}
      </div>
    );
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-end">
          <div>
            <div className="text-2xl font-bold flex items-baseline">
              {value}
              {unit && <span className="text-sm ml-1 text-muted-foreground">{unit}</span>}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {renderTrendIndicator()}
        </div>
        
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-3 h-[40px]">
            <ResponsiveContainer width="100%" height={40}>
              <AreaChart
                data={sparklineData.map(value => ({ value }))}
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={`sparkline-gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getTrendColor().includes('green') ? '#10b981' : 
                                             getTrendColor().includes('red') ? '#ef4444' : '#3b82f6'} 
                          stopOpacity={0.3} />
                    <stop offset="95%" stopColor={getTrendColor().includes('green') ? '#10b981' : 
                                             getTrendColor().includes('red') ? '#ef4444' : '#3b82f6'} 
                          stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={getTrendColor().includes('green') ? '#10b981' : 
                         getTrendColor().includes('red') ? '#ef4444' : '#3b82f6'}
                  strokeWidth={2}
                  fill={`url(#sparkline-gradient-${title})`}
                  fillOpacity={1}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
