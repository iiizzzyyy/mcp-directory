"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { ServerCard } from '@/components/discover/server-card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Filter, X, AlertCircle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { mockServers, shouldUseMockData } from '@/lib/mock-data';
import { createClient } from '@supabase/supabase-js';
import SearchInput from '@/components/search/SearchInput';
import { FilterGroup } from '@/components/filters/FilterGroup';
import { Pagination } from '@/components/ui/pagination';

// Type for health status
type HealthStatus = 'online' | 'offline' | 'degraded' | 'unknown';

// Define the server type based on our database schema
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

// Define filter options and counts that will be populated from data
interface FilterCounts {
  tags: { value: string; label: string; count: number }[];
  categories: { value: string; label: string; count: number }[];
  platforms: { value: string; label: string; count: number }[];
}

function DiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Parse initial filters from URL query parameters
  const initialSearchQuery = searchParams?.get('q') || '';
  const initialTags = searchParams?.get('tags')?.split(',').filter(Boolean) || [];
  const initialCategories = searchParams?.get('categories')?.split(',').filter(Boolean) || [];
  const initialPlatforms = searchParams?.get('platforms')?.split(',').filter(Boolean) || [];
  
  // State for servers and loading status
  const [servers, setServers] = useState<Server[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });
  
  // State for search and filters
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(initialPlatforms);
  
  // State for filter options with counts
  const [filterCounts, setFilterCounts] = useState<FilterCounts>({
    tags: [],
    categories: [],
    platforms: [],
  });
  
  // State for mobile filter visibility
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  // Function to update URL with current filters and pagination
  const updateUrlWithFilters = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedTags.length) params.set('tags', selectedTags.join(','));
    if (selectedCategories.length) params.set('categories', selectedCategories.join(','));
    if (selectedPlatforms.length) params.set('platforms', selectedPlatforms.join(','));
    if (currentPage > 1) params.set('page', currentPage.toString());
    
    const url = `/discover${params.toString() ? `?${params.toString()}` : ''}`;
    router.replace(url, { scroll: false });
  };
  
  // Use the imported components and types defined at the top of the file

