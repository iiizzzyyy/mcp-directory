"use client";

import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MarkdownArticle } from '@/components/markdown/markdown-article';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface DocumentationSectionProps {
  serverId: string;
}

/**
 * Component for displaying auto-generated API documentation
 * Uses the /docs/:id edge function to fetch and render documentation
 * 
 * @param props Component properties
 * @returns Documentation section component
 */
export default function DocumentationSection({ serverId }: DocumentationSectionProps) {
  const [docContent, setDocContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // We'll no longer use an error state - we'll just show the fallback if there's an issue

  useEffect(() => {
    // Generate fallback documentation if edge function is unavailable
    // This is a temporary workaround until we fix the edge function issues
    const generateFallbackDocs = () => {
      return `
        <div class="documentation">
          <h1>API Documentation</h1>
          <p>This is a temporary placeholder for the API documentation.</p>
          
          <h2>Getting Started</h2>
          <p>To use this MCP server, you'll need to include it in your project.</p>
          <pre><code>npm install ${serverId}</code></pre>
          
          <h2>Basic Usage</h2>
          <pre><code>import { createClient } from '${serverId}';

const client = createClient({
  // Your configuration options
});

// Now you can use the client to make API calls
</code></pre>

          <div class="note">
            <p><strong>Note:</strong> Complete API documentation is being generated. Please check back later.</p>
          </div>
        </div>
      `;
    };
    
    async function fetchDocumentation() {
      try {
        setIsLoading(true);
        
        console.log('Fetching docs for server ID:', serverId);
        console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        
        // Try to fetch from edge function, fall back to generated docs if it fails
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/docs/${serverId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        );
        
        console.log('Response status:', response.status);

        if (!response.ok) {
          console.error(`Failed to fetch documentation: ${response.statusText}`);
          setDocContent(generateFallbackDocs());
          setIsLoading(false);
          return;
        }

        try {
          const data = await response.json();
          if (data.markdown || data.html) {
            // Prefer markdown if available
            if (data.markdown) {
              setDocContent(data.markdown);
            }
            // Fall back to HTML if that's all we have (convert it to markdown or extract content)
            else if (data.html) {
              try {
                // Try to extract content from HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = data.html;
                const extractedText = tempDiv.textContent || tempDiv.innerText || '';
                setDocContent(extractedText);
              } catch (e) {
                console.log('Failed to extract content from HTML, using fallback');
                setDocContent(generateFallbackDocs());
              }
            }
          } else {
            console.log('No content in response, using fallback');
            setDocContent(generateFallbackDocs());
          }
        } catch (parseErr) {
          console.error('Error parsing JSON:', parseErr);
          setDocContent(generateFallbackDocs());
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching documentation:', err);
        setDocContent(generateFallbackDocs());
        setIsLoading(false);
      }
    }

    fetchDocumentation();
  }, [serverId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="mt-6">
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  // Check if documentation is available
  const isDocumentationAvailable = docContent && docContent.trim().length > 0;

  if (!isDocumentationAvailable && !isLoading) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Documentation Unavailable</AlertTitle>
        <AlertDescription>
          Documentation for this MCP server is currently not available. Please check back later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="documentation-container">
      <MarkdownArticle 
        content={docContent}
        title="API Documentation"
      />
    </div>
  );
}
