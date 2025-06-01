import { notFound } from "next/navigation";
import { Suspense } from 'react';
import { Metadata, ResolvingMetadata } from 'next';
import { getServerDetail } from '@/lib/data-fetching';
import { Server } from '@/lib/types/index';
import { ServerDetailClient } from './page-client';
import ServerDetailLoading from './loading';

// Import server components
import ServerInstall from "@/components/server-detail/ServerInstall";
import ServerTools from "@/components/server-detail/ServerTools";
import ServerChangelog from "@/components/server-detail/ServerChangelog";
import ServerCompatibility from "@/components/server-detail/ServerCompatibility";
import ServerHealth from "@/components/server-detail/ServerHealth";
import ApiTab from "@/components/server-detail/ApiTab";

// Fallback data for error states
import { mockServers } from "@/lib/mock-data";

// Force dynamic rendering for all server detail pages
export const dynamic = "force-dynamic";
export const revalidate = 0; // No cache, always fetch fresh data

/**
 * Generate metadata for server detail page
 */
export async function generateMetadata({ 
  params 
}: { 
  params: { id: string } 
}): Promise<Metadata> {
  try {
    const server = await getServerDetail(params.id);
    
    if (!server) {
      return {
        title: 'Server Not Found',
        description: 'The requested MCP server could not be found.'
      };
    }
    
    return {
      title: `${server.name} | MCP Directory`,
      description: server.description || 'View details about this MCP server',
      openGraph: {
        title: server.name,
        description: server.description || 'MCP Server Details',
        type: 'website'
      }
    };
  } catch (error) {
    return {
      title: 'Error | MCP Directory',
      description: 'Error loading server details'
    };
  }
}

/**
 * Server Component: Server Detail Page
 * 
 * This is a React Server Component that fetches server data
 * and renders both client and server components.
 */
export default async function ServerDetailPage({ params }: { params: { id: string } }) {
  try {
    // Extract the server ID from the URL params
    const { id } = params;
    
    if (!id) {
      return notFound();
    }
    
    // Fetch server details from Supabase
    const server = await getServerDetail(id);
    
    // If no server was found, show 404
    if (!server) {
      return notFound();
    }
    
    return (
      <div>
        {/* Client component for UI interactions */}
        <ServerDetailClient server={server} />
        
        {/* Server components for tab content with their own data fetching */}
        <div id="installation-tab-content" style={{ display: 'contents' }}>
          <ServerInstall 
            serverId={server.id} 
            serverName={server.name} 
            defaultInstallCommand={server.install_command || ''} 
          />
        </div>
        
        <div id="tools-tab-content" style={{ display: 'contents' }}>
          <ServerTools 
            serverId={server.id} 
            serverName={server.name} 
          />
        </div>
        
        <div id="api-tab-content" style={{ display: 'contents' }}>
          <ApiTab 
            serverId={server.id} 
          />
        </div>
        
        <div id="compatibility-tab-content" style={{ display: 'contents' }}>
          <ServerCompatibility 
            serverId={server.id} 
          />
        </div>
        
        <div id="metrics-tab-content" style={{ display: 'contents' }}>
          <ServerHealth 
            serverId={server.id} 
          />
        </div>
      </div>
    );
  } catch (error) {
    // Handle errors gracefully by showing error UI
    console.error("Error in server detail page:", error);
    
    // Get mock data for fallback
    const { mockServers } = await import("@/lib/mock-data");
    
    // Create a properly typed fallback server with correct health_status
    const fallbackServer: Server = {
      id: mockServers[0].id,
      name: mockServers[0].name,
      description: mockServers[0].description,
      category: mockServers[0].category,
      tags: mockServers[0].tags,
      platform: mockServers[0].platform,
      install_method: mockServers[0].install_method,
      stars: mockServers[0].stars,
      health_status: mockServers[0].health_status as 'online' | 'offline' | 'degraded' | 'unknown',
      last_checked: mockServers[0].last_updated,
      github_url: mockServers[0].github_url,
      slug: mockServers[0].name.toLowerCase().replace(/\s+/g, '-')
    };
    
    // Return error state to the UI component
    return (
      <ServerDetailClient 
        server={fallbackServer} 
        error={error instanceof Error ? error.message : "Failed to load server data"}
      />
    );
  }
}
