const { createClient } = require('@supabase/supabase-js');

// Debug utility to log environment info
const logEnvironmentInfo = () => {
  // Check both formats of environment variable names
  const envInfo = {
    hasSupabaseUrl: !!(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseKey: !!(process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    nodeEnv: process.env.NODE_ENV,
    netlifyContext: process.env.CONTEXT,
    supabaseUrlFormat: process.env.SUPABASE_URL ? 'SUPABASE_URL' : 
                       process.env.NEXT_PUBLIC_SUPABASE_URL ? 'NEXT_PUBLIC_SUPABASE_URL' : 'none',
    supabaseKeyFormat: process.env.SUPABASE_ANON_KEY ? 'SUPABASE_ANON_KEY' : 
                       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : 'none'
  };
  
  console.log('Netlify Function Environment:', envInfo);
  return envInfo;
};

// Define fallback mock data directly (instead of importing from src/lib)
// This avoids path resolution issues in Netlify Functions
const mockServers = [
    {
      id: '1',
      name: 'Supabase MCP',
      description: 'Supabase Model Context Protocol server',
      category: 'database',
      tags: ['database', 'authentication', 'storage'],
      platform: 'supabase',
      install_method: 'npm install @supabase/supabase-js',
      stars: 100,
      health_status: 'online',
    },
    {
      id: '2',
      name: 'Vector Database MCP',
      description: 'Vector database for semantic search with MCP',
      category: 'database',
      tags: ['vector', 'embedding', 'search'],
      platform: 'python',
      install_method: 'pip install vector-mcp',
      stars: 85,
      health_status: 'online',
    },
    {
      id: '3',
      name: 'AI Chat MCP',
      description: 'Chat interface for AI models with MCP',
      category: 'ai',
      tags: ['chat', 'llm', 'conversation'],
      platform: 'javascript',
      install_method: 'npm install ai-chat-mcp',
      stars: 120,
      health_status: 'online',
    }
  ];

// Types for server data (used as documentation/comments only in JS)
/**
 * @typedef {Object} Server
 * @property {string} id
 * @property {string} name
 * @property {string|null} description
 * @property {string|null} category
 * @property {string[]|null} tags
 * @property {string|null} platform
 * @property {string|null} install_method
 * @property {number|null} stars
 * @property {('online'|'offline'|'degraded'|'unknown')} [health_status]
 * @property {string} [last_checked]
 * @property {string|null} [slug]
 */

/**
 * @typedef {Object} PaginationMeta
 * @property {number} total
 * @property {number} offset
 * @property {number} limit
 * @property {boolean} hasMore
 */

/**
 * @typedef {Object} ServerSearchResponse
 * @property {Server[]} servers
 * @property {PaginationMeta} pagination
 */

/**
 * Serverless function to handle server search requests
 * This replaces the Next.js API route /api/servers/search
 */
exports.handler = async (event, context) => {
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  // Parse search parameters
  const params = event.queryStringParameters || {};
  const searchQuery = params.q || '';
  const tags = params.tag ? (Array.isArray(params.tag) ? params.tag : [params.tag]) : [];
  const category = params.category || '';
  const platform = params.platform || '';
  const limit = parseInt(params.limit || '10', 10);
  const offset = parseInt(params.offset || '0', 10);
  const sort = params.sort || 'stars';
  const order = params.order || 'desc';
  
  // For debugging - log request parameters
  console.log('API Request:', { 
    path: event.path,
    searchQuery, tags, category, platform, limit, offset, sort, order 
  });

  try {
    // Validate pagination parameters
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid limit parameter. Must be between 1 and 100.',
          servers: [],
          pagination: { total: 0, offset: 0, limit, hasMore: false }
        })
      };
    }
    
    if (isNaN(offset) || offset < 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid offset parameter. Must be non-negative.',
          servers: [],
          pagination: { total: 0, offset: 0, limit, hasMore: false }
        })
      };
    }
    
    try {
      // Log environment info for debugging
      const envInfo = logEnvironmentInfo();
      
      // Try different environment variable formats for Supabase connection
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      // Enhanced logging for environment variables
      console.log('API Environment Check:', { 
        supabaseUrlExists: !!supabaseUrl,
        supabaseKeyExists: !!supabaseKey,
        nodeEnv: process.env.NODE_ENV
      });
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase credentials missing, falling back to mock data');
        return useMockData(searchQuery, tags, category, platform, limit, offset, sort, order, headers);
      }
      
      // Create Supabase client with enhanced configuration for serverless functions
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false, // Don't persist session in server environment
          autoRefreshToken: false // Don't auto refresh token in serverless context
        },
        global: {
          headers: {
            'X-Client-Info': 'netlify-function-api-servers-search' // Identify client in logs
          },
        },
        // Set higher timeouts for serverless environment
        db: {
          schema: 'public'
        }
      });
      
      // Verify connection is working by making a simple query
      try {
        console.log('Testing Supabase connection...');
        const { data: testData, error: pingError } = await supabase.from('servers').select('id').limit(1);
        
        if (pingError) {
          console.error('Supabase connection test failed:', pingError);
          // Use custom error with detailed info for debugging
          throw new Error(`Supabase connection verification failed: ${pingError.message} (Code: ${pingError.code || 'unknown'})`);
        }
        
        console.log('Supabase connection successful. Test query result:', { dataExists: !!testData, count: testData?.length });
      } catch (pingTestError) {
        console.error('Error testing Supabase connection:', pingTestError);
        // Return mock data with error info when connection test fails
        return {
          statusCode: 200, // Still return 200 but with mock data and error flag
          headers,
          body: JSON.stringify({
            servers: mockServers.slice(0, limit),
            pagination: { total: mockServers.length, offset, limit, hasMore: (offset + limit) < mockServers.length },
            isMockData: true,
            error: {
              message: 'Using mock data due to Supabase connection error',
              details: pingTestError.message
            }
          })
        };
      }
      
      // Construct query with filters
      let query = supabase
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
      
      // Apply tags filter
      if (tags.length > 0) {
        query = query.contains('tags', tags);
      }
      
      // Apply sorting
      query = query.order(sort, { ascending: order === 'asc' });
      
      // Apply pagination
      query = query.range(offset, offset + limit - 1);
      
      // Execute the query
      const { data: servers, error, count } = await query;
      
      if (error) {
        // Enhanced error logging with detailed Supabase error information
        console.error('Error fetching servers:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to fetch servers: ' + error.message,
            errorCode: error.code,
            errorDetails: process.env.NODE_ENV === 'development' ? error.details : undefined,
            servers: [],
            pagination: { total: 0, offset, limit, hasMore: false }
          })
        };
      }
      
      // Return the servers with pagination metadata
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          servers: servers || [],
          pagination: {
            total: count || 0,
            offset,
            limit,
            hasMore: count ? offset + limit < count : false
          }
        })
      };
    } catch (supabaseError) {
      console.error('Supabase error:', supabaseError);
      // Return mock data with detailed error information
      return {
        statusCode: 200, // Return 200 with error info instead of 500
        headers,
        body: JSON.stringify({
          servers: mockServers.slice(0, limit),
          pagination: { total: mockServers.length, offset, limit, hasMore: (offset + limit) < mockServers.length },
          isMockData: true,
          error: {
            message: 'Using mock data due to Supabase query error',
            details: supabaseError.message,
            code: supabaseError.code || 'unknown'
          }
        })
      };
    }
  } catch (error) {
    // Enhanced error logging with stack trace
    console.error('Error in search API:', {
      message: error.message,
      stack: error.stack
    });
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: `Internal server error: ${error.message}`,
        servers: [],
        pagination: { total: 0, offset, limit, hasMore: false }
      })
    };
  }
};

