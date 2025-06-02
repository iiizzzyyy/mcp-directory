"use client";

import React from 'react';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, Code, Star, GitFork, AlertCircle, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
}

/**
 * Overview tab content for server details
 * Displays general information about the MCP server
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
}: OverviewTabProps) {
  return (
    <div className="space-y-8">
      {/* Description section */}
      <section>
        <h3 className="text-lg font-medium mb-2">Description</h3>
        {readme_overview ? (
          <div 
            className="text-muted-foreground prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: readme_overview }}
          />
        ) : (
          <p className="text-muted-foreground whitespace-pre-line">{description}</p>
        )}
      </section>
      
      <Separator />
      
      {/* Metadata section */}
      <section>
        <h3 className="text-lg font-medium mb-4">Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left column */}
          <div className="space-y-4">
            {category && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
                <p>{category}</p>
              </div>
            )}
            
            {platform && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Platform</h4>
                <p>{platform}</p>
              </div>
            )}
            
            {installMethod && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Installation</h4>
                <div className="bg-muted p-2 rounded-md font-mono text-sm">
                  <code>{installMethod}</code>
                </div>
              </div>
            )}
            
            {tags && tags.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-secondary text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Right column - GitHub stats */}
          {githubUrl && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Repository</h4>
                <a 
                  href={githubUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-primary hover:underline"
                >
                  {githubUrl.replace('https://github.com/', '')}
                  <ExternalLink className="h-3.5 w-3.5 ml-1" />
                </a>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {typeof stars === 'number' && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Stars</h4>
                    <p className="flex items-center">
                      <Star className="h-4 w-4 mr-1 text-yellow-500" />
                      {stars.toLocaleString()}
                    </p>
                  </div>
                )}
                
                {typeof forks === 'number' && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Forks</h4>
                    <p className="flex items-center">
                      <GitFork className="h-4 w-4 mr-1" />
                      {forks.toLocaleString()}
                    </p>
                  </div>
                )}
                
                {typeof openIssues === 'number' && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Open Issues</h4>
                    <p className="flex items-center">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      {openIssues.toLocaleString()}
                    </p>
                  </div>
                )}
                
                {typeof contributors === 'number' && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Contributors</h4>
                    <p>{contributors.toLocaleString()}</p>
                  </div>
                )}
              </div>
              
              {lastUpdated && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Last Updated</h4>
                  <p className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default OverviewTab;
