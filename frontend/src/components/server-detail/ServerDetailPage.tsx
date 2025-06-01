"use client";

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, GitBranch, Star, Clock, Activity } from 'lucide-react';
import HealthChartWrapper from './HealthChartWrapper';
import CompatibilityMatrixWrapper from './CompatibilityMatrixWrapper';
import ChangelogSectionWrapper from './ChangelogSectionWrapper';
import StaticDocumentationSectionWrapper from './StaticDocumentationSectionWrapper';
import InstallationTab from './InstallationTab';
import ToolsTab from './ToolsTab';
import { Server } from '@/types/server';
import { Badge } from '@/components/ui/badge';

interface ServerDetailPageProps {
  serverId: string;
}

export default function ServerDetailPage({ serverId }: ServerDetailPageProps) {
  const [server, setServer] = useState<Server | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchServerDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/servers/${serverId}`);
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setServer(data.server);
      } catch (err) {
        console.error('Failed to fetch server details:', err);
        setError('Unable to load server details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (serverId) {
      fetchServerDetails();
    }
  }, [serverId]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!server) {
    return (
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Server Not Found</AlertTitle>
        <AlertDescription>The requested server could not be found.</AlertDescription>
      </Alert>
    );
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'offline':
        return 'bg-red-500';
      case 'degraded':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Server Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {server.name}
            <Badge className={getStatusBadgeClass(server.status || 'unknown')}>
              {server.status || 'unknown'}
            </Badge>
          </h1>
          <p className="text-muted-foreground">{server.description}</p>
        </div>
        
        {/* GitHub Stats */}
        <div className="flex gap-4 text-sm">
          {server.github_stars && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              <span>{server.github_stars}</span>
            </div>
          )}
          {server.github_forks && (
            <div className="flex items-center gap-1">
              <GitBranch className="h-4 w-4" />
              <span>{server.github_forks}</span>
            </div>
          )}
          {server.last_updated && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Updated {new Date(server.last_updated).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="installation">Installation</TabsTrigger>
          <TabsTrigger value="docs">API Docs</TabsTrigger>
          <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Server Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2">
                    <div>
                      <dt className="font-medium">Name</dt>
                      <dd>{server.name}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Category</dt>
                      <dd>{server.category}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">Version</dt>
                      <dd>{server.version || 'Not specified'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">GitHub</dt>
                      <dd>
                        {server.github_url ? (
                          <a 
                            href={server.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {server.github_url.replace('https://github.com/', '')}
                          </a>
                        ) : (
                          'Not specified'
                        )}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>

              <CompatibilityMatrixWrapper serverId={serverId} />
            </div>

            <div className="space-y-6">
              <HealthChartWrapper serverId={serverId} />
              <StaticDocumentationSectionWrapper serverId={serverId} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="installation" className="pt-4">
          <InstallationTab serverId={serverId} server={server} />
        </TabsContent>

        <TabsContent value="docs" className="pt-4">
          <StaticDocumentationSectionWrapper serverId={serverId} fullContent />
        </TabsContent>

        <TabsContent value="compatibility" className="pt-4">
          <CompatibilityMatrixWrapper serverId={serverId} />
        </TabsContent>

        <TabsContent value="health" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Health Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <HealthChartWrapper serverId={serverId} daysToShow={30} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changelog" className="pt-4">
          <ChangelogSectionWrapper serverId={serverId} />
        </TabsContent>

        <TabsContent value="tools" className="pt-4">
          <ToolsTab server={server} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
