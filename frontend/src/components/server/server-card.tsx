"use client";

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Github, Star, GitFork, ExternalLink, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ServerCardProps {
  id: string;
  slug?: string;
  name: string;
  description: string;
  tags: string[];
  platform?: string | null;
  stars?: number | null;
  forks?: number | null;
  githubUrl?: string | null;
  healthStatus?: 'online' | 'offline' | 'degraded' | 'unknown';
  className?: string;
}

/**
 * ServerCard component displays MCP server information in a grid card
 * Includes health status, tags, platform, and GitHub stats
 */
export function ServerCard({
  id,
  slug,
  name,
  description,
  tags,
  platform,
  stars,
  forks,
  githubUrl,
  healthStatus = 'unknown',
  className,
}: ServerCardProps) {
  // Get URL for server detail page
  const detailUrl = `/servers/${slug || id}`;

  // Health status icons and styles
  const healthStatusConfig = {
    online: {
      icon: <CheckCircle className="h-4 w-4" />,
      text: 'Online',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
    },
    offline: {
      icon: <AlertCircle className="h-4 w-4" />,
      text: 'Offline',
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
    },
    degraded: {
      icon: <AlertTriangle className="h-4 w-4" />,
      text: 'Degraded',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    },
    unknown: {
      icon: <AlertCircle className="h-4 w-4" />,
      text: 'Unknown',
      color: 'text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-800/30',
    },
  };

  const healthConfig = healthStatusConfig[healthStatus];

  // Pastel border colors
  const pastelBorderClasses = {
    base: 'transition-all duration-200 ease-in-out border-2 border-transparent',
    hover: 'hover:border-2 hover:shadow-md group-hover:shadow-md',
    colors: {
      red: 'hover:border-red-200 group-hover:border-red-200',
      orange: 'hover:border-orange-200 group-hover:border-orange-200',
      amber: 'hover:border-amber-200 group-hover:border-amber-200',
      yellow: 'hover:border-yellow-200 group-hover:border-yellow-200',
      lime: 'hover:border-lime-200 group-hover:border-lime-200',
      green: 'hover:border-green-200 group-hover:border-green-200',
      emerald: 'hover:border-emerald-200 group-hover:border-emerald-200',
      teal: 'hover:border-teal-200 group-hover:border-teal-200',
      cyan: 'hover:border-cyan-200 group-hover:border-cyan-200',
      sky: 'hover:border-sky-200 group-hover:border-sky-200',
      blue: 'hover:border-blue-200 group-hover:border-blue-200',
      indigo: 'hover:border-indigo-200 group-hover:border-indigo-200',
      violet: 'hover:border-violet-200 group-hover:border-violet-200',
      purple: 'hover:border-purple-200 group-hover:border-purple-200',
      fuchsia: 'hover:border-fuchsia-200 group-hover:border-fuchsia-200',
      pink: 'hover:border-pink-200 group-hover:border-pink-200',
      rose: 'hover:border-rose-200 group-hover:border-rose-200',
    }
  };

  // Get a deterministic color based on the server name
  const getBorderColorClass = (name: string) => {
    const colorKeys = Object.keys(pastelBorderClasses.colors);
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colorKeys.length;
    return pastelBorderClasses.colors[colorKeys[index] as keyof typeof pastelBorderClasses.colors];
  };

  const borderColorClass = getBorderColorClass(name);

  return (
    <Link href={detailUrl} className="group">
      <div
        className={cn(
          "h-full rounded-lg bg-card overflow-hidden",
          pastelBorderClasses.base,
          pastelBorderClasses.hover,
          borderColorClass,
          className
        )}
      >
        <div className="p-6 flex flex-col h-full">
          {/* Header with name and health status */}
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold text-lg line-clamp-1">{name}</h3>
            <div 
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                healthConfig.color,
                healthConfig.bgColor
              )}
            >
              {healthConfig.icon}
              <span>{healthConfig.text}</span>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
            {description || "No description available"}
          </p>
          
          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {tags.slice(0, 3).map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="text-xs font-normal"
                >
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge 
                  variant="outline" 
                  className="text-xs font-normal"
                >
                  +{tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
          
          {/* Bottom section with platform and GitHub stats */}
          <div className="mt-auto pt-4 flex items-center justify-between border-t">
            {/* Platform */}
            {platform && (
              <div className="text-xs text-muted-foreground">
                {platform}
              </div>
            )}
            
            {/* GitHub stats */}
            {githubUrl && (
              <div className="flex items-center gap-3">
                {stars !== null && stars !== undefined && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 mr-1 inline" />
                    {stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : stars}
                  </div>
                )}
                
                {forks !== null && forks !== undefined && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <GitFork className="h-3.5 w-3.5 mr-1 inline" />
                    {forks >= 1000 ? `${(forks / 1000).toFixed(1)}k` : forks}
                  </div>
                )}
                
                <a 
                  href={githubUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Github className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default ServerCard;
