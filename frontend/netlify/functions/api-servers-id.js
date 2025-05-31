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
const mockServerDetails = {
  'pulse-auth-mcp': {
    id: 'pulse-auth-mcp',
    name: 'Pulse Auth MCP',
    description: 'Authentication and authorization server for the Model Context Protocol.',
    tags: ['auth', 'security', 'identity', 'oauth'],
    category: 'Security',
    platform: 'Node.js, Python',
    install_method: 'npm install pulse-auth-mcp',
    github_url: 'https://github.com/pulsemcp/auth-mcp',
    stars: 245,
    forks: 34,
    open_issues: 12,
    contributors: 8,
    last_updated: '2025-04-15T12:30:00Z',
    compatibility: {
      nodejs: true,
      python: true,
      go: false,
      java: false,
      rust: false
    },
    health: {
      status: 'online',
      uptime: 99.8,
      history: [
        { date: '2025-04-15', status: 'online', response_time: 120 },
        { date: '2025-04-14', status: 'online', response_time: 118 },
        { date: '2025-04-13', status: 'online', response_time: 125 },
        { date: '2025-04-12', status: 'degraded', response_time: 350 },
        { date: '2025-04-11', status: 'online', response_time: 115 }
      ]
    },
    changelog: [
      { version: '1.2.0', date: '2025-04-10', changes: 'Added support for OAuth2 PKCE flow' },
      { version: '1.1.5', date: '2025-03-28', changes: 'Fixed token validation issue' },
      { version: '1.1.0', date: '2025-03-15', changes: 'Added multi-factor authentication support' }
    ],
    slug: 'pulse-auth-mcp'
  },
  'pulse-vector-db': {
    id: 'pulse-vector-db',
    name: 'Pulse Vector DB',
    description: 'Vector database server for the Model Context Protocol with semantic search capabilities.',
    tags: ['vector', 'database', 'search', 'semantic'],
    category: 'Database',
    platform: 'Python',
    install_method: 'pip install pulse-vector-db',
    github_url: 'https://github.com/pulsemcp/vector-db',
    stars: 189,
    forks: 27,
    open_issues: 8,
    contributors: 5,
    last_updated: '2025-04-10T09:45:00Z',
    compatibility: {
      nodejs: true,
      python: true,
      go: false,
      java: false,
      rust: false
    },
    health: {
      status: 'online',
      uptime: 99.9,
      history: [
        { date: '2025-04-15', status: 'online', response_time: 85 },
        { date: '2025-04-14', status: 'online', response_time: 82 },
        { date: '2025-04-13', status: 'online', response_time: 80 },
        { date: '2025-04-12', status: 'online', response_time: 83 },
        { date: '2025-04-11', status: 'online', response_time: 81 }
      ]
    },
    changelog: [
      { version: '2.1.0', date: '2025-04-08', changes: 'Added support for multi-modal embeddings' },
      { version: '2.0.5', date: '2025-03-20', changes: 'Improved index performance by 30%' },
      { version: '2.0.0', date: '2025-03-01', changes: 'Major update with HNSW indexing' }
    ],
    slug: 'pulse-vector-db'
  }
};

/**
 * Serverless function to handle server details requests
 * This replaces the Next.js API route /api/servers/[id]
 */