/**
 * Utility function to filter and paginate mock data
 * Used as a fallback when Supabase credentials are not available
 * 
 * @param {string} searchQuery 
 * @param {string[]} tags 
 * @param {string} category 
 * @param {string} platform 
 * @param {number} limit 
 * @param {number} offset 
 * @param {string} sort 
 * @param {string} order 
 * @param {Object} headers - HTTP headers for the response
 * @returns {Object} - HTTP response object
 */
function useMockData(searchQuery, tags, category, platform, limit, offset, sort, order, headers) {
  console.log('Using mock data');
  
  // Filter servers by search query
  let filteredServers = [...mockServers];
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredServers = filteredServers.filter(server => 
      (server.name && server.name.toLowerCase().includes(query)) || 
      (server.description && server.description.toLowerCase().includes(query))
    );
  }
  
  // Filter by category
  if (category) {
    filteredServers = filteredServers.filter(server => 
      server.category && server.category.toLowerCase() === category.toLowerCase()
    );
  }
  
  // Filter by platform
  if (platform) {
    filteredServers = filteredServers.filter(server => 
      server.platform && server.platform.toLowerCase() === platform.toLowerCase()
    );
  }
  
  // Filter by tags
  if (tags.length > 0) {
    filteredServers = filteredServers.filter(server => {
      if (!server.tags) return false;
      return tags.every(tag => 
        server.tags.some(serverTag => 
          serverTag.toLowerCase() === tag.toLowerCase()
        )
      );
    });
  }
  
  // Sort the results
  if (sort) {
    filteredServers.sort((a, b) => {
      const aValue = a[sort] || 0;
      const bValue = b[sort] || 0;
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      return order === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }
  
  // Apply pagination
  const total = filteredServers.length;
  const paginatedServers = filteredServers.slice(offset, offset + limit);
  
  // Return filtered and paginated servers with mock data flag
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      servers: paginatedServers,
      pagination: {
        total: filteredServers.length,
        offset,
        limit,
        hasMore: offset + limit < filteredServers.length
      },
      isMockData: true,
      reason: 'Supabase connection unavailable or credentials missing'
    })
  };
}
