// Netlify Function to handle Next.js API routes
const { createClient } = require('@supabase/supabase-js');

/**
 * This function serves as a serverless backend for the Next.js API routes
 * It handles routing and data fetching similar to the Next.js API routes
 */
exports.handler = async (event, context) => {
  try {
    // Extract path from event
    const path = event.path.replace('/.netlify/functions/nextjs-api', '/api');
    console.log(`API Request: ${event.httpMethod} ${path}`);
    
    // Get Supabase client from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Missing Supabase credentials',
        }),
      };
    }
    
    // Handle different API routes
    if (path.startsWith('/api/servers/search')) {
      return await handleServersSearch(event, supabaseUrl, supabaseKey);
    } else if (path.match(/\/api\/servers\/[\w-]+/)) {
      // Handle server detail endpoint
      return await handleServerDetail(event, path, supabaseUrl, supabaseKey);
    }
    
    // Default response for unhandled API routes
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'API route not found' }),
    };
  } catch (error) {
    console.error('API handler error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

/**
 * Handle the servers/search endpoint
 */
async function handleServersSearch(event, supabaseUrl, supabaseKey) {
  const params = event.queryStringParameters || {};
  
  // Parse parameters
  const limit = parseInt(params.limit || '10', 10);
  const offset = parseInt(params.offset || '0', 10);
  const sort = params.sort || 'name';
  const order = params.order || 'asc';
  const searchQuery = params.q || '';
  
  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Construct query with filters
    let query = supabase
      .from('servers')
      .select('*', { count: 'exact' });
      
    // Apply search filter
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
      
    // Apply sorting
    if (sort && order) {
      query = query.order(sort, { ascending: order === 'asc' });
    }
      
    // Apply pagination
    query = query.range(offset, offset + limit - 1);
    
    const { data: servers, error, count } = await query;
    
    if (error) throw error;
    
    // Return successful response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        servers: servers || [],
        pagination: {
          total: count || 0,
          limit,
          offset,
        },
      }),
    };
  } catch (error) {
    console.error('Supabase query error:', error);
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to query Supabase',
        details: error.message,
      }),
    };
  }
}

/**
 * Handle server detail endpoint
 */
async function handleServerDetail(event, path, supabaseUrl, supabaseKey) {
  try {
    // Extract server ID from path
    const serverId = path.split('/').pop();
    
    if (!serverId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing server ID' }),
      };
    }
    
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch server details
    const { data, error } = await supabase
      .from('servers')
      .select('*')
      .eq('id', serverId)
      .single();
      
    if (error) throw error;
    
    if (!data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Server not found' }),
      };
    }
    
    // Return the server details
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error fetching server details:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch server details',
        details: error.message,
      }),
    };
  }
}
