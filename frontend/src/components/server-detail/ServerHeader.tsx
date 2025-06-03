import React from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Copy, 
  Github, 
  ExternalLink,
  Globe,
  Shield,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/components/ui/use-toast';
import { Server } from '@/lib/types';

interface ServerHeaderProps {
  server: Server;
  verificationStatus?: 'verified' | 'unknown' | 'caution';
}

/**
 * ServerHeader component - Smithery-inspired server header with icon, name, verification badge, and URL copy
 * Part of the XOM-104 Smithery UI redesign
 */
const ServerHeader: React.FC<ServerHeaderProps> = ({ 
  server, 
  verificationStatus = 'unknown'
}) => {
  // Function to copy the server URL to clipboard
  const copyServerUrl = () => {
    const serverUrl = `https://mcp.xomatic.ai/servers/${server.slug || server.id}`;
    navigator.clipboard.writeText(serverUrl)
      .then(() => {
        toast({
          title: "URL copied to clipboard",
          description: serverUrl,
          duration: 3000,
        });
      })
      .catch(err => {
        console.error('Failed to copy URL:', err);
        toast({
          title: "Failed to copy URL",
          description: "Please try again",
          variant: "destructive",
          duration: 3000,
        });
      });
  };

  // Determine server icon - use first letter of name if no custom icon
  const getServerIcon = () => {
    if (server.icon_url) {
      return (
        <img 
          src={server.icon_url} 
          alt={`${server.name} icon`} 
          className="w-10 h-10 rounded" 
        />
      );
    }
    
    // Use first letter of server name as fallback
    return (
      <div className="w-10 h-10 bg-primary text-primary-foreground rounded flex items-center justify-center font-bold text-xl">
        {server.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  // Determine verification badge
  const getVerificationBadge = () => {
    switch(verificationStatus) {
      case 'verified':
        return (
          <Badge variant="outline" className="bg-green-900/20 text-green-400 hover:bg-green-900/30 border-green-800">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" />
            Verified
          </Badge>
        );
      case 'caution':
        return (
          <Badge variant="outline" className="bg-amber-900/20 text-amber-400 hover:bg-amber-900/30 border-amber-800">
            <ShieldAlert className="h-3.5 w-3.5 mr-1" />
            Use Caution
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-blue-900/20 text-blue-400 hover:bg-blue-900/30 border-blue-800">
            <Shield className="h-3.5 w-3.5 mr-1" />
            Unverified
          </Badge>
        );
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Back to servers link */}
      <Link href="/servers" className="flex items-center text-sm text-zinc-400 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to servers
      </Link>
      
      {/* Server name and icon */}
      <div className="flex gap-3 items-center">
        {getServerIcon()}
        
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{server.name}</h1>
            {getVerificationBadge()}
          </div>
          
          {server.owner && (
            <div className="text-sm text-zinc-400">
              {server.owner}
            </div>
          )}
        </div>
      </div>
      
      {/* Server URL with copy button */}
      <div className="flex items-center p-2 pl-3 bg-zinc-800 rounded-md text-zinc-300 text-sm">
        <Globe className="h-4 w-4 mr-2 text-zinc-500" />
        <span className="mr-2 font-mono truncate">
          https://mcp.xomatic.ai/servers/{server.slug || server.id}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 ml-auto rounded-full text-zinc-400 hover:bg-zinc-700 hover:text-white"
                onClick={copyServerUrl}
              >
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy URL</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy URL</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* External links */}
      <div className="flex flex-wrap gap-2 mt-1">
        {server.github_url && (
          <Button variant="outline" size="sm" className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white" asChild>
            <a href={server.github_url} target="_blank" rel="noopener noreferrer">
              <Github className="h-4 w-4 mr-2" />
              GitHub
            </a>
          </Button>
        )}
        
        {server.homepage_url && (
          <Button variant="outline" size="sm" className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white" asChild>
            <a href={server.homepage_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Homepage
            </a>
          </Button>
        )}
        
        {server.documentation_url && (
          <Button variant="outline" size="sm" className="bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white" asChild>
            <a href={server.documentation_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Documentation
            </a>
          </Button>
        )}
      </div>
    </div>
  );
};

export default ServerHeader;
