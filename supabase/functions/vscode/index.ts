/**
 * VSCode Index Edge Function
 * Returns indexed metadata for MCP servers, including endpoint paths, tags, and CLI templates.
 * This function is designed to be consumed by VSCode extensions.
 */

// Import required Supabase dependencies
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

// Define the response schema for MCP server metadata
interface ServerMetadata {
  name: string;
  slug: string;
  endpoints: string[];
  methods: Record<string, string[]>;
  platform: string;
  install_example: string;
  tags?: string[];
  description?: string;
}

// Handle incoming requests
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get('search') || '';

    // Create a Supabase client using the environment variables
    const supabaseClient = createClient(
      // Supabase API URL - env var exported from Deno.env
      Deno.env.get('SUPABASE_URL') ?? '',
      // Supabase API SERVICE ROLE KEY - env var exported from Deno.env
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build the database query
    let query = supabaseClient
      .from('servers')
      .select(`
        id, 
        name, 
        description, 
        tags, 
        platform, 
        install_method,
        endpoints,
        api_methods
      `);

    // Apply search filter if provided
    if (searchQuery) {
      query = query.textSearch('search_vector', searchQuery, {
        type: 'websearch',
        config: 'english'
      });
    }

    // Execute the query
    const { data, error } = await query;

    if (error) {
      console.error('Error fetching server metadata:', error);
      return new Response(
        JSON.stringify({ 
          error: true, 
          message: 'Failed to fetch server metadata', 
          details: error.message 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Transform the data into the required format for VSCode extensions
    const formattedData: ServerMetadata[] = data.map((server) => {
      // Create a slug from the server name
      const slug = server.name
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      // Extract endpoints and methods
      const endpoints = server.endpoints || [];
      const methods = server.api_methods || {};

      return {
        name: server.name,
        slug: slug,
        description: server.description,
        endpoints: endpoints,
        methods: methods,
        platform: server.platform,
        install_example: server.install_method || '',
        tags: server.tags || []
      };
    });

    // Return the formatted data
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: formattedData, 
        count: formattedData.length,
        query: searchQuery || null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    console.error('VSCode index function error:', err);
    
    return new Response(
      JSON.stringify({ 
        error: true, 
        message: 'Internal server error', 
        details: err.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
