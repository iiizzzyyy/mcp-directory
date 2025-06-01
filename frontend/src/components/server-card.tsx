'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Server, HealthStatus } from '@/lib/types/index';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { GitHubLogoIcon, StarFilledIcon, ActivityLogIcon } from '@radix-ui/react-icons';

interface ServerCardProps {
  server: Server;
}

export function ServerCard({ server }: ServerCardProps) {
  // Format health status for display
  const getHealthStatus = () => {
    switch (server.health_status) {
      case 'online':
        return { label: 'Online', class: 'bg-green-600 hover:bg-green-700' };
      case 'offline':
        return { label: 'Offline', class: 'bg-red-600 hover:bg-red-700' };
      case 'degraded':
        return { label: 'Degraded', class: 'bg-yellow-600 hover:bg-yellow-700' };
      default:
        return { label: 'Unknown', class: 'bg-gray-600 hover:bg-gray-700' };
    }
  };
  
  const healthStatus = getHealthStatus();
  
  return (
    <Card className="h-full flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <Link 
              href={`/servers/${server.slug || server.id}`} 
              className="text-xl font-semibold hover:underline line-clamp-1"
            >
              {server.name}
            </Link>
            
            {server.category && (
              <p className="text-sm text-muted-foreground mt-1">{server.category}</p>
            )}
          </div>
          
          {server.health_status && (
            <Badge variant="secondary" className={`ml-2 ${healthStatus.class}`}>
              {healthStatus.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow pb-2">
        {server.description && (
          <p className="text-muted-foreground line-clamp-3">{server.description}</p>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-wrap gap-2 pt-1 pb-4">
        {server.tags && server.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {server.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="mr-1">
                {tag}
              </Badge>
            ))}
            {server.tags.length > 3 && (
              <Badge variant="outline" className="mr-1">
                +{server.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-4 ml-auto">
          {server.github_url && (
            <Link 
              href={server.github_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              <GitHubLogoIcon className="mr-1 h-4 w-4" />
              {server.stars && (
                <span className="flex items-center">
                  <StarFilledIcon className="ml-1 mr-0.5 h-3 w-3" />
                  {server.stars.toLocaleString()}
                </span>
              )}
            </Link>
          )}
          
          {server.last_checked && (
            <span className="flex items-center text-xs text-muted-foreground">
              <ActivityLogIcon className="mr-1 h-3 w-3" />
              {new Date(server.last_checked).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
