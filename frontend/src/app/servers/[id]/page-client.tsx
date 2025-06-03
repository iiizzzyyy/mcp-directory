'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent } from '@/components/ui/tabs';

// Import extended types to fix type errors
import '@/lib/types/server-extensions';

// Import the new dark theme components
import ServerHeader from '@/components/server-detail/ServerHeader';
import TabNavigation from '@/components/server-detail/TabNavigation';
import InstallationPanel from '@/components/server-detail/InstallationPanel';
import ToolsSection from '@/components/server-detail/ToolsSection';
import StatsPanel from '@/components/server-detail/StatsPanel';
import DarkThemeLayout from '@/components/server-detail/DarkThemeLayout';

// Import skeleton loaders for better UX
import { 
  StatsSkeletonLoader,
  ServerHeaderSkeleton, 
  TabNavigationSkeleton,
  ToolsSkeletonLoader,
  InstallationSkeletonLoader,
  MetricsSkeletonLoader 
} from '@/components/server-detail/SkeletonLoaders';

// Server Detail Components
import { OverviewTab } from "@/components/server-detail/OverviewTab";
import InstallationTab from "@/components/server-detail/InstallationTab";
import { MetricsTab } from "@/components/server-detail/MetricsTab";
import ServerRecommendations from '@/components/recommendations/ServerRecommendations';

// API and Types
import { fetchServerMetrics, trackServerView } from '@/lib/metrics-client';
import { Server } from '@/lib/types';
import { Tool } from '@/lib/types/tool';

/**
 * Client component for server detail page
 * Handles UI interactions and rendering of tabs
 * Redesigned to match Smithery's UI pattern (XOM-104)
 * Uses extended Server type with additional metadata fields
 */
import { z } from 'zod';

// Define Zod schema for runtime data validation
const MetricsSchema = z.object({
  monthly_tool_calls: z.number().optional(),
  success_rate: z.number().optional(),
  average_response_time: z.number().optional(),
  active_users: z.number().optional(),
  uptime_percentage: z.number().optional(),
  last_updated: z.string().optional(),
});

interface ServerDetailClientProps {
  server: Server;
  error?: string;
}

type Metrics = z.infer<typeof MetricsSchema>;