// Define fetchServers function outside of useEffect to make it accessible to other hooks
  const fetchServers = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Calculate offset based on current page
        const offset = (currentPage - 1) * paginationMeta.limit;
        
        try {
          // Use the API client to fetch servers
          const { searchServers } = await import('@/lib/api-client');
          
          // Call the centralized API client
          const data = await searchServers({
            query: searchQuery,
            tags: selectedTags,
            category: selectedCategories.length ? selectedCategories[0] : '',
            platform: selectedPlatforms.length ? selectedPlatforms[0] : '',
            limit: paginationMeta.limit,
            offset: offset,
            sort: 'stars',
            order: 'desc'
          });
          
          // Handle case where API returns an error but still includes data
          if (data.error) {
            // Log the error but continue using the data provided
            console.warn(`API returned an error: ${data.error}`);
            
            // Check if we're using mock data
            if (data.usedMockData) {
              setUsingMockData(true);
              setError('Unable to connect to database. Showing fallback data.');
            } else {
              setUsingMockData(false);
              setError('Warning: Some data may not be current.');
            }
          } else {
            // Clear any previous errors if the request succeeded
            setError(null);
            setUsingMockData(false);
          }
          
          // Use the provided servers and pagination, regardless of whether there was an error
          setServers(data.servers);
          setPaginationMeta(data.pagination);
          
        } catch (error) {
          // This catch block now only handles fetch failures or JSON parsing errors
          console.error('Error fetching servers:', error);
          setError('Failed to load servers. Showing fallback data.');
          
          // Fallback to mock data if API completely fails to respond
          console.warn('Falling back to mock data due to complete API failure');
          setUsingMockData(true);
          const serversData = mockServers;
          
          // Add health status to each server
          const serversWithHealth = serversData.map((server: any) => {
            return {
              ...server,
              health_status: server.health_status || 'online' as HealthStatus,
              last_checked: new Date().toISOString()
            };
          });
          
          // Apply mock pagination
          const start = offset;
          const end = Math.min(start + paginationMeta.limit, serversWithHealth.length);
          const paginatedServers = serversWithHealth.slice(start, end);
          
          setServers(paginatedServers);
          setPaginationMeta({
            total: serversWithHealth.length,
            limit: paginationMeta.limit,
            offset,
            hasMore: end < serversWithHealth.length
          });
        }
        
        
        // Build filter counts from data
        const tagCounts: Record<string, number> = {};
        const categoryCounts: Record<string, number> = {};
        const platformCounts: Record<string, number> = {};
        
        servers.forEach((server: Server) => {
          // Count tags
          server.tags?.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
          
          // Count categories
          if (server.category) {
            categoryCounts[server.category] = (categoryCounts[server.category] || 0) + 1;
          }
          
          // Count platforms
          if (server.platform) {
            platformCounts[server.platform] = (platformCounts[server.platform] || 0) + 1;
          }
        });
        
        // Convert counts to filter options
        setFilterCounts({
          tags: Object.entries(tagCounts)
            .map(([value, count]) => ({ value, label: value, count }))
            .sort((a, b) => b.count - a.count),
          categories: Object.entries(categoryCounts)
            .map(([value, count]) => ({ value, label: value, count }))
            .sort((a, b) => b.count - a.count),
          platforms: Object.entries(platformCounts)
            .map(([value, count]) => ({ value, label: value, count }))
            .sort((a, b) => b.count - a.count),
        });
      } catch (err) {
        console.error('Error fetching servers:', err);
        setError('Failed to load servers. Please try again later.');
      } finally {
        setIsLoading(false);
      }
  };
  
  // Initial data fetch
  useEffect(() => {
    // Get page from URL if it exists
    const pageParam = searchParams?.get('page');
    if (pageParam) {
      const parsedPage = parseInt(pageParam, 10);
      if (!isNaN(parsedPage) && parsedPage > 0 && parsedPage !== currentPage) {
        setCurrentPage(parsedPage);
        return; // The page change will trigger fetchServers
      }
    }
    
    // Otherwise fetch with current page
    fetchServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // When filters change, reset to page 1 and trigger refetch
  useEffect(() => {
    // Only reset page if we're not on page 1
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      // If already on page 1, manually trigger a refetch
      fetchServers();
    }
    
    updateUrlWithFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedTags, selectedCategories, selectedPlatforms]);
  
  // When page changes, update URL and trigger refetch
  useEffect(() => {
    fetchServers();
    updateUrlWithFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);
  
  // Handle page change
  const handlePageChange = (newPage: number) => {
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentPage(newPage);
  };
  
  // Handle server card click
  const handleServerClick = (server: Server) => {
    // Navigate to the server detail page
    const slug = server.slug || server.id;
    if (slug) {
      router.push(`/servers/${slug}`);
    } else {
      console.error('Server has no ID or slug');
    }
  };
  
  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedCategories([]);
    setSelectedPlatforms([]);
  };
  
  // Count total active filters
  const totalActiveFilters = 
    (searchQuery ? 1 : 0) + 
    selectedTags.length + 
    selectedCategories.length + 
    selectedPlatforms.length;
  
  return (
    <div className="w-full">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Discover MCP Servers</h1>
        <p className="text-muted-foreground">
          Browse and search through our directory of Model Context Protocol servers
        </p>
      </div>
      
      {/* Search and filters section */}
      <div className="space-y-4 mb-8">
        {/* Search input */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <SearchInput 
            value={searchQuery} 
            onChange={setSearchQuery}
            placeholder="Search by name, description..."
            className="w-full sm:w-96"
          />
          
          <div className="flex items-center gap-2 ml-auto">
            {/* Show/hide filters button for mobile */}
            <Button 
              variant="outline" 
              size="sm"
              className="sm:hidden flex items-center gap-1"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {totalActiveFilters > 0 && (
                <span className="ml-1 bg-primary/20 text-xs rounded-full px-1.5">
                  {totalActiveFilters}
                </span>
              )}
            </Button>
            
            {/* Clear all filters button (shown only when filters are active) */}
            {totalActiveFilters > 0 && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>
        
        {/* Filters - hidden on mobile until toggled */}
        <div className={`${showMobileFilters ? 'block' : 'hidden'} sm:block`}>
          <FilterGroup 
            tags={filterCounts.tags}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            
            categories={filterCounts.categories}
            selectedCategories={selectedCategories}
            onCategoriesChange={setSelectedCategories}
            
            platforms={filterCounts.platforms}
            selectedPlatforms={selectedPlatforms}
            onPlatformsChange={setSelectedPlatforms}
          />
        </div>
        
        <Separator />
        
        {/* Results count */}
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <div>
            {!isLoading && (
              <>
                <span className="font-medium">{paginationMeta.total}</span> 
                {paginationMeta.total === 1 ? ' server' : ' servers'} found
                {totalActiveFilters > 0 && ' with current filters'}
                {paginationMeta.total > 0 && servers.length > 0 && (
                  <span className="ml-1">
                    (showing {paginationMeta.offset + 1} to {Math.min(paginationMeta.offset + servers.length, paginationMeta.total)})
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Mock Data Banner - only shown when using mock data */}
      {usingMockData && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded shadow-sm dark:bg-amber-950/20 dark:border-amber-500">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-300">Using Example Data</h3>
              <p className="text-sm text-amber-700 mt-1 dark:text-amber-400">
                Unable to connect to the database. Displaying example data for demonstration purposes.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Error message - only shown for non-mock data errors */}
      {error && !usingMockData && (
        <div className="rounded-md bg-destructive/10 p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-destructive mr-2" />
            <p className="text-destructive">{error}</p>
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {!isLoading && servers.length === 0 && !error && (
        <div className="text-center py-12 border rounded-md">
          <Info className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No servers found</h3>
          <p className="text-muted-foreground mb-4">
            {totalActiveFilters > 0 
              ? 'Try adjusting your filters or search query'
              : 'There are no MCP servers in the directory yet'}
          </p>
          {totalActiveFilters > 0 && (
            <Button onClick={clearAllFilters}>
              Clear all filters
            </Button>
          )}
        </div>
      )}
      
      {/* Server grid */}
      {!isLoading && servers.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {servers.map(server => (
              <ServerCard 
                key={server.id}
                name={server.name}
                description={server.description || ''}
                tags={server.tags || []}
                healthStatus={server.health_status || 'unknown'}
                stars={server.stars || undefined}
                platform={server.platform || undefined}
                installMethod={server.install_method || undefined}
                lastChecked={server.last_checked ? server.last_checked : undefined}
                onClick={() => handleServerClick(server)}
              />
            ))}
          </div>
          
          {/* Pagination */}
          {paginationMeta.total > 0 && (
            <Pagination
              currentPage={currentPage}
              totalCount={paginationMeta.total}
              pageSize={paginationMeta.limit}
              onPageChange={handlePageChange}
              className="mt-8"
            />
          )}
        </>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <DiscoverContent />
    </Suspense>
  );
}
