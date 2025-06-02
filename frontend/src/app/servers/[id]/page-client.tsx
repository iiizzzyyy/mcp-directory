'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Github, ExternalLink, Calendar, Server as ServerIcon, Wrench, Code } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { OverviewTab } from "@/components/server-detail/OverviewTab";

// Import client components only in this client component
import { Server } from '@/lib/types/index';

interface ServerDetailClientProps {
  server: Server;
  error?: string;
}

/**
 * Client component for server detail page
 * Handles UI interactions and rendering of tabs
 */
export function ServerDetailClient({ server, error }: ServerDetailClientProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  if (error) {
    return (
      <div className="py-10">
        <Link href="/servers" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to servers
        </Link>
        
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Server</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" asChild>
            <Link href="/servers">Browse All Servers</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  if (!server) {
    return (
      <div className="py-10">
        <Link href="/servers" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to servers
        </Link>
        
        <div className="rounded-lg border p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Server Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested server could not be found.</p>
          <Button variant="outline" asChild>
            <Link href="/servers">Browse All Servers</Link>
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="py-10">
      {/* Back link */}
      <Link href="/servers" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to servers
      </Link>
      
      {/* Server header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{server.name}</h1>
            {server.health_status && (
              <Badge 
                variant={
                  server.health_status === 'online' ? 'default' : 
                  server.health_status === 'degraded' ? 'secondary' : 
                  server.health_status === 'offline' ? 'destructive' : 'outline'
                }
                className="ml-2"
              >
                {server.health_status}
              </Badge>
            )}
          </div>
          
          <p className="text-lg text-muted-foreground mb-4">{server.description}</p>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {server.category && (
              <Badge variant="secondary" className="capitalize">
                {server.category}
              </Badge>
            )}
            
            {server.tags && server.tags.map((tag: string) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
          {server.github_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={server.github_url} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4 mr-2" />
                GitHub
              </a>
            </Button>
          )}
          
          {server.homepage_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={server.homepage_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Homepage
              </a>
            </Button>
          )}
          
          {server.documentation_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={server.documentation_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Docs
              </a>
            </Button>
          )}
        </div>
      </div>
      
      {/* Additional server metadata */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 mb-6 text-sm text-muted-foreground">
        {server.stars !== undefined && (
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 mr-1 text-yellow-400"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>{server.stars.toLocaleString()} stars</span>
          </div>
        )}
        
        {server.last_checked && (
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-1" />
            <span>Updated {formatDistanceToNow(new Date(server.last_checked), { addSuffix: true })}</span>
          </div>
        )}
        
        {server.platform && (
          <div className="flex items-center">
            <ServerIcon className="h-4 w-4 mr-1" />
            <span>Platform: {server.platform}</span>
          </div>
        )}
        
        {server.install_method && (
          <div className="flex items-center">
            <Wrench className="h-4 w-4 mr-1" />
            <span>Install: {server.install_method}</span>
          </div>
        )}
      </div>
      
      {/* Tabs */}
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-6"
      >
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="installation">Installation</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <OverviewTab
            description={server.description}
            readme_overview={server.readme_overview}
            tags={server.tags || []}
            category={server.category}
            platform={server.platform}
            installMethod={server.install_method}
            githubUrl={server.github_url}
            stars={server.stars}
            forks={server.forks}
            openIssues={server.open_issues}
            contributors={server.contributors}
            lastUpdated={server.last_updated}
          />
        </TabsContent>
        
        {/* Other tab contents are rendered by server components */}
        <TabsContent value="installation" className="space-y-6">
          {/* Placeholder for server component to be injected */}
          <div id="installation-tab-content"></div>
        </TabsContent>
        
        <TabsContent value="tools" className="space-y-6">
          {/* Placeholder for server component to be injected */}
          <div id="tools-tab-content"></div>
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
          {/* Placeholder for server component to be injected */}
          <div id="metrics-tab-content"></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
