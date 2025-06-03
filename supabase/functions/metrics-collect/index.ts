import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import * as crypto from 'https://deno.land/std@0.177.0/crypto/mod.ts';

interface MetricPayload {
  serverId: string;
  metrics: Metric[];
  timestamp?: string;
  apiKey?: string;
}

interface Metric {
  name: string;
  value: number;
  type: 'count' | 'gauge' | 'histogram' | 'distribution';
  tags?: Record<string, string>;
}

interface ServerConfig {
  id: string;
  name: string;
  api_key?: string;
  webhook_secret?: string;
  metrics_enabled: boolean;
}

/**
 * Metrics collection edge function
 * 
 * This function collects metrics from MCP servers via:
 * 1. Direct API submission from the server
 * 2. Webhook events with metrics data
 * 3. User-initiated actions tracked by the frontend
 * 
 * It validates submissions, processes the metrics,
 * and stores them in the database for analysis and display.
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

    // Extract request details
    const { pathname } = new URL(req.url);
    const parts = pathname.split('/');
    const serverId = parts[parts.length - 1];
    const userApiKey = req.headers.get('x-api-key');
    
    if (!serverId || serverId === 'metrics-collect') {
      throw new Error('Server ID is required in the URL path');
    }

    // Verify server exists and is enabled for metrics
    const { data: server, error: serverError } = await supabaseAdmin
      .from('servers')
      .select('id, name, api_key, webhook_secret, metrics_enabled')
      .eq('id', serverId)
      .single();

    if (serverError || !server) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server not found or metrics not enabled' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if metrics are enabled for this server
    if (!server.metrics_enabled) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Metrics collection is disabled for this server' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Authenticate the request
    if (server.api_key && server.api_key !== userApiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid API key' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    let payload: MetricPayload;
    if (req.method === 'POST') {
      // Handle webhook signature verification
      if (server.webhook_secret) {
        const signature = req.headers.get('x-webhook-signature');
        if (signature) {
          const isValid = await verifyWebhookSignature(
            await req.clone().text(),
            signature,
            server.webhook_secret
          );
          
          if (!isValid) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Invalid webhook signature' 
              }),
              { 
                status: 401, 
                headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
              }
            );
          }
        }
      }

      try {
        payload = await req.json();
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
    } else {
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

    // Validate payload
    if (!payload.metrics || !Array.isArray(payload.metrics) || payload.metrics.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Metrics data is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Process metrics
    const timestamp = payload.timestamp 
      ? new Date(payload.timestamp).toISOString() 
      : new Date().toISOString();
      
    const metricsToInsert = payload.metrics.map(metric => ({
      server_id: serverId,
      metric_name: metric.name,
      metric_value: metric.value,
      metric_type: metric.type,
      metric_tags: metric.tags || {},
      recorded_at: timestamp,
    }));

    // Insert metrics into database
    const { error: insertError } = await supabaseAdmin
      .from('server_metrics')
      .insert(metricsToInsert);

    if (insertError) {
      console.error('Error inserting metrics:', insertError);
      throw new Error(`Failed to store metrics: ${insertError.message}`);
    }

    // Update server's last metrics received timestamp
    const { error: updateError } = await supabaseAdmin
      .from('servers')
      .update({ metrics_last_received: timestamp })
      .eq('id', serverId);

    if (updateError) {
      console.error('Error updating server:', updateError);
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        metrics_processed: metricsToInsert.length,
        server_id: serverId,
        timestamp
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Metrics collection error:', error);
    
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

/**
 * Verifies the webhook signature using HMAC
 * 
 * @param payload The raw request payload
 * @param signature The signature from the webhook header
 * @param secret The webhook secret for verification
 * @returns Boolean indicating if the signature is valid
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    // Convert the secret to a crypto key
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode the provided signature
    const signatureBytes = hexToBytes(signature);

    // Verify the signature
    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(payload)
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Converts a hexadecimal string to a Uint8Array
 * 
 * @param hex The hexadecimal string to convert
 * @returns Uint8Array of bytes
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
