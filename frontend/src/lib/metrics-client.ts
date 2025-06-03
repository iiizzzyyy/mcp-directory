/**
 * Client library for interacting with the metrics API
 */

import { z } from 'zod';

// Helper function to get API URL (simplified version if api-utils is missing)
const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || window.location.origin;
};

/**
 * Types for metrics data
 */
export type MetricPeriod = '1h' | '6h' | '12h' | '1d' | '7d' | '30d' | '90d';

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

export interface ServerMetricsResponse {
  server_id: string;
  server_name: string;
  period: MetricPeriod;
  uptime: MetricDataPoint[];
  latency: MetricDataPoint[];
  requests: MetricDataPoint[];
  memory: MetricDataPoint[];
  views: MetricDataPoint[];
  installs: MetricDataPoint[];
  other_metrics: Record<string, MetricDataPoint[]>;
  fetchedAt?: string; // Timestamp when the metrics were fetched
}

export interface UsageEvent {
  serverId: string;
  userId?: string;
  action: 'view' | 'install' | 'test' | 'invoke';
  toolId?: string;
  details?: Record<string, any>;
}

/**
 * Fetches metrics data for a specific server with enhanced error handling and retry logic
 * 
 * @param serverId The ID of the server to fetch metrics for
 * @param period Time period for metrics (default: 7d)
 * @param metrics Optional array of specific metric names to include
 * @param maxRetries Maximum number of retries on failure (default: 3)
 * @returns Promise resolving to the server metrics data
 */
export async function fetchServerMetrics(
  serverId: string,
  period: MetricPeriod = '7d',
  metrics?: string[],
  maxRetries = 3
): Promise<ServerMetricsResponse> {
  const apiUrl = getApiUrl();
  let lastError: Error | null = null;
  let retryCount = 0;
  
  while (retryCount <= maxRetries) {
    try {
      // Build base URL
      const url = `${apiUrl}/servers/${serverId}/metrics?period=${period}`;
      
      // Add specific metrics if provided
      const urlWithParams = metrics?.length 
        ? `${url}&metrics=${metrics.join(',')}` 
        : url;
      
      // Set up request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(urlWithParams, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      // Handle HTTP errors
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }
      
      // Parse and validate response
      const data = await response.json();
      
      // Validate response structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid metrics data: Response is not a valid object');
      }
      
      if (!data.server_id || data.server_id !== serverId) {
        throw new Error('Invalid metrics data: Incorrect or missing server ID');
      }
      
      // Add timestamp for cache control
      return {
        ...data as ServerMetricsResponse,
        fetchedAt: new Date().toISOString()
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Error fetching metrics for server ${serverId} (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
      
      // Don't retry if it's a validation error
      if (lastError.message.includes('Invalid metrics data')) {
        break;
      }
      
      // Don't retry if we've reached max retries
      if (retryCount >= maxRetries) {
        break;
      }
      
      // Exponential backoff for retries
      const delay = Math.min(1000 * Math.pow(2, retryCount), 8000); // Max 8 second delay
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }
  }
  
  // Return mock data in development environment for easier testing
  if (process.env.NODE_ENV === 'development') {
    console.warn('Using mock metrics data after API failure');
    return generateMockMetrics(serverId, period);
  }
  
  // Re-throw the last error
  throw lastError || new Error(`Failed to fetch metrics for server ${serverId} after ${maxRetries + 1} attempts`);
}

/**
 * Tracks a usage event for a server
 * 
 * @param event The usage event data
 * @returns Promise resolving to true if tracking was successful
 */
export async function trackUsageEvent(event: UsageEvent): Promise<boolean> {
  const apiUrl = getApiUrl();
  const url = `${apiUrl}/functions/v1/usage-track`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.warn('Usage tracking failed:', errorData.error);
      return false;
    }
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.warn('Error tracking usage event:', error);
    return false; // Fail silently in production
  }
}

/**
 * Tracks a server page view
 * 
 * @param serverId The ID of the server being viewed
 * @param userId Optional user ID
 * @returns Promise resolving to true if tracking was successful
 */
