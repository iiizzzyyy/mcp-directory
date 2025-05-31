// Server component for fully dynamic rendering
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Server } from '@/lib/api-client';
import ServersPageContent from './servers-page-content';

// This is a dynamically rendered server component
// It uses server-side data fetching and passes props to client components as needed
export const dynamic = 'force-dynamic';
export const revalidate = 0; // No cache, always fetch fresh data

export interface SearchParams {
  page?: string;
  size?: string;
  sort?: string;
  order?: string;
  category?: string;
  tag?: string;
  query?: string;
}

// Server component that fetches data at request time
export default async function ServersPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // Parse search parameters with defaults
  const currentPage = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.size) || 12;
  const sortBy = searchParams?.sort || 'stars';
  const sortOrder = searchParams?.order || 'desc';
  const categoryFilter = searchParams?.category || '';
  const tagFilter = searchParams?.tag || '';
  const searchQuery = searchParams?.query || '';

  try {
    // Use our custom Supabase client for server-side data fetching
    const supabase = createServerSupabaseClient();

    // Calculate offset for pagination
    const offset = (currentPage - 1) * pageSize;

    // Build query
    let query = supabase
      .from('servers')
      .select('*', { count: 'exact' })
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + pageSize - 1);
    
    // Apply filters if present
    if (categoryFilter) {
      query = query.eq('category', categoryFilter);
    }
    
    if (tagFilter) {
      query = query.contains('tags', [tagFilter]);
    }
    
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }
    
    // Execute query
    const { data: servers, error, count } = await query;
    
    // Error handling - use mock data if needed
    if (error) {
      console.error('Error fetching servers:', error.message);
      
      // Load mock data as fallback
      const { mockServers } = await import('@/lib/mock-data');
      
      // Calculate pagination with mock data
      const totalCount = mockServers.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      
      // Convert mock data to match Server interface
      const typedServers = mockServers.slice(offset, offset + pageSize).map(server => ({
        ...server,
        health_status: (server.health_status as 'online' | 'offline' | 'degraded' | 'unknown' || 'unknown')
      }));
      
      // Return client component with mock data
      return (
        <ServersPageContent 
          servers={typedServers} 
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          totalPages={totalPages}
          error={`Failed to fetch servers: ${error.message}`}
        />
      );
    }
    
    // Calculate pagination values
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // Return client component with data
    return (
      <ServersPageContent 
        servers={servers || []} 
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
      />
    );
  } catch (error) {
    console.error('Unexpected error in servers page:', error);
    
    // Load mock data as fallback for any unexpected errors
    const { mockServers } = await import('@/lib/mock-data');
    
    // Convert mock data to match Server interface
    const typedServers = mockServers.slice(0, pageSize).map(server => ({
      ...server,
      health_status: (server.health_status as 'online' | 'offline' | 'degraded' | 'unknown' || 'unknown')
    }));
    
    // Return client component with mock data
    return (
      <ServersPageContent 
        servers={typedServers} 
        totalCount={mockServers.length}
        currentPage={1}
        pageSize={pageSize}
        totalPages={Math.ceil(mockServers.length / pageSize)}
        error="An unexpected error occurred while fetching servers"
      />
    );
  }
}
