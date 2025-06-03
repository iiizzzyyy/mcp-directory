"use client";

import React from 'react';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Code, Star, GitFork, AlertCircle, Calendar, Users, Package, CheckCircle2, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface OverviewTabProps {
  description: string;
  readme_overview?: string;
  tags: string[];
  category?: string;
  platform?: string;
  installMethod?: string;
  githubUrl?: string;
  stars?: number;
  forks?: number;
  openIssues?: number;
  contributors?: number;
  lastUpdated?: string;
  license?: string;
  version?: string;
}

/**
 * Overview tab content for server details
 * Displays general information about the MCP server with a Smithery-inspired design
 */
export function OverviewTab({
  description,
  readme_overview,
  tags,
  category,
  platform,
  installMethod,
  githubUrl,
  stars,
  forks,
  openIssues,
  contributors,
  lastUpdated,
  license,
  version,
}: OverviewTabProps) {
  return (
    <div className="space-y-8">
      {/* Description section */}
      <section>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">About</CardTitle>
          </CardHeader>
          <CardContent>
            {readme_overview ? (
              <div 
                className="text-muted-foreground prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: readme_overview }}
              />
            ) : (
              <p className="text-muted-foreground whitespace-pre-line">{description}</p>
            )}
            
            {tags && tags.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-2">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="px-2 py-1 text-xs font-normal">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      
      {/* Specs section */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left column - Specifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Specifications</CardTitle>
              <CardDescription>
                Technical details about this MCP server
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
              {category && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
                  <p className="flex items-center">
                    <Badge className="mr-2 capitalize">{category}</Badge>
                  </p>
                </div>
              )}
              
              {platform && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Platform</h4>
                  <p className="flex items-center">
                    <Code className="h-4 w-4 mr-2 text-muted-foreground" />
                    {platform}
                  </p>
                </div>
              )}
              
              {version && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Version</h4>
                  <p className="flex items-center">
                    <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                    {version}
                  </p>
                </div>
              )}
              
              {license && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">License</h4>
                  <p className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                    {license}
                  </p>
                </div>
              )}
              
              {lastUpdated && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h4>
                  <p className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Right column - GitHub stats */}
          {githubUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Repository</CardTitle>
                <CardDescription>
                  <a 
                    href={githubUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center text-primary hover:underline"
                  >
                    {githubUrl.replace('https://github.com/', '')}
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {typeof stars === 'number' && (
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Stars</h4>
                      <p className="flex items-center text-lg font-medium">
                        <Star className="h-5 w-5 mr-2 text-yellow-500" />
                        {stars.toLocaleString()}
                      </p>
                    </div>
                  )}
                  
                  {typeof forks === 'number' && (
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Forks</h4>
                      <p className="flex items-center text-lg font-medium">
                        <GitFork className="h-5 w-5 mr-2 text-blue-500" />
                        {forks.toLocaleString()}
                      </p>
                    </div>
                  )}
                  
                  {typeof openIssues === 'number' && (
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Issues</h4>
                      <p className="flex items-center text-lg font-medium">
                        <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
                        {openIssues.toLocaleString()}
                      </p>
                    </div>
                  )}
                  
                  {typeof contributors === 'number' && (
                    <div className="bg-secondary/20 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Contributors</h4>
                      <p className="flex items-center text-lg font-medium">
                        <Users className="h-5 w-5 mr-2 text-green-500" />
                        {contributors.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
                
                {installMethod && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Quick Install</h4>
                    <div className="bg-muted p-2 rounded-md font-mono text-xs overflow-x-auto">
                      <code>{installMethod}</code>
                    </div>
                    <CardFooter className="px-0 pt-3 pb-0">
                      <Button size="sm" variant="secondary" className="w-full">
                        <Code className="h-4 w-4 mr-2" /> View Full Installation
                      </Button>
                    </CardFooter>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}

export default OverviewTab;
