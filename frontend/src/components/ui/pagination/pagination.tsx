import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PaginationProps {
  /**
   * Current active page (1-based)
   */
  currentPage: number;
  
  /**
   * Total number of items across all pages
   */
  totalCount: number;
  
  /**
   * Number of items per page
   * @default 20
   */
  pageSize?: number;
  
  /**
   * Function called when page changes
   */
  onPageChange: (page: number) => void;
  
  /**
   * Maximum number of page buttons to show
   * @default 5
   */
  maxPageButtons?: number;
  
  /**
   * CSS classes to apply to the pagination container
   */
  className?: string;
}

/**
 * Pagination component for navigating between pages of content
 * 
 * Features:
 * - Previous/Next buttons
 * - Page number buttons
 * - Ellipsis for skipped pages
 * - Highlights current page
 * - Responsive design
 * - Keyboard navigation
 * - ARIA attributes for accessibility
 */
export function Pagination({
  currentPage,
  totalCount,
  pageSize = 20,
  onPageChange,
  maxPageButtons = 5,
  className,
}: PaginationProps) {
  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  
  // If there's only one page, don't render pagination
  if (totalPages <= 1) {
    return null;
  }
  
  // Handle page navigation
  const handlePageChange = (page: number) => {
    // Only change if it's a valid page
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };
  
  // Generate array of page numbers to display
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    // If there are fewer pages than max buttons, show all
    if (totalPages <= maxPageButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Always include first and last page
    const pages: (number | 'ellipsis')[] = [1];
    
    // Calculate start and end of page range around current page
    let startPage = Math.max(2, currentPage - Math.floor(maxPageButtons / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPageButtons - 3);
    
    // Adjust if range is too small
    if (endPage - startPage < maxPageButtons - 3) {
      startPage = Math.max(2, totalPages - maxPageButtons + 2);
    }
    
    // Add ellipsis before start page if needed
    if (startPage > 2) {
      pages.push('ellipsis');
    }
    
    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    // Add ellipsis after end page if needed
    if (endPage < totalPages - 1) {
      pages.push('ellipsis');
    }
    
    // Add last page if there are more than one page
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  };
  
  const pageNumbers = getPageNumbers();
  
  return (
    <nav 
      role="navigation" 
      aria-label="Pagination Navigation"
      className={cn("flex justify-center items-center space-x-1 mt-6", className)}
    >
      {/* Previous page button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Go to previous page"
        className="h-8 w-8 sm:h-9 sm:w-9"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      {/* Page numbers */}
      <div className="hidden sm:flex items-center space-x-1">
        {pageNumbers.map((page, i) => 
          page === 'ellipsis' ? (
            <span 
              key={`ellipsis-${i}`} 
              className="flex items-center justify-center h-9 w-9"
              aria-hidden="true"
            >
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </span>
          ) : (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="icon"
              onClick={() => handlePageChange(page)}
              aria-label={`Go to page ${page}`}
              aria-current={currentPage === page ? "page" : undefined}
              className="h-9 w-9"
            >
              {page}
            </Button>
          )
        )}
      </div>
      
      {/* Mobile page indicator */}
      <div className="flex sm:hidden items-center">
        <span className="text-sm text-muted-foreground px-2">
          Page {currentPage} of {totalPages}
        </span>
      </div>
      
      {/* Next page button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Go to next page"
        className="h-8 w-8 sm:h-9 sm:w-9"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
