"use client";

import { useState } from 'react';
import { Check, Copy, Terminal, Code, ChevronDown, ChevronUp, CloudCog, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export type InstallFormat = 'auto' | 'npm' | 'pip' | 'curl' | 'docker' | 'go' | 'brew' | 'yarn' | 'pnpm' | 'custom';
export type InstallEnvironment = 'vscode' | 'claude' | 'windows' | 'mac' | 'linux' | 'server' | 'web' | 'custom';

interface InstallBlockProps {
  platform: string;
  icon?: string;
  installCommand: string;
  additionalSteps?: string;
  requirements?: string;
  className?: string;
  format?: InstallFormat;
  environment?: InstallEnvironment;
  isRecommended?: boolean;
  apiKey?: string;
}

export default function InstallBlock({
  platform,
  icon,
  installCommand,
  additionalSteps,
  requirements,
  className,
  format = 'auto',
  environment = 'custom',
  isRecommended = false,
  apiKey,
}: InstallBlockProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Get the appropriate icon based on format
  const getFormatIcon = (format: InstallFormat) => {
    switch (format) {
      case 'npm': return <Code className="h-4 w-4 mr-2" />
      case 'pip': return <Code className="h-4 w-4 mr-2" />
      case 'curl': return <Terminal className="h-4 w-4 mr-2" />
      case 'docker': return <CloudCog className="h-4 w-4 mr-2" />
      default: return <Terminal className="h-4 w-4 mr-2" />
    }
  };

  return (
    <Card className={cn(
      "w-full overflow-hidden transition-all", 
      isRecommended ? "border-primary/50 shadow-md" : "",
      className
    )}>
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {icon ? (
              <img 
                src={icon} 
                alt={`${platform} icon`} 
                className="w-5 h-5 mr-2"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : getFormatIcon(format)}
            
            <CardTitle className="text-base font-medium">
              {platform}
              {isRecommended && (
                <Badge className="ml-2 bg-primary/10 text-primary hover:bg-primary/20 border-none text-xs">
                  Recommended
                </Badge>
              )}
            </CardTitle>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 rounded-full"
              onClick={copyToClipboard}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-gray-500" />
              )}
              <span className="sr-only">Copy to clipboard</span>
            </Button>
            
            {(additionalSteps || requirements) && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 rounded-full"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                )}
                <span className="sr-only">Toggle details</span>
              </Button>
            )}
          </div>
        </div>
        
        {environment !== 'custom' && (
          <CardDescription className="text-xs mt-1 flex items-center">
            <span className="capitalize">{environment}</span> environment
          </CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="px-0 pb-0">
        <div className="bg-slate-950 text-slate-50 overflow-hidden font-mono text-sm">
          <div className="bg-slate-800/50 px-4 py-1.5 text-xs text-slate-400 border-b border-slate-800/70 flex items-center">
            <span className="flex-1">Command</span>
            {format !== 'custom' && (
              <Badge variant="outline" className="text-xs bg-transparent border-slate-700 text-slate-400">
                {format.toUpperCase()}
              </Badge>
            )}
          </div>
          <pre className="p-4 overflow-x-auto">
            {installCommand}
          </pre>
          
          {apiKey && (
            <div className="bg-amber-950/30 px-4 py-2 text-xs text-amber-200 flex items-center border-t border-amber-900/50">
              <span className="font-semibold mr-1">Note:</span> Requires API key
            </div>
          )}
        </div>
        
        {copied && (
          <div className="text-xs text-green-500 px-4 py-2 flex items-center border-t">
            <Check className="h-3 w-3 mr-1" /> Copied to clipboard
          </div>
        )}

        {/* Expanded content */}
        {expanded && (
          <div className="mt-2 text-sm">
            {/* Display additional steps if available */}
            {additionalSteps && (
              <div className="px-4 py-3 border-t">
                <h4 className="text-sm font-semibold mb-2">Additional Steps:</h4>
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                  {additionalSteps.split('\n').map((step, i) => (
                    <p key={i} className="mb-1">{step}</p>
                  ))}
                </div>
              </div>
            )}
            
            {/* Display requirements if available */}
            {requirements && (
              <div className="px-4 py-3 border-t">
                <h4 className="text-sm font-semibold mb-1">Requirements:</h4>
                <div className="text-sm text-gray-600 italic">
                  {requirements}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
