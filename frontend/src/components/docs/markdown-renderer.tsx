"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders markdown content with syntax highlighting and anchored headings
 * 
 * @param content - Markdown content to render
 * @param className - Additional CSS classes
 * @returns Rendered markdown component
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-slate max-w-none dark:prose-invert", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
          rehypeHighlight,
        ]}
      components={{
        h1: ({ node, ...props }) => (
          <h1 
            {...props} 
            id={props.id}
            className="scroll-m-20 text-3xl font-bold tracking-tight lg:text-4xl mb-4 mt-2"
          />
        ),
        h2: ({ node, ...props }) => (
          <h2 
            {...props} 
            id={props.id}
            className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight first:mt-0 mt-10 mb-4"
          />
        ),
        h3: ({ node, ...props }) => (
          <h3 
            {...props} 
            id={props.id}
            className="scroll-m-20 text-xl font-semibold tracking-tight mt-8 mb-4"
          />
        ),
        h4: ({ node, ...props }) => (
          <h4 
            {...props} 
            id={props.id}
            className="scroll-m-20 text-lg font-semibold tracking-tight mt-8 mb-4"
          />
        ),
        a: ({ node, ...props }) => {
          const href = props.href || '';
          const isInternalLink = href.startsWith('/') || href.startsWith('#');
          
          if (isInternalLink) {
            return (
              <Link 
                href={href} 
                className="font-medium text-primary underline underline-offset-4"
                {...props}
              />
            );
          }
          
          return (
            <a 
              className="font-medium text-primary underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          );
        },
        code: ({ node, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          if (match) {
            return (
              <pre className="p-4 rounded-lg my-6 overflow-x-auto bg-muted">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            );
          }
          
          return (
            <code 
              className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm" 
              {...props}
            >
              {children}
            </code>
          );
        },
        ul: ({ node, ...props }) => (
          <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props} />
        ),
        blockquote: ({ node, ...props }) => (
          <blockquote 
            className="mt-6 border-l-2 pl-6 italic text-muted-foreground" 
            {...props} 
          />
        ),
        table: ({ node, ...props }) => (
          <div className="my-6 w-full overflow-y-auto">
            <table className="w-full" {...props} />
          </div>
        ),
        tr: ({ node, ...props }) => (
          <tr className="m-0 border-t p-0 even:bg-muted" {...props} />
        ),
        th: ({ node, ...props }) => (
          <th
            className="border px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right"
            {...props}
          />
        ),
        td: ({ node, ...props }) => (
          <td
            className="border px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right"
            {...props}
          />
        ),
        img: ({ node, ...props }) => (
          <img className="rounded-md border" {...props} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  );
}

export default MarkdownRenderer;
