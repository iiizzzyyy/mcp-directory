// Server component for fully dynamic rendering
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Server } from '@/lib/api-client';
import ServersPageContent from './servers-page-content';

// Type definition is now imported from lib/api-client

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
  const pageSize = Number(searchParams?.size) || 6;
  const sortBy = searchParams?.sort || 'name';
  const sortOrder = searchParams?.order || 'asc';
  const categoryFilter = searchParams?.category || '';
  const tagFilter = searchParams?.tag || '';
  const searchQuery = searchParams?.query || '';
  
  // Create Supabase client for server component
  const supabase = createServerComponentClient({ cookies });
  
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
    query = query.ilike('name', `%${searchQuery}%`);
  }
  
  // Execute query
  const { data: servers, error, count } = await query;
  
  // Error handling - use mock data if needed
  if (error) {
    console.error('Error fetching servers:', error.message);
    // In a production app, you might want to redirect to an error page
    // or handle gracefully
    
    // Load mock data as fallback
    const { mockServers } = await import('@/lib/mock-data');
    
    // Convert mock data to match Server interface
    const fallbackServers = mockServers.slice(offset, offset + pageSize).map(server => ({
      id: server.id,
      name: server.name,
      description: server.description,
      category: server.category,
      tags: server.tags,
      platform: server.platform,
      install_method: server.install_method,
      stars: server.stars,
      health_status: (server.health_status || 'unknown') as 'online' | 'offline' | 'degraded' | 'unknown',
      last_checked: server.last_updated,
      github_url: server.github_url,
      slug: null
    }));
    
    const totalCount = mockServers.length;
    
    // Calculate pagination values
    const totalPages = Math.ceil(totalCount / pageSize);
    
    return (
      <ServersPageContent 
        servers={fallbackServers} 
        totalCount={totalCount}
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={totalPages}
        error={error.message}
      />
    );
  }
  
  // Calculate pagination values with real data
  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  
  return (
    <ServersPageContent 
      servers={servers || []}
      totalCount={totalCount}
      currentPage={currentPage}
      pageSize={pageSize}
      totalPages={totalPages}
    />
  );
}
