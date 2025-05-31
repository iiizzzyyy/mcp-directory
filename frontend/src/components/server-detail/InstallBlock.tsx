"use client";

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InstallBlockProps {
  platform: string;
  icon?: string;
  installCommand: string;
  className?: string;
}

export default function InstallBlock({
  platform,
  icon,
  installCommand,
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
    <div className={cn("border rounded-lg p-4 bg-white", className)}>
      <div className="flex items-center mb-3">
        {icon && (
          <img 
            src={icon} 
            alt={`${platform} icon`} 
            className="w-6 h-6 mr-2"
            onError={(e) => {
              // Replace with a default icon if the image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        <h3 className="font-medium">{platform}</h3>
      </div>
      
      <div className="relative group">
        <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-sm font-mono">
          {installCommand}
        </pre>
        
        <button
          onClick={copyToClipboard}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-200 hover:bg-gray-300 transition-colors"
          aria-label="Copy to clipboard"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>
      
      {copied && (
        <div className="text-sm text-green-600 mt-1 flex items-center">
          <Check className="h-3 w-3 mr-1" /> Copied to clipboard
        </div>
      )}
    </div>
  );
}
