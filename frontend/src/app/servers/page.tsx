// Server component for fully dynamic rendering
import { Suspense } from "react";
import { Metadata } from "next";
import { getServers } from "@/lib/data-fetching";
import ServersPageContent from "./servers-page-content";
import { Server } from "@/lib/types/index";
import ServersListLoading from "./loading";
import { PaginationMeta } from "@/lib/data-fetching";

// This is a dynamically rendered server component
// It uses server-side data fetching and passes props to client components as needed
export const dynamic = 'force-dynamic';
export const revalidate = 0; // No cache, always fetch fresh data

/**
 * Generate metadata for the servers listing page
 */
export const metadata: Metadata = {
  title: 'MCP Servers Directory',
  description: 'Browse and discover Model Context Protocol servers for your AI applications',
  openGraph: {
    title: 'MCP Servers Directory',
    description: 'Browse and discover Model Context Protocol servers for your AI applications',
    type: 'website'
  }
};

export interface SearchParams {
  page?: string;
  pageSize?: string;
  query?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: string;
}

/**
 * Inner server component that handles data fetching
 * This is used inside a Suspense boundary in the main ServersPage component
 */
async function ServersList({
  page = 1,
  pageSize = 12,
  query = '',
  category = '',
  sortBy = 'stars',
  sortOrder = 'desc'
}: {
  page: number;
  pageSize: number;
  query: string;
  category: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}) {
  try {
    // Fetch servers using our utility function
    const { servers, pagination, error } = await getServers(
      { page, pageSize, sortBy, sortOrder },
      { query, category }
    );

    // Return error state to the client component
    if (error) {
      return <ServersPageContent servers={[]} pagination={pagination} error={error} />;
    }

    // Return servers to the client component
    return <ServersPageContent servers={servers} pagination={pagination} />;
  } catch (error) {
    console.error('Error in ServersList:', error);
    
    // Create a default pagination object for error state
    const defaultPagination: PaginationMeta = {
      totalCount: 0,
      currentPage: page,
      pageSize,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false
    };
    
    return (
      <ServersPageContent 
        servers={[]} 
        pagination={defaultPagination}
        error={error instanceof Error ? error.message : 'An error occurred while fetching servers'} 
      />
    );
  }
}

/**
 * Main servers page component
 * Provides the layout and wraps the ServersList component in a Suspense boundary
 */
export default async function ServersPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  // Parse search parameters with defaults
  const page = Number(searchParams?.page) || 1;
  const pageSize = Number(searchParams?.pageSize) || 12;
  const query = searchParams?.query?.toString() || '';
  const category = searchParams?.category?.toString() || '';
  const sortBy = searchParams?.sortBy?.toString() || 'stars';
  const sortOrder = (searchParams?.sortOrder?.toString() || 'desc') as 'asc' | 'desc';

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">MCP Servers Directory</h1>
      <p className="text-muted-foreground mb-8">
        Browse and discover Model Context Protocol servers for AI assistants
      </p>
      
      {/* Wrap dynamic content in Suspense for streaming */}
      <Suspense fallback={<ServersListLoading />}>
        {/* This inner component will be rendered after data is fetched */}
        <ServersList 
          page={page}
          pageSize={pageSize}
          query={query}
          category={category}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      </Suspense>
    </div>
  );
}