export async function trackServerView(
  serverId: string,
  userId?: string
): Promise<boolean> {
  return trackUsageEvent({
    serverId,
    userId,
    action: 'view',
    details: {
      page: 'server_detail',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Tracks a server installation event
 * 
 * @param serverId The ID of the server being installed
 * @param userId Optional user ID
 * @param installMethod The installation method used (npm, yarn, docker, etc.)
 * @returns Promise resolving to true if tracking was successful
 */
export async function trackServerInstall(
  serverId: string,
  userId?: string,
  installMethod?: string
): Promise<boolean> {
  return trackUsageEvent({
    serverId,
    userId,
    action: 'install',
    details: {
      method: installMethod || 'unknown',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Tracks a tool usage event
 * 
 * @param serverId The ID of the server the tool belongs to
 * @param toolId The ID of the tool being used
 * @param userId Optional user ID
 * @returns Promise resolving to true if tracking was successful
 */
export async function trackToolUsage(
  serverId: string,
  toolId: string,
  userId?: string
): Promise<boolean> {
  return trackUsageEvent({
    serverId,
    userId,
    action: 'invoke',
    toolId,
    details: {
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Generates mock metrics data for development and testing
 * 
 * @param serverId The server ID to generate mock data for
 * @param period The time period to generate data for
 * @returns Mock metrics data conforming to ServerMetricsResponse
 */
function generateMockMetrics(serverId: string, period: MetricPeriod = '7d'): ServerMetricsResponse {
  // Calculate dates based on the period
  const endDate = new Date();
  const startDate = new Date();
  
  switch(period) {
    case '1h': startDate.setHours(endDate.getHours() - 1); break;
    case '6h': startDate.setHours(endDate.getHours() - 6); break;
    case '12h': startDate.setHours(endDate.getHours() - 12); break;
    case '1d': startDate.setDate(endDate.getDate() - 1); break;
    case '7d': startDate.setDate(endDate.getDate() - 7); break;
    case '30d': startDate.setDate(endDate.getDate() - 30); break;
    case '90d': startDate.setDate(endDate.getDate() - 90); break;
  }
  
  // Generate timestamps between start and end dates
  const dataPoints = generateTimestamps(startDate, endDate, period);
  
  // Generate mock data points
  const uptimePoints = dataPoints.map(timestamp => ({
    timestamp,
    value: Math.random() > 0.05 ? 1 : 0 // 95% uptime
  }));
  
  const latencyPoints = dataPoints.map(timestamp => ({
    timestamp,
    value: Math.floor(Math.random() * 200) + 50 // 50-250ms latency
  }));
  
  const requestsPoints = dataPoints.map(timestamp => ({
    timestamp,
    value: Math.floor(Math.random() * 1000) + 100 // 100-1100 requests
  }));
  
  const memoryPoints = dataPoints.map(timestamp => ({
    timestamp,
    value: Math.floor(Math.random() * 400) + 100 // 100-500MB memory
  }));
  
  const viewsPoints = dataPoints.map(timestamp => ({
    timestamp,
    value: Math.floor(Math.random() * 200) + 10 // 10-210 views
  }));
  
  const installsPoints = dataPoints.map(timestamp => ({
    timestamp,
    value: Math.floor(Math.random() * 20) + 1 // 1-21 installs
  }));
  
  return {
    server_id: serverId,
    server_name: `Server ${serverId.substring(0, 8)}`,
    period,
    uptime: uptimePoints,
    latency: latencyPoints,
    requests: requestsPoints,
    memory: memoryPoints,
    views: viewsPoints,
    installs: installsPoints,
    other_metrics: {
      errors: dataPoints.map(timestamp => ({
        timestamp,
        value: Math.floor(Math.random() * 10) // 0-10 errors
      })),
      active_users: dataPoints.map(timestamp => ({
        timestamp,
        value: Math.floor(Math.random() * 50) + 5 // 5-55 active users
      }))
    },
    fetchedAt: new Date().toISOString()
  };
}

/**
 * Helper function to generate timestamps between two dates
 * 
 * @param startDate The start date
 * @param endDate The end date
 * @param period The time period (determines granularity)
 * @returns Array of ISO timestamp strings
 */
function generateTimestamps(startDate: Date, endDate: Date, period: MetricPeriod): string[] {
  const timestamps: string[] = [];
  const current = new Date(startDate);
  
  // Determine interval based on period
  let interval: number;
  switch(period) {
    case '1h': interval = 5 * 60 * 1000; break; // 5 minutes
    case '6h': case '12h': interval = 30 * 60 * 1000; break; // 30 minutes
    case '1d': interval = 1 * 60 * 60 * 1000; break; // 1 hour
    case '7d': interval = 6 * 60 * 60 * 1000; break; // 6 hours
    case '30d': interval = 24 * 60 * 60 * 1000; break; // 1 day
    case '90d': interval = 3 * 24 * 60 * 60 * 1000; break; // 3 days
  }
  
  while (current <= endDate) {
    timestamps.push(current.toISOString());
    current.setTime(current.getTime() + interval);
  }
  
  return timestamps;
}
