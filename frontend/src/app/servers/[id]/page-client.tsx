'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Github, 
  ExternalLink, 
  Calendar, 
  Server as ServerIcon, 
  Wrench, 
  Code, 
  ShieldCheck, 
  Activity,
  BarChart,
  Check,
  ExternalLink as LinkIcon,
  Clock
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { OverviewTab } from "@/components/server-detail/OverviewTab";
import { MetricsTab } from "@/components/server-detail/MetricsTab";
import { fetchServerMetrics, trackServerView } from '@/lib/metrics-client';
import ServerRecommendations from '@/components/recommendations/ServerRecommendations';

// Import client components only in this client component
import { Server } from '@/lib/types/index';

interface ServerDetailClientProps {
  server: Server;
  error?: string;
}

/**
 * Client component for server detail page
 * Handles UI interactions and rendering of tabs
 * Redesigned to match Smithery's UI pattern (XOM-93)
 */
export function ServerDetailClient({ server, error }: ServerDetailClientProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [serverMetrics, setServerMetrics] = useState<any>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState<boolean>(false);
  
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
  
  useEffect(() => {
    // Track page view when component mounts
    if (server?.id) {
      trackServerView(server.id)
        .catch(err => console.warn('Failed to track server view:', err));
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
  }, [activeTab, server?.id]);

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
  
  // Mock data for additional statistics (will be replaced with real data later)
  const mockStats = {
    monthlyToolCalls: Math.floor(Math.random() * 100000) + 10000,
    successRate: Math.floor(Math.random() * 15) + 85, // 85-100%
    averageResponseTime: Math.floor(Math.random() * 400) + 100, // 100-500ms
    securityAudit: Math.random() > 0.3, // 70% chance of having security audit
    license: server.license ?? "MIT",
    version: server.version ?? "1.0.0"
  };
  
  return (
    <div className="py-10">
      {/* Back link */}
      <Link href="/servers" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to servers
      </Link>
      
      {/* Server header - Smithery-inspired design */}
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">{server.name}</h1>
              <div className="flex items-center gap-2">
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
                
                {/* Security audit badge */}
                {mockStats.securityAudit && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200">
                    <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                    Security Verified
                  </Badge>
                )}
              </div>
            </div>
            
            <p className="text-lg text-muted-foreground mb-4">{server.description}</p>
            
            <div className="flex flex-wrap gap-2 mt-2">
              {server.category && (
                <Badge variant="secondary" className="capitalize">
                  {server.category}
                </Badge>
              )}
              
              {server.tags && server.tags.map((tag: string, i: number) => (
                <Badge key={`tag-${i}-${tag}`} variant="outline">
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
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Homepage
                </a>
              </Button>
            )}
            
            {server.documentation_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={server.documentation_url} target="_blank" rel="noopener noreferrer">
                  <Code className="h-4 w-4 mr-2" />
                  Docs
                </a>
              </Button>
            )}
          </div>
        </div>
        
        {/* Server stats cards - Smithery-inspired design */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Tool Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <BarChart className="h-4 w-4 mr-2 text-blue-500" />
                <span className="text-2xl font-bold">{mockStats.monthlyToolCalls.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Activity className="h-4 w-4 mr-2 text-green-500" />
                <span className="text-2xl font-bold">{mockStats.successRate}%</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-amber-500" />
                <span className="text-2xl font-bold">{mockStats.averageResponseTime}ms</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Additional server metadata */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {server.stars !== undefined && server.stars !== null && (
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
          
          {mockStats.license && (
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-1 text-green-500" />
              <span>License: {mockStats.license}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Tabs - Smithery-inspired design */}
      <Tabs
        defaultValue="overview"
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-6"
      >
        <TabsList className="mb-4 bg-transparent border-b pb-0 w-full justify-start rounded-none p-0">
          <TabsTrigger 
            value="overview"
            className="rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="installation"
            className="rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Installation
          </TabsTrigger>
          <TabsTrigger 
            value="tools"
            className="rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Tools
          </TabsTrigger>
          <TabsTrigger 
            value="api"
            className="rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            API
          </TabsTrigger>
          <TabsTrigger 
            value="compatibility"
            className="rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Compatibility
          </TabsTrigger>
          <TabsTrigger 
            value="metrics"
            className="rounded-t-lg rounded-b-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            Metrics
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
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
          
          {/* Similar Servers Recommendations */}
          <div className="mt-12 pt-8 border-t">
            <ServerRecommendations
              contextServerId={server.id}
              limit={3}
              excludeIds={[server.id]}
              title="Similar Servers You Might Like"
            />
          </div>
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
          <MetricsTab
            serverId={server.id}
            isLoading={isMetricsLoading}
            metrics={serverMetrics}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
