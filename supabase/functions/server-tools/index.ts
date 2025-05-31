import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Server tools API endpoint
 * 
 * Retrieves tools for a specific server, including their parameters
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Server ID is required' 
        }),
        { 
          status: 400, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    // Get tools for the server
    const { data: tools, error: toolsError } = await supabase
      .from('server_tools')
      .select('id, name, description, method, endpoint, detection_source')
      .eq('server_id', id)
      .order('name');
      
    if (toolsError) {
      throw toolsError;
    }
    
    // If no tools found, return empty array
    if (!tools || tools.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          data: [] 
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    // Get parameters for each tool
    const toolsWithParams = await Promise.all(
      tools.map(async (tool) => {
        const { data: params, error: paramsError } = await supabase
          .from('tool_parameters')
          .select('name, description, type, required')
          .eq('tool_id', tool.id)
          .order('name');
          
        if (paramsError) {
          console.error(`Error fetching parameters for tool ${tool.id}:`, paramsError);
          return {
            ...tool,
            parameters: []
          };
        }
        
        return {
          ...tool,
          parameters: params || []
        };
      })
    );
    
    return new Response(
      JSON.stringify({ 
        success: true,
        data: toolsWithParams 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error fetching server tools:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
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
