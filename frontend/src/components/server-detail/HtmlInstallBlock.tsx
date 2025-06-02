"use client";

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface HtmlInstallBlockProps {
  platform: string;
  icon?: string;
  htmlContent: string;
  className?: string;
}

/**
 * Component for rendering HTML installation instructions with safety features
 * Used for rich content directly from the database
 */
export default function HtmlInstallBlock({
  platform,
  icon,
  htmlContent,
  className,
}: HtmlInstallBlockProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      // Strip HTML tags for clipboard content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = htmlContent;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      await navigator.clipboard.writeText(textContent);
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
        <div className="bg-white p-4 rounded-b-md overflow-x-auto text-sm">
          {/* Use dangerouslySetInnerHTML to render HTML content - we're assuming this content is from a trusted source */}
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }} 
          />
        </div>
      </div>
      
      {copied && (
        <div className="text-xs text-green-500 px-4 py-2 flex items-center bg-gray-50 border-t">
          <Check className="h-3 w-3 mr-1" /> Copied to clipboard
        </div>
      )}
    </div>
  );
}
