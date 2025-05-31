"use client";

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  className?: string;
  content?: string;
}

/**
 * Table of contents component that extracts headings from the page
 * and provides anchor links to them
 */
export function TableOfContents({ className }: TableOfContentsProps) {
  const [activeHeading, setActiveHeading] = useState<string>("");
  const [headings, setHeadings] = useState<TocItem[]>([]);

  // Extract headings from the page
  useEffect(() => {
    const headingElements = document.querySelectorAll<HTMLHeadingElement>(
      "h2[id], h3[id], h4[id]"
    );
    
    const items: TocItem[] = Array.from(headingElements)
      .filter((element) => element.id && element.textContent)
      .map((element) => ({
        id: element.id,
        text: element.textContent || "",
        level: Number(element.tagName.substring(1)),
      }));
    
    setHeadings(items);
  }, []);

  // Track active heading on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
          }
        });
      },
      {
        rootMargin: "0px 0px -80% 0px",
        threshold: 1.0,
      }
    );

    const headingElements = document.querySelectorAll<HTMLHeadingElement>(
      "h2[id], h3[id], h4[id]"
    );
    
    headingElements.forEach((element) => {
      observer.observe(element);
    });

    return () => {
      headingElements.forEach((element) => {
        observer.unobserve(element);
      });
    };
  }, []);

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="font-medium">On This Page</p>
      <div className="flex flex-col space-y-2 text-sm">
        {headings.map((heading, index) => {
          const isActive = activeHeading === heading.id;
          
          return (
            <a
              key={index}
              href={`#${heading.id}`}
              className={cn(
                "line-clamp-2 hover:text-foreground",
                isActive ? "font-medium text-foreground" : "text-muted-foreground",
                heading.level === 3 && "pl-4",
                heading.level === 4 && "pl-8"
              )}
              onClick={(e) => {
                e.preventDefault();
                document.querySelector(`#${heading.id}`)?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
                setActiveHeading(heading.id);
              }}
            >
              {heading.text}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default TableOfContents;
