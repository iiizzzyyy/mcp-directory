import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

/**
 * Scheduled metrics aggregation function
 * 
 * This function:
 * 1. Aggregates raw metrics data into daily summaries
 * 2. Calculates statistics for dashboard display
 * 3. Cleans up old raw metrics data (configurable retention period)
 * 
 * It can be triggered:
 * - Automatically via cron schedule
 * - Manually via HTTP request with admin token
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

    // Authentication for manual triggers
    if (req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing or invalid authorization token' 
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Authentication failed' 
          }),
          { 
            status: 401, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // Check if user has admin role (can be customized based on your auth setup)
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profileError || !profile || profile.role !== 'admin') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Insufficient permissions' 
          }),
          { 
            status: 403, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Parse request parameters
    let date = new Date();
    date.setDate(date.getDate() - 1); // Default to yesterday
    let retentionDays = 30; // Default retention period

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.date) {
          date = new Date(body.date);
        }
        if (body.retentionDays && typeof body.retentionDays === 'number') {
          retentionDays = body.retentionDays;
        }
      } catch (e) {
        console.warn('Failed to parse request body, using defaults:', e);
      }
    }

    // Format date for database operations
    const targetDate = date.toISOString().split('T')[0];
    
    // Step 1: Call the aggregation function
    const { data: aggregationResult, error: aggregationError } = await supabaseAdmin.rpc(
      'aggregate_daily_metrics',
      { target_date: targetDate }
    );

    if (aggregationError) {
      throw new Error(`Failed to aggregate metrics: ${aggregationError.message}`);
    }

    // Step 2: Clean up old raw metrics data beyond retention period
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const { error: cleanupError } = await supabaseAdmin
      .from('server_metrics')
      .delete()
      .lt('recorded_at', cutoffDate.toISOString());

    if (cleanupError) {
      console.error('Error cleaning up old metrics:', cleanupError);
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        date: targetDate,
        metrics_aggregated: aggregationResult,
        retention_days: retentionDays
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Metrics aggregation error:', error);
    
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