export function ServerDetailClient({ server, error }: { server: Server; error?: string }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [serverMetrics, setServerMetrics] = useState<any>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTabDataLoading, setIsTabDataLoading] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Create mock tools data if server doesn't have tools data yet
  const mockTools: Tool[] = [
    {
      name: "search_documentation",
      description: "Search documentation for specific content",
      parameters: [
        {
          name: "query",
          type: "string",
          description: "The search query",
          required: true
        },
        {
          name: "max_results",
          type: "number",
          description: "Maximum number of results to return",
          required: false,
          default: 10
        }
      ],
      example: 'search_documentation({ query: "authentication", max_results: 5 })'
    },
    {
      name: "get_user_info",
      description: "Retrieve information about the current user",
      parameters: [
        {
          name: "fields",
          type: "array",
          description: "List of fields to retrieve",
          required: false,
          default: ["name", "email", "role"]
        }
      ],
      example: 'get_user_info({ fields: ["name", "email", "permissions"] })'
    }
  ];
  
  if (error) {
    return (
      <DarkThemeLayout>
        <div className="flex flex-col gap-6 py-10">
          <Link href="/servers" className="flex items-center text-sm text-zinc-400 hover:text-white transition-colors">
            <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
            Back to servers
          </Link>
          
          <div className="rounded-lg border border-red-800/50 bg-red-900/10 p-8 text-center">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error Loading Server</h2>
            <p className="text-zinc-400 mb-4">{error}</p>
            <Button variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white" asChild>
              <Link href="/servers">Browse All Servers</Link>
            </Button>
          </div>
        </div>
      </DarkThemeLayout>
    );
  }
  
  useEffect(() => {
    // Track page view when component mounts
    if (server?.id) {
      trackServerView(server.id)
        .catch(err => console.warn('Failed to track server view:', err));
      
      // Set a small timeout to simulate data loading for a smoother UX
      const timer = setTimeout(() => setIsLoading(false), 900);
      return () => clearTimeout(timer);
    }
  }, [server?.id]);

  // Fetch metrics data when metrics tab is active
  useEffect(() => {
    if (activeTab === 'metrics' && server?.id) {
      setIsMetricsLoading(true);
      fetchServerMetrics(server.id, '7d')
        .then(data => {
          setServerMetrics(data);
        })
        .catch(err => console.error('Error fetching metrics:', err))
        .finally(() => setIsMetricsLoading(false));
    }
    
    // Simulate tab data loading for smooth transitions
    setIsTabDataLoading(true);
    const timer = setTimeout(() => setIsTabDataLoading(false), 300);
    return () => clearTimeout(timer);
  }, [activeTab, server?.id]);

  if (!server) {
    return (
      <DarkThemeLayout>
        <div className="flex flex-col gap-6 py-10">
          <Link href="/servers" className="flex items-center text-sm text-zinc-400 hover:text-white transition-colors">
            <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5"/>
              <path d="M12 19l-7-7 7-7"/>
            </svg>
            Back to servers
          </Link>
          
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 text-center">
            <h2 className="text-xl font-semibold text-white mb-2">Server Not Found</h2>
            <p className="text-zinc-400 mb-4">The requested server could not be found.</p>
            <Button variant="outline" className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white" asChild>
              <Link href="/servers">Browse All Servers</Link>
            </Button>
          </div>
        </div>
      </DarkThemeLayout>
    );
  }
  
  // Load metrics data on tab change
  useEffect(() => {
    if (activeTab === 'metrics') {
      fetchServerMetricsData();
    }
  }, [activeTab]);

  // Track server view on component mount
  useEffect(() => {
    trackServerView(server.id);
  }, [server.id]);

  // Fetch server metrics data
  const fetchServerMetricsData = async () => {
    if (!server.id) return;
    setIsMetricsLoading(true);
    try {
      const metrics = await fetchServerMetrics(server.id);
      setServerMetrics(metrics);
    } catch (error) {
      console.error('Error fetching server metrics:', error);
    } finally {
      setIsMetricsLoading(false);
    }
  };
  
  // Get statistics from server data or use mock defaults if not available
  const serverStats = {
    monthlyToolCalls: server.monthly_tool_calls ?? Math.floor(Math.random() * 100000) + 10000,
    successRate: server.success_rate ?? Math.floor(Math.random() * 15) + 85, // 85-100%
    averageResponseTime: server.average_response_time ?? Math.floor(Math.random() * 400) + 100, // 100-500ms
    securityAudit: server.security_audit ?? Math.random() > 0.3, // 70% chance of having security audit
    license: server.license ?? "MIT",
    version: server.version ?? "1.0.0",
    activeUsers: server.active_users ?? Math.floor(Math.random() * 10000) + 1000
  };
  
  // Get tools data from server or use mock data if not available
  const serverTools = server.tools ?? mockTools;
  
  return (
    <DarkThemeLayout>
      {/* Server header with icon, name, verification status */}
      {isLoading ? (
        <ServerHeaderSkeleton />
      ) : (
        <ServerHeader 
          server={server} 
          verificationStatus={server.verification_status ?? (serverStats.securityAudit ? 'verified' : 'unknown')} 
        />
      )}
      
      {/* Server statistics */}
      <div className="mt-8">
        {isLoading ? (
          <StatsSkeletonLoader />
        ) : (
          <StatsPanel server={server} metrics={serverStats} />
        )}
      </div>
      
      {/* Tab navigation */}
      <div className="mt-8">
        {isLoading ? (
          <TabNavigationSkeleton />
        ) : (
          <TabNavigation activeTab={activeTab} onChange={setActiveTab} />
        )}
        
        <Tabs value={activeTab} className="mt-0">
          <TabsContent value="overview" className="mt-6">
            {isTabDataLoading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-zinc-800 rounded w-3/4"></div>
                <div className="h-24 bg-zinc-800 rounded"></div>
                <div className="h-32 bg-zinc-800 rounded"></div>
              </div>
            ) : (
              <OverviewTab
                description={server.description || ''}
                readme_overview={server.readme_overview ?? undefined}
                tags={server.tags || []}
                category={server.category ?? undefined}
                platform={server.platform ?? undefined}
                installMethod={server.install_method ?? undefined}
                githubUrl={server.github_url ?? undefined}
                stars={server.stars ?? undefined}
                forks={server.forks ?? undefined}
                openIssues={server.open_issues ?? undefined}
                contributors={server.contributors ?? undefined}
                lastUpdated={server.last_updated ?? undefined}
              />
            )}
          
            {/* Similar Servers Recommendations */}
            <div className="mt-12 pt-8 border-t border-zinc-800">
              <ServerRecommendations
                contextServerId={server.id}
                limit={3}
                excludeIds={[server.id]}
                title="Similar Servers You Might Like"
              />
            </div>
          </TabsContent>
        
          {/* Installation tab with real component instead of placeholder */}
          <TabsContent value="installation" className="space-y-6">
            {isTabDataLoading ? (
              <InstallationSkeletonLoader />
            ) : (
              <InstallationPanel server={server} />
            )}
          </TabsContent>
        
          {/* Tools tab with real component instead of placeholder */}
          <TabsContent value="tools" className="space-y-6">
            {isTabDataLoading ? (
              <ToolsSkeletonLoader />
            ) : (
              <ToolsSection tools={serverTools} />
            )}
          </TabsContent>
        
        <TabsContent value="api" className="space-y-6">
          {/* Placeholder for server component to be injected */}
          <div id="api-tab-content"></div>
        </TabsContent>
        
        <TabsContent value="compatibility" className="space-y-6">
          {/* Placeholder for server component to be injected */}
          <div id="compatibility-tab-content"></div>
        </TabsContent>
        
        <TabsContent value="metrics" className="space-y-6">
          {isMetricsLoading ? (
            <MetricsSkeletonLoader />
          ) : (
            <MetricsTab
              serverId={server.id}
              isLoading={isMetricsLoading}
              metrics={serverMetrics}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
    </DarkThemeLayout>
  );
}
