'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Github, ExternalLink, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

// Import existing components
import CompatibilityMatrix from './SimpleCompatibilityMatrix';
import HealthChart from './SimpleHealthChart';
import ChangelogSection from './SimpleChangelogSection';
import StaticDocumentationSection from './StaticDocumentationSection';
import InstallationTab from './InstallationTab';

// Server interface
export interface Server {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  platform?: string;
  install_method?: string;
  stars?: number;
  health_status?: 'online' | 'offline' | 'degraded' | 'unknown';
  last_checked?: string;
  github_url?: string;
  documentation_url?: string;
  changelog_url?: string;
  homepage_url?: string;
  icon_url?: string;
  slug?: string;
  // Additional fields for detail page
  install_command?: string;
  setup_instructions?: string;
  compatibility?: any[];
  health_history?: any[];
  changelog?: any[];
}

interface ServerDetailContentProps {
  server: Server;
  error?: string;
}

export function ServerDetailContent({ server, error }: ServerDetailContentProps) {
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
          <h1 className="text-3xl font-bold tracking-tight">{server.name}</h1>
          
          {server.description && (
            <p className="text-muted-foreground mt-2 max-w-3xl">{server.description}</p>
          )}
          
          <div className="flex flex-wrap gap-2 mt-4">
            {server.category && (
              <Badge variant="outline" className="capitalize">
                {server.category}
              </Badge>
            )}
            
            {server.platform && (
              <Badge variant="outline" className="capitalize">
                {server.platform}
              </Badge>
            )}
            
            {server.health_status && (
              <Badge 
                className={
                  server.health_status === 'online' ? 'bg-green-500/20 text-green-700 hover:bg-green-500/30' :
                  server.health_status === 'offline' ? 'bg-red-500/20 text-red-700 hover:bg-red-500/30' : 
                  server.health_status === 'degraded' ? 'bg-yellow-500/20 text-yellow-700 hover:bg-yellow-500/30' : 
                  'bg-gray-500/20 text-gray-700 hover:bg-gray-500/30'
                }
              >
                {server.health_status === 'online' ? 'Online' : 
                 server.health_status === 'offline' ? 'Offline' : 
                 server.health_status === 'degraded' ? 'Degraded' : 
                 'Unknown'}
              </Badge>
            )}
            
            {server.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="capitalize">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="flex flex-col gap-2 items-end shrink-0">
          {server.github_url && (
            <Button variant="outline" size="sm" asChild>
              <a 
                href={server.github_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <Github className="h-4 w-4" />
                <span>GitHub</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
          
          {server.homepage_url && (
            <Button variant="outline" size="sm" asChild>
              <a 
                href={server.homepage_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <span>Homepage</span>
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
          
          {server.last_checked && (
            <div className="text-xs text-muted-foreground flex items-center mt-2">
              <Calendar className="h-3 w-3 mr-1" />
              Last updated {formatDistanceToNow(new Date(server.last_checked), { addSuffix: true })}
            </div>
          )}
        </div>
      </div>
      
      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="bg-background w-full justify-start border-b overflow-x-auto flex-nowrap whitespace-nowrap rounded-none p-0">
          <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Overview</TabsTrigger>
          <TabsTrigger value="docs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Documentation</TabsTrigger>
          <TabsTrigger value="install" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Installation</TabsTrigger>
          <TabsTrigger value="compatibility" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Compatibility</TabsTrigger>
          <TabsTrigger value="health" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Health</TabsTrigger>
          <TabsTrigger value="changelog" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">Changelog</TabsTrigger>
        </TabsList>
        
        {/* Overview tab - simple data display */}
        <TabsContent value="overview" className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Server information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Server Information</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                <dt className="text-sm font-medium text-muted-foreground">ID:</dt>
                <dd className="text-sm truncate">{server.id}</dd>
                
                {server.category && (
                  <>
                    <dt className="text-sm font-medium text-muted-foreground">Category:</dt>
                    <dd className="text-sm">{server.category}</dd>
                  </>
                )}
                
                {server.platform && (
                  <>
                    <dt className="text-sm font-medium text-muted-foreground">Platform:</dt>
                    <dd className="text-sm">{server.platform}</dd>
                  </>
                )}
                
                {server.install_method && (
                  <>
                    <dt className="text-sm font-medium text-muted-foreground">Install Method:</dt>
                    <dd className="text-sm">{server.install_method}</dd>
                  </>
                )}
                
                {server.stars !== undefined && (
                  <>
                    <dt className="text-sm font-medium text-muted-foreground">GitHub Stars:</dt>
                    <dd className="text-sm">{server.stars.toLocaleString()}</dd>
                  </>
                )}
              </dl>
            </div>
            
            {/* Server tags */}
            {server.tags && server.tags.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {server.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="capitalize">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Documentation tab */}
        <TabsContent value="docs" className="pt-6">
          <StaticDocumentationSection server={server} />
        </TabsContent>
        
        {/* Installation tab */}
        <TabsContent value="install" className="pt-6">
          <InstallationTab server={server} />
        </TabsContent>
        
        {/* Compatibility tab */}
        <TabsContent value="compatibility" className="pt-6">
          <CompatibilityMatrix server={server} />
        </TabsContent>
        
        {/* Health tab */}
        <TabsContent value="health" className="pt-6">
          <HealthChart server={server} />
        </TabsContent>
        
        {/* Changelog tab */}
        <TabsContent value="changelog" className="pt-6">
          <ChangelogSection server={server} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
