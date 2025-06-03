import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

interface UsageEvent {
  serverId: string;
  userId?: string;
  action: 'view' | 'install' | 'test' | 'invoke';
  toolId?: string;
  details?: Record<string, any>;
}

/**
 * Usage tracking edge function
 * 
 * This function tracks user interactions with MCP servers, including:
 * - Server page views
 * - Installation events
 * - Tool invocations
 * - Testing playground usage
 * 
 * The data is used for analytics, recommendations, and server popularity metrics.
 * User privacy is maintained by anonymizing data when appropriate.
 */
serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Method not allowed' 
        }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    let event: UsageEvent;
    try {
      event = await req.json();
    } catch (e) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON payload' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate event data
    if (!event.serverId || !event.action) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server ID and action are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate action type
    const validActions = ['view', 'install', 'test', 'invoke'];
    if (!validActions.includes(event.action)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid action type' 
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
      .select('id')
      .eq('id', event.serverId)
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

    // Verify tool if provided
    if (event.toolId) {
      const { data: tool, error: toolError } = await supabaseAdmin
        .from('server_tools')
        .select('id')
        .eq('id', event.toolId)
        .single();

      if (toolError || !tool) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Tool not found' 
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Collect client information
    const clientInfo = {
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      referer: req.headers.get('referer') || 'unknown',
      timestamp: new Date().toISOString()
    };

    // Anonymize IP for privacy (store only first parts)
    if (clientInfo.ip && clientInfo.ip !== 'unknown') {
      const ipParts = clientInfo.ip.split('.');
      if (ipParts.length === 4) {
        clientInfo.ip = `${ipParts[0]}.${ipParts[1]}.0.0`;
      }
    }

    // Record usage event
    const { error: insertError } = await supabaseAdmin
      .from('server_usage')
      .insert({
        server_id: event.serverId,
        user_id: event.userId || null,
        action: event.action,
        tool_id: event.toolId || null,
        details: event.details || {},
        client_info: clientInfo
      });

    if (insertError) {
      console.error('Error recording usage data:', insertError);
      throw new Error(`Failed to record usage: ${insertError.message}`);
    }

    // Also update metrics for real-time stats
    // For 'view' actions, increment view counter
    if (event.action === 'view') {
      const { error: metricsError } = await supabaseAdmin
        .from('server_metrics')
        .insert({
          server_id: event.serverId,
          metric_name: 'page_views',
          metric_value: 1,
          metric_type: 'count',
          metric_tags: { source: 'frontend' }
        });

      if (metricsError) {
        console.error('Error recording metrics:', metricsError);
      }
    }

    // For 'install' actions, increment install counter
    if (event.action === 'install') {
      const { error: metricsError } = await supabaseAdmin
        .from('server_metrics')
        .insert({
          server_id: event.serverId,
          metric_name: 'installations',
          metric_value: 1,
          metric_type: 'count',
          metric_tags: { source: 'frontend' }
        });

      if (metricsError) {
        console.error('Error recording metrics:', metricsError);
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        recorded: true,
        server_id: event.serverId,
        action: event.action,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Usage tracking error:', error);
    
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
