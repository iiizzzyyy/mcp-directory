'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  className?: string;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLastButtons?: boolean;
  siblingsCount?: number;
}

export function Pagination({
  className,
  currentPage,
  totalPages,
  onPageChange,
  showFirstLastButtons = false,
  siblingsCount = 1,
}: PaginationProps) {
  // Don't render pagination if there's only one page
  if (totalPages <= 1) {
    return null;
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    // Create array of all page numbers
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    
    // If total pages is 7 or less, show all pages
    if (totalPages <= 7) {
      return pageNumbers;
    }
    
    // Otherwise, show a subset with ellipses
    const siblingStart = Math.max(currentPage - siblingsCount, 1);
    const siblingEnd = Math.min(currentPage + siblingsCount, totalPages);
    
    // Add first page, siblings, and last page
    const visiblePages = [
      1,
      ...(siblingStart > 2 ? [-1] : []), // Left ellipsis
      ...pageNumbers.slice(siblingStart - 1, siblingEnd),
      ...(siblingEnd < totalPages - 1 ? [-2] : []), // Right ellipsis
      ...(siblingEnd < totalPages ? [totalPages] : []),
    ];
    
    // Return unique pages
    return [...new Set(visiblePages)];
  };
  
  const pageNumbers = getPageNumbers();
  
  return (
    <nav
      className={cn("flex items-center justify-center space-x-1", className)}
      aria-label="Pagination"
    >
      {/* Previous button */}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {/* Page numbers */}
      {pageNumbers.map((page, i) => {
        // Handle ellipsis
        if (page < 0) {
          return (
            <Button
              key={`ellipsis-${i}`}
              variant="ghost"
              size="icon"
              className="h-8 w-8 cursor-default"
              disabled
              aria-hidden="true"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          );
        }
        
        // Regular page button
        return (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(page)}
            aria-label={`Go to page ${page}`}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </Button>
        );
      })}
      
      {/* Next button */}
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Go to next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