exports.handler = async (event, context) => {
  // Set CORS headers for browser clients
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };
  
  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS enabled' })
    };
  }
  
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    // Extract server ID from path
    // Path format: /.netlify/functions/api-servers-id/SERVER_ID_OR_SLUG
    const path = event.path;
    const pathSegments = path.split('/');
    let serverId = pathSegments[pathSegments.length - 1];
    
    // Handle case where the URL might have a trailing slash
    if (!serverId || serverId === '') {
      serverId = pathSegments[pathSegments.length - 2];
    }
    
    // Alternative method using path parameters
    if (!serverId && event.pathParameters && event.pathParameters.id) {
      serverId = event.pathParameters.id;
    }
    
    // Another approach for Netlify paths
    const matches = path.match(/\/api-servers-id(?:\/(.+))?$/);
    if (matches && matches[1]) {
      serverId = matches[1];
    }
    
    console.log(`Server detail requested for ID: ${serverId}`);
    
    if (!serverId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Server ID is required',
          pathInfo: {
            fullPath: path,
            segments: pathSegments
          }
        })
      };
    }
    
    // Log environment info for debugging
    const envInfo = logEnvironmentInfo();
    
    // Try different environment variable formats for Supabase connection
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Enhanced logging for environment variables
    console.log('API Environment Check:', { 
      supabaseUrlExists: !!supabaseUrl,
      supabaseKeyExists: !!supabaseKey,
      nodeEnv: process.env.NODE_ENV,
      serverId
    });
    
    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials missing, falling back to mock data');
      return useMockData(serverId, headers);
    }
    
    // Create Supabase client with enhanced configuration for serverless functions
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false, // Don't persist session in server environment
        autoRefreshToken: false // Don't auto refresh token in serverless context
      },
      global: {
        headers: {
          'X-Client-Info': 'netlify-function-api-servers-id' // Identify client in logs
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
      
      console.log('Supabase connection test successful.');
    } catch (connectionError) {
      console.error('Error testing database connection:', connectionError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to connect to database',
          message: connectionError.message,
          isMockData: true,
          mockFallback: true,
          server: mockServerDetails[serverId] || null
        })
      };
    }
    
    // Try to fetch by ID or slug with improved query approach
    // Check if the serverId looks like a UUID (basic check)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(serverId);
    
    let serverQuery;
    if (isUuid) {
      // If it looks like a UUID, query by ID
      console.log('Querying by UUID ID:', serverId);
      serverQuery = await supabase
        .from('servers')
        .select('*')
        .eq('id', serverId)
        .maybeSingle();
    } else {
      // Otherwise try the slug field
      console.log('Querying by slug:', serverId);
      serverQuery = await supabase
        .from('servers')
        .select('*')
        .eq('slug', serverId)
        .maybeSingle();
        
      // If no result by slug, try name as fallback
      if (!serverQuery.data && !serverQuery.error) {
        console.log('No result by slug, trying name match');
        serverQuery = await supabase
          .from('servers')
          .select('*')
          .ilike('name', serverId.replace(/-/g, ' '))
          .maybeSingle();
      }
    }
    
    const { data: server, error } = serverQuery;
    
    if (error) {
      console.error('Error fetching server details:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to fetch server details',
          message: error.message,
          isMockData: true,
          mockFallback: true,
          server: mockServerDetails[serverId] || null
        })
      };
    }
    
    if (!server) {
      console.log(`Server not found for ID/slug: ${serverId}, falling back to mock data`);
      return useMockData(serverId, headers);
    }
    
    // Fetch additional related data
    const [healthResult, changelogResult, compatibilityResult] = await Promise.all([
      supabase
        .from('server_health')
        .select('*')
        .eq('server_id', server.id)
        .order('date', { ascending: false })
        .limit(5),
      
      supabase
        .from('server_changelog')
        .select('*')
        .eq('server_id', server.id)
        .order('date', { ascending: false })
        .limit(5),
      
      supabase
        .from('server_compatibility')
        .select('*')
        .eq('server_id', server.id)
    ]);
    
    // Combine server data with related info
    const enhancedServer = {
      ...server,
      health: {
        status: server.health_status || 'unknown',
        uptime: 99.5, // Could be calculated from health history
        history: healthResult.data || []
      },
      changelog: changelogResult.data || [],
      compatibility: compatibilityResult.data ? {
        nodejs: compatibilityResult.data.find(c => c.platform === 'nodejs')?.supported || false,
        python: compatibilityResult.data.find(c => c.platform === 'python')?.supported || false,
        go: compatibilityResult.data.find(c => c.platform === 'go')?.supported || false,
        java: compatibilityResult.data.find(c => c.platform === 'java')?.supported || false,
        rust: compatibilityResult.data.find(c => c.platform === 'rust')?.supported || false
      } : {}
    };
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60' // Cache for 60 seconds
      },
      body: JSON.stringify({
        server: enhancedServer,
        isMockData: false
      })
    };
  } catch (error) {
    console.error('Unhandled error in server detail function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        isMockData: true
      })
    };
  }
};

/**
 * Utility function to return mock data
 * Used as a fallback when Supabase credentials are not available
 * @param {string} serverId - The server ID to fetch details for
 * @param {Object} headers - HTTP headers for the response
 * @returns {Object} - HTTP response object
 */
function useMockData(serverId, headers) {
  // Check if we have mock data for this server
  const mockServer = mockServerDetails[serverId];
  
  if (!mockServer) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Server not found',
        message: `No server found with ID: ${serverId}`,
        isMockData: true
      })
    };
  }
  
  return {
    statusCode: 200,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=60' // Cache for 60 seconds
    },
    body: JSON.stringify({
      server: mockServer,
      isMockData: true,
      mockFallback: true
    })
  };
}
