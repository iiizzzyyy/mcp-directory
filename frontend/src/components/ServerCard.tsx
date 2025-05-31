import React from 'react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { StarIcon, GitForkIcon, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for ServerCard props
export type HealthStatus = "online" | "degraded" | "offline" | "maintenance" | "unknown";

export interface ServerCardProps {
  id?: string;
  slug?: string;
  name: string;
  description: string;
  tags: string[];
  healthStatus: HealthStatus;
  stars?: number;
  forks?: number;
  platform?: string;
  installMethod?: string;
  lastChecked?: string;
  githubUrl?: string;
  onClick?: () => void;
  className?: string;
}

// Map health status to emoji and descriptive text
function getHealthIndicator(status: HealthStatus) {
  switch (status) {
    case "online":
      return { emoji: "🟢", label: "Online", ariaLabel: "Status: Online" };
    case "degraded":
      return { emoji: "🟡", label: "Degraded", ariaLabel: "Status: Degraded" };
    case "offline":
      return { emoji: "🔴", label: "Offline", ariaLabel: "Status: Offline" };
    case "maintenance":
      return { emoji: "🔵", label: "Maintenance", ariaLabel: "Status: Under Maintenance" };
    default:
      return { emoji: "⚪", label: "Unknown", ariaLabel: "Status: Unknown" };
  }
}

// Format date for tooltip
function formatDate(dateString?: string) {
  if (!dateString) return "Unknown";
  
  try {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return "Invalid date";
  }
}

// Truncate text with ellipsis if it exceeds maxLength
function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * ServerCard - A component to display MCP server information in a card format
 * 
 * Displays server name, description, health status, tags, and GitHub metadata
 * in a responsive, accessible card layout.
 */
export const ServerCard: React.FC<ServerCardProps> = ({
  id,
  slug,
  name,
  description,
  tags,
  healthStatus,
  stars,
  forks,
  platform,
  installMethod,
  lastChecked,
  githubUrl,
  onClick,
  className,
}) => {
  // Get health indicator info
  const healthIndicator = getHealthIndicator(healthStatus);
  
  // Pastel border colors
  const pastelBorderClasses = {
    base: 'transition-all duration-200 ease-in-out border-2 border-transparent',
    hover: 'hover:border-2 hover:shadow-md',
    colors: {
      red: 'hover:border-red-200',
      orange: 'hover:border-orange-200',
      amber: 'hover:border-amber-200',
      yellow: 'hover:border-yellow-200',
      lime: 'hover:border-lime-200',
      green: 'hover:border-green-200',
      emerald: 'hover:border-emerald-200',
      teal: 'hover:border-teal-200',
      cyan: 'hover:border-cyan-200',
      sky: 'hover:border-sky-200',
      blue: 'hover:border-blue-200',
      indigo: 'hover:border-indigo-200',
      violet: 'hover:border-violet-200',
      purple: 'hover:border-purple-200',
      fuchsia: 'hover:border-fuchsia-200',
      pink: 'hover:border-pink-200',
      rose: 'hover:border-rose-200',
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
    <Card 
      className={cn(
        "cursor-pointer h-full flex flex-col",
        pastelBorderClasses.base,
        pastelBorderClasses.hover,
        borderColorClass,
        className
      )}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <h3 className="text-lg font-bold line-clamp-1">{name}</h3>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span 
                  className="text-xl" 
                  aria-label={healthIndicator.ariaLabel}
                >
                  {healthIndicator.emoji}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{healthIndicator.label}</p>
                {lastChecked && (
                  <p className="text-xs text-muted-foreground">
                    Last checked: {formatDate(lastChecked)}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      
      <CardContent className="flex flex-col h-full pb-4">
        {/* Description (truncated) */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {description}
        </p>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tags.slice(0, 4).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {tags.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 4} more
            </Badge>
          )}
        </div>
        
        {/* Bottom metadata row */}
        <div className="mt-auto pt-4 flex items-center justify-between text-sm border-t">
          <div className="flex items-center gap-2">
            {platform && (
              <span className="inline-flex items-center text-xs text-muted-foreground">
                {platform}
              </span>
            )}
            {installMethod && (
              <span className="inline-flex items-center text-xs text-muted-foreground">
                <span className="mx-1">•</span> {installMethod}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {typeof stars === 'number' && (
              <div className="flex items-center gap-1">
                <StarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {stars >= 1000 
                    ? `${(stars / 1000).toFixed(1)}k` 
                    : stars}
                </span>
              </div>
            )}
            
            {typeof forks === 'number' && (
              <div className="flex items-center gap-1">
                <GitForkIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {forks >= 1000 
                    ? `${(forks / 1000).toFixed(1)}k` 
                    : forks}
                </span>
              </div>
            )}
            
            {githubUrl && (
              <a 
                href={githubUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
              </a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerCard;
