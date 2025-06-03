import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

/**
 * Metrics fetch edge function
 * 
 * This function retrieves metrics data for a specific server
 * and period, formats it for frontend visualization, and applies
 * proper caching headers for performance.
 * 
 * URL parameters:
 * - server_id: The ID of the server to fetch metrics for
 * - period: Time period for metrics (1h, 6h, 12h, 1d, 7d, 30d, 90d)
 * - metrics: Comma-separated list of metric names to include (optional)
 */
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse URL and query parameters
    const url = new URL(req.url);
    const serverId = url.searchParams.get('server_id');
    const period = url.searchParams.get('period') || '7d';
    const metricNames = url.searchParams.get('metrics')?.split(',') || [];
    
    // Validate required parameters
    if (!serverId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server ID is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Verify server exists
    const { data: server, error: serverError } = await supabaseAdmin
      .from('servers')
      .select('id, name')
      .eq('id', serverId)
      .single();
      
    if (serverError || !server) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    // Calculate time range based on requested period
    const endDate = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '1h':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case '6h':
        startDate.setHours(startDate.getHours() - 6);
        break;
      case '12h':
        startDate.setHours(startDate.getHours() - 12);
        break;
      case '1d':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7); // Default to 7 days
    }
    
    // For longer periods, use aggregated data
    let metricsData;
    let error;
    
    // For periods longer than a day, use daily aggregated data
    if (['7d', '30d', '90d'].includes(period)) {
      const { data, error: fetchError } = await supabaseAdmin
        .from('server_metrics_daily')
        .select('*')
        .eq('server_id', serverId)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .lte('metric_date', endDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });
      
      metricsData = data;
      error = fetchError;
    } else {
      // For shorter periods, use raw metrics data
      const query = supabaseAdmin
        .from('server_metrics')
        .select('*')
        .eq('server_id', serverId)
        .gte('recorded_at', startDate.toISOString())
        .lte('recorded_at', endDate.toISOString())
        .order('recorded_at', { ascending: true });
      
      // Filter by metric names if provided
      if (metricNames.length > 0) {
        query.in('metric_name', metricNames);
      }
      
      const { data, error: fetchError } = await query;
      metricsData = data;
      error = fetchError;
    }
    
    if (error) {
      console.error('Error fetching metrics:', error);
      throw new Error(`Failed to fetch metrics: ${error.message}`);
    }
    
    // Process metrics data for frontend visualization
    // Group metrics by name for easier frontend consumption
    const processedMetrics: Record<string, any> = {};
    
    if (metricsData) {
      // Check if we're using daily aggregated data
      const isAggregated = 'metric_date' in (metricsData[0] || {});
      
      metricsData.forEach((metric: any) => {
        const name = metric.metric_name;
        const timestamp = isAggregated ? metric.metric_date : metric.recorded_at;
        const value = isAggregated ? metric.avg_value : metric.metric_value;
        
        if (!processedMetrics[name]) {
          processedMetrics[name] = [];
        }
        
        processedMetrics[name].push({
          timestamp,
          value
        });
      });
    }
    
    // Get server health and status information
    const { data: healthData, error: healthError } = await supabaseAdmin
      .from('health_data')
      .select('*')
      .eq('server_id', serverId)
      .order('last_check_time', { ascending: false })
      .limit(100);
      
    if (healthError) {
      console.error('Error fetching health data:', healthError);
    }
    
    // Process health data for uptime calculation
    const uptimeData = healthData?.map((entry: any) => ({
      timestamp: entry.last_check_time,
      value: entry.status === 'online' ? 1 : 0
    })) || [];
    
    // Get usage statistics
    const { data: usageData, error: usageError } = await supabaseAdmin
      .from('server_usage')
      .select('action, created_at')
      .eq('server_id', serverId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });
      
    if (usageError) {
      console.error('Error fetching usage data:', usageError);
    }
    
    // Group usage data by type and day
    const usageByType: Record<string, any[]> = {};
    
    usageData?.forEach((entry: any) => {
      const { action, created_at } = entry;
      
      if (!usageByType[action]) {
        usageByType[action] = [];
      }
      
      usageByType[action].push({
        timestamp: created_at,
        value: 1
      });
    });
    
    // Calculate summary statistics
    const latencyData = processedMetrics['response_time'] || [];
    const requestsData = processedMetrics['api_requests'] || [];
    const memoryData = processedMetrics['memory_usage'] || [];
    
    // Include usage data in metrics
    const viewsData = usageByType['view'] || [];
    const installsData = usageByType['install'] || [];
    
    // Combine all metrics for the frontend
    const result = {
      server_id: serverId,
      server_name: server.name,
      period,
      uptime: uptimeData,
      latency: latencyData,
      requests: requestsData, 
      memory: memoryData,
      views: viewsData,
      installs: installsData,
      // Include other metrics from processedMetrics
      other_metrics: Object.keys(processedMetrics)
        .filter(key => !['response_time', 'api_requests', 'memory_usage'].includes(key))
        .reduce((obj, key) => ({ ...obj, [key]: processedMetrics[key] }), {})
    };
    
    // Calculate cache duration based on period
    // Shorter periods get shorter cache times
    let cacheDuration = 60; // Default 1 minute
    
    if (period === '1h') {
      cacheDuration = 30; // 30 seconds
    } else if (period === '6h' || period === '12h') {
      cacheDuration = 60; // 1 minute
    } else if (period === '1d') {
      cacheDuration = 5 * 60; // 5 minutes
    } else if (period === '7d') {
      cacheDuration = 15 * 60; // 15 minutes
    } else if (period === '30d' || period === '90d') {
      cacheDuration = 60 * 60; // 1 hour
    }
    
    // Return metrics with appropriate caching headers
    return new Response(
      JSON.stringify({ 
        success: true, 
        metrics: result
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': `public, max-age=${cacheDuration}`,
          'Expires': new Date(Date.now() + cacheDuration * 1000).toUTCString()
        } 
      }
    );
  } catch (error) {
    console.error('Metrics fetch error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
