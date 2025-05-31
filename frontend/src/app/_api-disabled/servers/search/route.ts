import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { mockServers } from '@/lib/mock-data';

// Enable dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Types for server data
type HealthStatus = 'online' | 'offline' | 'degraded' | 'unknown';

interface Server {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  platform: string | null;
  install_method: string | null;
  stars: number | null;
  health_status?: HealthStatus;
  last_checked?: string;
  slug?: string | null;
}

interface PaginationMeta {
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

interface ServerSearchResponse {
  servers: Server[];
  pagination: PaginationMeta;
}

/**
 * API Route: GET /api/servers/search
 * Handles searching and pagination for MCP servers
 * 
 * Query parameters:
 * - q: Search query for name or description
 * - tags: Comma-separated list of tags to filter by
 * - category: Filter by category
 */
export async function GET(request: NextRequest) {
  // Parse search parameters
  const searchParams = request.nextUrl.searchParams;
  const searchQuery = searchParams.get('q') || '';
  const tags = searchParams.getAll('tag') || [];
  const category = searchParams.get('category') || '';
  const platform = searchParams.get('platform') || '';
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const sort = searchParams.get('sort') || 'stars';
  const order = searchParams.get('order') || 'desc';
  
  // For debugging - log request parameters
  console.log('API Request:', { 
    path: request.nextUrl.pathname,
    searchQuery, tags, category, platform, limit, offset, sort, order 
  });

  try {
    // Validate pagination parameters
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { 
          error: 'Invalid limit parameter. Must be between 1 and 100.',
          servers: [],
          pagination: { total: 0, offset: 0, limit, hasMore: false }
        },
        { status: 400 }
      );
    }
    
    if (isNaN(offset) || offset < 0) {
      return NextResponse.json(
        { 
          error: 'Invalid offset parameter. Must be non-negative.',
          servers: [],
          pagination: { total: 0, offset: 0, limit, hasMore: false }
        },
        { status: 400 }
      );
    }
    
    // Tags are already parsed from the URL parameters
    // (const tags = searchParams.getAll('tag') || []; from above)
    
    try {
      // Initialize Supabase client
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      // Enhanced logging for environment variables
      console.log('API Environment Check:', { 
        supabaseUrlExists: !!supabaseUrl,
        supabaseKeyExists: !!supabaseKey,
        nodeEnv: process.env.NODE_ENV
      });
      
      if (!supabaseUrl || !supabaseKey) {
        console.warn('Supabase credentials missing, falling back to mock data');
        return useMockData(searchQuery, tags, category, platform, limit, offset, sort, order);
      }
      
      // Create Supabase client with options for better error handling
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false // Don't persist session in server environment
        }
      });
      
      // Verify connection is working by making a simple query
      try {
        const { error: pingError } = await supabase.from('servers').select('id').limit(1);
        if (pingError) {
          console.error('Supabase connection test failed:', pingError);
          throw new Error(`Supabase connection verification failed: ${pingError.message}`);
        }
      } catch (pingTestError) {
        console.error('Error testing Supabase connection:', pingTestError);
        throw pingTestError;
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
          hint: error.hint,
          query: query.toString() // Use toString() instead of toJSON()
        });
        
        return NextResponse.json(
          { 
            error: 'Failed to fetch servers: ' + error.message,
            errorCode: error.code,
            errorDetails: process.env.NODE_ENV === 'development' ? error.details : undefined,
            servers: [],
            pagination: { total: 0, offset, limit, hasMore: false }
          },
          { status: 500 }
        );
      }
      
      // Return the servers with pagination metadata
      return NextResponse.json({
        servers: servers || [],
        pagination: {
          total: count || 0,
          offset,
          limit,
          hasMore: count ? offset + limit < count : false
        }
      });
    } catch (supabaseError) {
      console.error('Supabase error:', supabaseError);
      return useMockData(searchQuery, tags, category, platform, limit, offset, sort, order);
    }
  } catch (error) {
    // Enhanced error logging with stack trace
    console.error('Error in search API:', {
      message: (error as Error).message,
      stack: (error as Error).stack,
      params: { searchQuery, tags, category, platform, limit, offset, sort, order }
    });
    
    // Log fallback to mock data
    console.warn('Falling back to mock data due to API error');
    
    // Always return 200 OK but with an error flag and mock data
    // This helps the frontend continue functioning even when the database has issues
    const mockResponse = useMockData(searchQuery, tags, category, platform, limit, offset, sort, order);
    return NextResponse.json(
      { 
        error: 'An error occurred when accessing the database: ' + (error as Error).message,
        errorDetails: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
        usedMockData: true,
        ...mockResponse
      },
      // Use 200 status to allow the frontend to continue functioning
      { status: 200 }
    );
  }
}

/**
 * Utility function to filter and paginate mock data
 * Used as a fallback when Supabase credentials are not available
 */
function useMockData(
  searchQuery: string, 
  tags: string[], 
  category: string, 
  platform: string, 
  limit: number, 
  offset: number, 
  sort: string, 
  order: string
) {
  // Filter mock data based on search criteria
  let filteredServers = [...mockServers];
  
  // Apply search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filteredServers = filteredServers.filter(server => 
      server.name.toLowerCase().includes(query) || 
      (server.description?.toLowerCase().includes(query) || false)
    );
  }
  
  // Apply tag filters
  if (tags.length > 0) {
    filteredServers = filteredServers.filter(server => 
      server.tags?.some(tag => tags.includes(tag))
    );
  }
  
  // Apply category filter
  if (category) {
    filteredServers = filteredServers.filter(server => 
      server.category === category
    );
  }
  
  // Apply platform filter
  if (platform) {
    filteredServers = filteredServers.filter(server => 
      server.platform === platform
    );
  }
  
  // Sort the results
  filteredServers.sort((a, b) => {
    const valueA = a[sort as keyof typeof a];
    const valueB = b[sort as keyof typeof b];
    
    // Handle null values
    if (valueA === null && valueB === null) return 0;
    if (valueA === null) return order === 'asc' ? 1 : -1;
    if (valueB === null) return order === 'asc' ? -1 : 1;
    
    // Handle string comparison
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return order === 'asc' 
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }
    
    // Handle number comparison
    if (typeof valueA === 'number' && typeof valueB === 'number') {
      return order === 'asc' ? valueA - valueB : valueB - valueA;
    }
    
    return 0;
  });
  
  // Calculate pagination
  const totalCount = filteredServers.length;
  const paginatedServers = filteredServers.slice(offset, offset + limit);
  
  // Add health status to each server
  const serversWithHealth = paginatedServers.map(server => {
    // Create a properly typed server object
    const typedServer: Server = {
      ...server,
      health_status: (server.health_status || 'online') as HealthStatus,
      // Use last_updated as last_checked if it exists, otherwise use current date
      last_checked: server.last_updated || new Date().toISOString()
    };
    return typedServer;
  });
  
  return NextResponse.json({
    servers: serversWithHealth,
    pagination: {
      total: totalCount,
      offset,
      limit,
      hasMore: offset + limit < totalCount
    }
  });
}
