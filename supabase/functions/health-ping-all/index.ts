import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Health check timeout in ms (3 seconds)
const TIMEOUT_MS = 3000;

/**
 * Health check monitor for MCP servers
 * 
 * This function:
 * 1. Retrieves all active MCP servers from the database
 * 2. Performs health checks on each server
 * 3. Records the results in the health_data table
 * 4. Updates the server status based on the health check results
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get all active servers
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('id, name, url, api_url')
      .is('archived', false);
    
    if (serversError) {
      throw new Error(`Error fetching servers: ${serversError.message}`);
    }
    
    const results = [];
    
    // Process each server
    for (const server of servers) {
      try {
        // Perform health check
        const healthData = await checkServerHealth(server);
        
        // Record health check result in health_data table
        const { error: insertError } = await supabase
          .from('health_data')
          .insert({
            server_id: server.id,
            status: healthData.status,
            response_time_ms: healthData.responseTime,
            error_message: healthData.error || null,
            check_method: healthData.method
          });
        
        if (insertError) {
          console.error(`Error recording health data for ${server.name}: ${insertError.message}`);
        }
        
        // Update server's current status
        const { error: updateError } = await supabase
          .from('servers')
          .update({ 
            health_status: healthData.status,
            last_checked: new Date().toISOString() 
          })
          .eq('id', server.id);
        
        if (updateError) {
          console.error(`Error updating server status for ${server.name}: ${updateError.message}`);
        }
        
        results.push({
          server_id: server.id,
          name: server.name,
          status: healthData.status,
          response_time_ms: healthData.responseTime
        });
      } catch (err) {
        console.error(`Error checking health for server ${server.name}:`, err);
        results.push({
          server_id: server.id,
          name: server.name,
          status: 'error',
          error: err.message
        });
      }
    }
    
    // Return success response with results
    return new Response(
      JSON.stringify({ 
        success: true, 
        servers_checked: servers.length,
        results 
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Health check error:', error);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});

/**
 * Performs a health check on a server using multiple methods
 * 
 * @param server The server object with id, name, url and api_url
 * @returns Object containing status, response time, and error message
 */
async function checkServerHealth(server) {
  // Try multiple health check methods in priority order:
  // 1. API URL health endpoint
  // 2. Base URL health endpoint
  // 3. Simple ping to base URL
  
  // Method 1: Check API URL health endpoint
  if (server.api_url) {
    try {
      const apiHealthUrl = `${server.api_url.replace(/\/$/, '')}/health`;
      const result = await fetchWithTimeout(apiHealthUrl);
      
      if (result.ok) {
        return {
          status: 'online',
          responseTime: result.responseTime,
          method: 'api_health_endpoint'
        };
      }
    } catch (err) {
      // Continue to next method if this fails
      console.log(`API health endpoint check failed for ${server.name}: ${err.message}`);
    }
  }
  
  // Method 2: Check base URL health endpoint
  if (server.url) {
    try {
      const baseHealthUrl = `${server.url.replace(/\/$/, '')}/health`;
      const result = await fetchWithTimeout(baseHealthUrl);
      
      if (result.ok) {
        return {
          status: 'online',
          responseTime: result.responseTime,
          method: 'base_health_endpoint'
        };
      }
    } catch (err) {
      // Continue to next method if this fails
      console.log(`Base health endpoint check failed for ${server.name}: ${err.message}`);
    }
  }
  
  // Method 3: Simple ping to base URL
  if (server.url) {
    try {
      const pingUrl = server.url;
      const result = await fetchWithTimeout(pingUrl);
      
      if (result.ok) {
        return {
          status: 'online',
          responseTime: result.responseTime,
          method: 'base_url_ping'
        };
      } else if (result.status >= 400 && result.status < 500) {
        // Client errors may mean the server is working but returning errors
        return {
          status: 'degraded',
          responseTime: result.responseTime,
          error: `HTTP ${result.status} response`,
          method: 'base_url_ping'
        };
      } else {
        return {
          status: 'offline',
          responseTime: result.responseTime,
          error: `HTTP ${result.status} response`,
          method: 'base_url_ping'
        };
      }
    } catch (err) {
      return {
        status: 'offline',
        responseTime: null,
        error: err.message,
        method: 'base_url_ping'
      };
    }
  }
  
  // If we reach here, all methods failed
  return {
    status: 'offline',
    responseTime: null,
    error: 'No valid URL available for health check',
    method: 'none'
  };
}

/**
 * Fetch with timeout functionality
 * 
 * @param url The URL to fetch
 * @param options Fetch options
 * @returns Response object with added responseTime property
 */
async function fetchWithTimeout(url, options = {}) {
  const startTime = Date.now();
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    
    const responseTime = Date.now() - startTime;
    
    // Add response time to the response object
    return { 
      ...response, 
      responseTime 
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout after ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}
