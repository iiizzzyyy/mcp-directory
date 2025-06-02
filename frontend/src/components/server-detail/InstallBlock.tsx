"use client";

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface InstallBlockProps {
  platform: string;
  icon?: string;
  installCommand: string;
  additionalSteps?: string;
  requirements?: string;
  className?: string;
}

export default function InstallBlock({
  platform,
  icon,
  installCommand,
  additionalSteps,
  requirements,
  className,
}: InstallBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className={cn("border rounded-lg bg-white overflow-hidden", className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center">
          {icon && (
            <img 
              src={icon} 
              alt={`${platform} icon`} 
              className="w-5 h-5 mr-2"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
          <h3 className="font-medium text-sm">{platform}</h3>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={copyToClipboard}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-gray-500" />
          )}
          <span className="sr-only">Copy to clipboard</span>
        </Button>
      </div>
      
      <div className="relative">
        <div className="bg-gray-900 rounded-b-md overflow-hidden">
          <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-300">
            {installCommand}
          </pre>
        </div>
      </div>
      
      {copied && (
        <div className="text-xs text-green-500 px-4 py-2 flex items-center bg-gray-50 border-t">
          <Check className="h-3 w-3 mr-1" /> Copied to clipboard
        </div>
      )}

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
  );
}
