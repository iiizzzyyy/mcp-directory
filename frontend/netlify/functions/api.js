// Netlify Function handler for API routes
const { createClient } = require('@supabase/supabase-js');

/**
 * This function handles API requests and proxies them to the Next.js API
 * or directly interfaces with Supabase when appropriate
 */
exports.handler = async (event, context) => {
  const path = event.path.replace('/.netlify/functions/api', '');
  console.log(`API request: ${event.httpMethod} ${path}`);
  
  try {
    // Handle servers/search endpoint
    if (path === '/api/servers/search' && event.httpMethod === 'GET') {
      return await handleServersSearch(event);
    }
    
    // Add more API endpoints here as needed
    
    // Default: Return 404 for unhandled endpoints
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'API endpoint not found' }),
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
async function handleServersSearch(event) {
  const params = event.queryStringParameters || {};
  
  // Parse pagination parameters
  const limit = parseInt(params.limit || '10', 10);
  const offset = parseInt(params.offset || '0', 10);
  const sort = params.sort || 'name';
  const order = params.order || 'asc';
  const searchQuery = params.q || '';
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials missing');
    }
    
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
    query = query.order(sort, { ascending: order === 'asc' });
      
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
    console.error('Error fetching servers:', error);
    
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to fetch servers',
        message: error.message,
      }),
    };
  }
}
