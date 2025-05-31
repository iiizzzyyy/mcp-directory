"use client";

import React, { useEffect } from 'react';
import { MarkdownRenderer } from '@/components/docs/markdown-renderer';
import { cn } from '@/lib/utils';
import { Link2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MarkdownArticleProps {
  content: string;
  title?: string;
  author?: string;
  date?: string;
  className?: string;
}

/**
 * Renders markdown content as a styled article with additional features
 * 
 * @param content - Markdown content to render
 * @param title - Optional article title
 * @param author - Optional article author
 * @param date - Optional publication date
 * @param className - Additional CSS classes
 * @returns React component for styled markdown article
 */
export function MarkdownArticle({
  content,
  title,
  author,
  date,
  className,
}: MarkdownArticleProps) {
  // Add copy buttons to code blocks after render
  useEffect(() => {
    const codeBlocks = document.querySelectorAll('pre');
    
    codeBlocks.forEach((codeBlock) => {
      // Skip if already has a copy button
      if (codeBlock.querySelector('.copy-button')) return;
      
      // Create copy button
      const copyButton = document.createElement('button');
      copyButton.className = 'copy-button absolute top-3 right-3 p-1 rounded-md text-gray-400 hover:bg-gray-700 hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary';
      copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
      
      // Set relative positioning on the code block container if not already set
      if (getComputedStyle(codeBlock).position === 'static') {
        codeBlock.style.position = 'relative';
      }
      
      // Add click handler
      copyButton.addEventListener('click', () => {
        const code = codeBlock.querySelector('code');
        if (!code) return;
        
        navigator.clipboard.writeText(code.textContent || '')
          .then(() => {
            copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;
            setTimeout(() => {
              copyButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
            }, 2000);
          })
          .catch(err => {
            console.error('Failed to copy code', err);
          });
      });
      
      codeBlock.appendChild(copyButton);
    });
    
    // Add anchor links to headings
    const addHeadingAnchors = () => {
      const headings = document.querySelectorAll('h1[id], h2[id], h3[id], h4[id], h5[id], h6[id]');
      
      headings.forEach((heading) => {
        // Skip if already has an anchor
        if (heading.querySelector('.anchor-link')) return;
        
        const id = heading.getAttribute('id');
        if (!id) return;
        
        // Create anchor button
        const anchor = document.createElement('a');
        anchor.className = 'anchor-link ml-2 opacity-0 hover:opacity-100 text-muted-foreground';
        anchor.href = `#${id}`;
        anchor.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-link-2"><path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/></svg>`;
        
        // Add hover effect to parent heading
        heading.classList.add('group');
        heading.appendChild(anchor);
      });
    };
    
    addHeadingAnchors();
    
    // Cleanup function
    return () => {
      const copyButtons = document.querySelectorAll('.copy-button');
      copyButtons.forEach(button => {
        button.remove();
      });
    };
  }, [content]);
  
  return (
    <article className={cn("markdown-article space-y-4", className)}>
      {/* Article header with title and metadata if provided */}
      {(title || author || date) && (
        <header className="mb-8 pb-4 border-b">
          {title && <h1 className="text-3xl font-bold tracking-tight mb-2">{title}</h1>}
          
          {(author || date) && (
            <div className="flex flex-wrap gap-x-4 text-muted-foreground text-sm">
              {author && <div>{author}</div>}
              {date && <time dateTime={date}>{date}</time>}
            </div>
          )}
        </header>
      )}
      
      {/* Markdown content */}
      <MarkdownRenderer content={content} />
      
      <style jsx global>{`
        .markdown-article {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .markdown-article .group .anchor-link {
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .markdown-article .group:hover .anchor-link {
          opacity: 1;
        }
        
        .markdown-article pre {
          position: relative;
        }
      `}</style>
    </article>
  );
}

export default MarkdownArticle;
