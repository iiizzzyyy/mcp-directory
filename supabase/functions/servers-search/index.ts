// Supabase Edge Function: servers-search
// This function searches and returns servers with pagination support

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define CORS headers 
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Response helper
function responseWithCors(body: any, status: number = 200) {
  return new Response(
    JSON.stringify(body),
    {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status,
    }
  );
}

// Error helper
function errorResponse(message: string, status: number = 400) {
  return responseWithCors({
    error: true,
    message
  }, status);
}

/**
 * Edge function to search for servers with pagination, filtering, and sorting
 * 
 * Supports the following query parameters:
 * - q: Search query for name or description
 * - category: Filter by category
 * - tags: Comma-separated list of tags to filter by
 * - platform: Filter by platform
 * - limit: Number of results to return (default: 20)
 * - offset: Number of results to skip (for pagination)
 * - sort: Field to sort by (name, stars, updated_at)
 * - order: Sort order (asc, desc)
 */
Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    
    // Parse request URL
    const url = new URL(req.url);
    
    // Get search parameters
    const searchQuery = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || '';
    const tagsParam = url.searchParams.get('tags') || '';
    const platform = url.searchParams.get('platform') || '';
    
    // Get pagination parameters (with defaults)
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    
    // Get sorting parameters (with defaults)
    const sort = url.searchParams.get('sort') || 'name';
    const order = url.searchParams.get('order') || 'asc';
    
    // Validate pagination parameters
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return errorResponse('Invalid limit parameter. Must be between 1 and 100.');
    }
    
    if (isNaN(offset) || offset < 0) {
      return errorResponse('Invalid offset parameter. Must be non-negative.');
    }
    
    // Validate sort parameters
    const validSortFields = ['name', 'stars', 'updated_at', 'created_at'];
    if (!validSortFields.includes(sort)) {
      return errorResponse(`Invalid sort parameter. Must be one of: ${validSortFields.join(', ')}.`);
    }
    
    const validOrders = ['asc', 'desc'];
    if (!validOrders.includes(order)) {
      return errorResponse(`Invalid order parameter. Must be one of: ${validOrders.join(', ')}.`);
    }
    
    // Parse tags into array
    const tags = tagsParam ? tagsParam.split(',').filter(Boolean) : [];
    
    // Build the query
    let query = supabaseClient
      .from('servers')
      .select('*', { count: 'exact' });
    
    // Apply search filter
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    
    // Apply category filter
    if (category) {
      query = query.eq('category', category);
    }
    
    // Apply platform filter
    if (platform) {
      query = query.eq('platform', platform);
    }
    
    // Apply tags filter (if tags array is not empty)
    if (tags.length > 0) {
      // Filter servers where the tags array contains ANY of the specified tags
      query = query.contains('tags', tags);
    }
    
    // Apply sorting
    query = query.order(sort, { ascending: order === 'asc' });
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    // Execute the query
    const { data: servers, error, count } = await query;
    
    if (error) {
      console.error('Error fetching servers:', error);
      return errorResponse('Failed to fetch servers: ' + error.message, 500);
    }
    
    // Return the servers with pagination metadata
    return responseWithCors({
      servers,
      pagination: {
        total: count,
        offset,
        limit,
        hasMore: count ? offset + limit < count : false
      }
    });
    
  } catch (error) {
    console.error('Unexpected error:', error);
    return errorResponse('Internal server error: ' + (error as Error).message, 500);
  }
});
