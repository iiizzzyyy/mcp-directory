import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Health check timeout in ms (3 seconds)
const TIMEOUT_MS = 3000;

interface Server {
  id: string;
  name: string;
  url?: string | null;
  api_url?: string | null;
  health_url?: string | null;
  github_url?: string | null;
}

interface HealthCheckResult {
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  responseTime: number;
  error?: string | null;
  method: string;
}

/**
 * Health check monitor for MCP servers
 * 
 * This function:
 * 1. Retrieves all active MCP servers from the database
 * 2. Performs health checks on each server
 * 3. Records the results in the health_data table
 * 4. Updates the server status based on the health check results
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client inside the function for better security
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active servers
    const { data: servers, error: serversError } = await supabase
      .from('servers')
      .select('id, name, url, api_url, health_url, github_url')
      .is('archived', false);
    
    if (serversError) {
      throw new Error(`Error fetching servers: ${serversError.message}`);
    }
    
    const results = [];
    let checked = 0;
    
    // Process each server
    for (const server of servers as Server[]) {
      try {
        // Perform health check
        const healthData = await checkServerHealth(server);
        checked++;
        
        // Record health check result in health_data table
        const { error: insertError } = await supabase
          .from('health_data')
          .insert({
            server_id: server.id,
            status: healthData.status,
            response_time_ms: healthData.responseTime,
            error_message: healthData.error || null,
            check_method: healthData.method,
            last_check_time: new Date().toISOString()
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
          error: (err as Error).message
        });
      }
    }
    
    // Return success response with results
    return new Response(
      JSON.stringify({ 
        success: true, 
        servers_checked: checked,
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
        error: (error as Error).message 
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

// This function was removed to eliminate duplicate implementation

/**
 * Fetch with timeout functionality
 * 
 * @param url The URL to fetch
 * @param options Fetch options
 * @returns Response object with added responseTime property
 */
async function fetchWithTimeout(url: string, options = {}) {
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
    if ((err as Error).name === 'AbortError') {
      throw new Error(`Request timeout after ${TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

/**
 * Performs a health check on a server using multiple methods
 * 
 * @param server The server object with id, name, url and api_url
 * @returns Object containing status, response time, and error message
 */
async function checkServerHealth(server: Server): Promise<HealthCheckResult> {
  // Try multiple health check methods in priority order:
  // 1. Dedicated health URL if available
  // 2. API URL health endpoint
  // 3. Base URL health endpoint
  // 4. Simple ping to base URL or github URL
  
  // Method 1: Check dedicated health URL if available
  if (server.health_url) {
    try {
      const healthUrl = server.health_url;
      const result = await fetchWithTimeout(healthUrl);
      
      if (result.ok) {
        return {
          status: 'online',
          responseTime: result.responseTime,
          method: 'health_url'
        };
      }
    } catch (err) {
      // Continue to next method if this fails
      console.log(`Health URL check failed for ${server.name}: ${(err as Error).message}`);
    }
  }
  
  // Method 2: Check API URL health endpoint
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
      console.log(`API health endpoint check failed for ${server.name}: ${(err as Error).message}`);
    }
  }
  
  // Method 3: Check base URL health endpoint
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
      console.log(`Base health endpoint check failed for ${server.name}: ${(err as Error).message}`);
    }
  }
  
  // Method 4: Simple ping to base URL or github URL
  const pingUrl = server.url || server.github_url;
  if (pingUrl) {
    try {
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
        responseTime: 0,
        error: (err as Error).message,
        method: 'base_url_ping'
      };
    }
  }
  
  // If we reach here, all methods failed
  return {
    status: 'unknown',
    responseTime: 0,
    error: 'No valid URL available for health check',
    method: 'none'
  };
}
