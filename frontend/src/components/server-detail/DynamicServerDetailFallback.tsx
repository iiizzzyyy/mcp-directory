'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CompatibilityMatrix from '@/components/server-detail/SimpleCompatibilityMatrix';
import HealthChart from '@/components/server-detail/SimpleHealthChart';
import ChangelogSection from '@/components/server-detail/SimpleChangelogSection';
import StaticDocumentationSection from '@/components/server-detail/StaticDocumentationSection';
import InstallationTab from '@/components/server-detail/InstallationTab';
import { Skeleton } from '@/components/ui/skeleton';

interface ServerData {
  id: string;
  name: string;
  description: string;
  tags: string[];
  category: string;
  platform: string;
  install_method: string;
  github_url: string;
  stars: number;
  forks: number;
  open_issues: number;
  contributors: number;
  last_updated: string | null;
  compatibility: Record<string, boolean>;
  health: {
    status: string;
    uptime: number;
    history: Array<{
      date: string;
      status: string;
    }>;
  };
  changelog: Array<{
    version: string;
    date: string;
    changes: string[];
  }>;
}

// Loading skeleton component
const ServerDetailSkeleton = () => (
  <div className="py-8">
    <div className="mb-6">
      <div className="h-4 w-20 bg-gray-200 rounded mb-4"></div>
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-4 w-full max-w-md mb-3" />
      
      <div className="flex flex-wrap gap-2 mt-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-6 w-16 rounded-full" />
        ))}
      </div>
      
      <div className="flex flex-wrap gap-4 mt-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-6 w-24" />
        ))}
      </div>
    </div>
    
    <div className="mb-6">
      <Skeleton className="h-6 w-40" />
    </div>
    
    <div>
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-10 w-24" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  </div>
);

// Error component
const ServerDetailError = ({ id, error }: { id: string; error: string }) => (
  <div className="py-10 px-4 max-w-3xl mx-auto">
    <h1 className="text-2xl font-bold mb-4">Error Loading Server</h1>
    <p className="mb-6">We couldn't load the server data for "{id}". {error}</p>
    
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
      <h2 className="font-medium mb-2">Technical Details</h2>
      <p className="font-mono text-sm bg-gray-100 p-2 rounded">{error}</p>
    </div>
    
    <Link href="/servers" className="text-blue-600 hover:underline inline-flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Back to Servers List
    </Link>
  </div>
);

export default function DynamicServerDetailFallback({ id }: { id: string }) {
  const [server, setServer] = useState<ServerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServerData = async () => {
      try {
        setLoading(true);
        
        // Use the API endpoint
        const apiUrl = `/api/servers/${id}`;
        console.log(`[Dynamic Fallback] Fetching server details from: ${apiUrl}`);
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const { server: serverData, isMockData } = await response.json();
        
        if (serverData) {
          console.log(`[Dynamic Fallback] Server details fetched successfully${isMockData ? ' (mock data)' : ''}`);
          setServer(serverData);
          setError(null);
        } else {
          throw new Error('No server data found in API response');
        }
      } catch (err) {
        console.error('[Dynamic Fallback] Error fetching server details:', err);
        setError(err instanceof Error ? err.message : 'Unknown error fetching server data');
      } finally {
        setLoading(false);
      }
    };

    fetchServerData();
  }, [id]);

  // Show loading state
  if (loading) {
    return <ServerDetailSkeleton />;
  }

  // Show error state
  if (error || !server) {
    return <ServerDetailError id={id} error={error || 'Server data not found'} />;
  }

  // Render the server detail page with dynamic data
  return (
    <div className="py-8">
      <div className="mb-6">
        <Link href="/servers" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Servers
        </Link>
        <h1 className="text-3xl font-bold mt-2">{server.name}</h1>
        <p className="text-gray-600 mt-1">{server.description}</p>
        
        <div className="flex flex-wrap gap-2 mt-3">
          {server.tags && Array.isArray(server.tags) ? server.tags.map((tag: string) => (
            <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
              {tag}
            </span>
          )) : null}
        </div>
        
        {/* GitHub stats */}
        <div className="flex flex-wrap gap-4 mt-4">
          <a 
            href={server.github_url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center text-gray-700 hover:text-blue-600"
          >
            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            <span>{server.github_url.replace('https://github.com/', '')}</span>
          </a>
          <div className="flex items-center text-gray-700">
            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
            </svg>
            <span>{server.stars}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
            </svg>
            <span>{server.forks}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm4.879-2.773 4.264 2.559a.25.25 0 0 1 0 .428l-4.264 2.559A.25.25 0 0 1 6 10.559V5.442a.25.25 0 0 1 .379-.215Z" />
            </svg>
            <span>Last updated {server.last_updated ? new Date(server.last_updated).toLocaleDateString() : 'Unknown'}</span>
          </div>
        </div>
      </div>
      
      {/* Health Status Indicator */}
      <div className="mb-6 flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${          
          server.health && server.health.status === 'online'
            ? 'bg-green-500' 
            : server.health && server.health.status === 'degraded' 
              ? 'bg-yellow-500' 
              : 'bg-red-500'
        }`} />
        <span className="capitalize">{server.health && server.health.status ? server.health.status : 'unknown'}</span>
        <span className="ml-4 text-gray-600">
          {server.health && server.health.uptime ? `${server.health.uptime}% uptime` : 'No uptime data'}
        </span>
      </div>
      
      {/* Tabbed Interface */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 bg-gray-100">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="docs">API Docs</TabsTrigger>
          <TabsTrigger value="install">Installation</TabsTrigger>
          <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Server Metadata</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Category:</span>
              <span className="font-medium">{server.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Platform:</span>
              <span className="font-medium">{server.platform}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Contributors:</span>
              <span className="font-medium">{server.contributors}</span>
            </div>
            {/* Add more metadata fields here */}
          </div>
        </TabsContent>
        
        {/* API Documentation Tab */}
        <TabsContent value="docs" className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">API Documentation</h2>
          <StaticDocumentationSection serverId={server.id} />
        </TabsContent>
        
        {/* Installation Tab */}
        <TabsContent value="install" className="bg-white shadow rounded-lg p-6">
          <InstallationTab 
            serverId={server.id} 
            defaultInstallCommand={server.install_method} 
          />
        </TabsContent>
        
        {/* Compatibility Tab */}
        <TabsContent value="compatibility" className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Compatibility</h2>
          <CompatibilityMatrix compatibility={server.compatibility} />
        </TabsContent>
        
        {/* Health Tab */}
        <TabsContent value="health" className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Health Status</h2>
          <HealthChart healthData={server.health && server.health.history && Array.isArray(server.health.history) 
            ? server.health.history.map((item: { date: string; status: string }) => ({
                date: item.date,
                status: item.status as 'online' | 'degraded' | 'offline'
              })) 
            : []
          } />
        </TabsContent>
        
        {/* Changelog Tab */}
        <TabsContent value="changelog" className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Changelog</h2>
          <ChangelogSection changelog={server.changelog || []} />
        </TabsContent>
      </Tabs>
      
      {/* Dynamic load indicator */}
      <div className="mt-8 text-xs text-gray-500 border-t pt-4">
        <p>This server page was loaded dynamically</p>
      </div>
    </div>
  );
}
