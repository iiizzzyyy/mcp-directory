"use client";

import React, { Suspense } from 'react';
import { MarkdownRenderer } from './markdown-renderer';
import dynamic from 'next/dynamic';

// Import TableOfContents with SSR disabled to prevent window errors
const ClientTableOfContents = dynamic(
  () => import('./client-toc').then(mod => mod.ClientTableOfContents),
  { ssr: false }
);
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { docsConfig } from '@/config/docs';

interface DocPageTemplateProps {
  title: string;
  content: string;
  lastUpdated?: string;
  authors?: string[];
  className?: string;
}

/**
 * Doc page template for consistent layout across all documentation pages
 * Includes title, content, pagination, table of contents, and metadata
 */
export function DocPageTemplate({
  title,
  content,
  lastUpdated,
  authors,
  className,
}: DocPageTemplateProps) {
  // Find previous and next pages for pagination
  const flattenedLinks = docsConfig.sidebarNav.flatMap(section => 
    section.items || []
  );
  
  const currentPageIndex = flattenedLinks.findIndex(
    link => link.href && (link.href === window.location.pathname)
  );
  
  const previousPage = currentPageIndex > 0 
    ? flattenedLinks[currentPageIndex - 1] 
    : null;
    
  const nextPage = currentPageIndex < flattenedLinks.length - 1 
    ? flattenedLinks[currentPageIndex + 1] 
    : null;

  return (
    <div className={cn("relative min-h-screen", className)}>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div>
          <div className="space-y-2">
            <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
              {title}
            </h1>
            
            {/* Metadata */}
            {(lastUpdated || authors) && (
              <div className="text-sm text-muted-foreground border-b pb-2 mb-8">
                {lastUpdated && (
                  <p>Last updated on {lastUpdated}</p>
                )}
                {authors && authors.length > 0 && (
                  <p>By {authors.join(', ')}</p>
                )}
              </div>
            )}
          </div>
          
          {/* Markdown content */}
          <div className="pt-8">
            <MarkdownRenderer content={content} />
          </div>
          
          {/* Pagination */}
          <div className="flex items-center justify-between mt-12 pt-4 border-t">
            {previousPage?.href ? (
              <Link
                href={previousPage.href}
                className="inline-flex items-center gap-2 text-sm font-medium hover:text-foreground text-muted-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{previousPage.title}</span>
              </Link>
            ) : (
              <div />
            )}
            
            {nextPage?.href ? (
              <Link
                href={nextPage.href}
                className="inline-flex items-center gap-2 text-sm font-medium hover:text-foreground text-muted-foreground"
              >
                <span>{nextPage.title}</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        </div>
        
        {/* Table of Contents - only visible on desktop */}
        <div className="hidden lg:block">
          <div className="sticky top-16 pt-10">
            <ClientTableOfContents content={content} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocPageTemplate;
