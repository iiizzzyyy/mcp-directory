'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pagination } from '@/components/ui/pagination';

interface ClientPaginationProps {
  totalPages: number;
  currentPage: number;
  totalCount: number;
  pageSize: number;
}

export default function ClientPagination({
  totalPages,
  currentPage,
  totalCount,
  pageSize,
}: ClientPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const handlePageChange = (page: number) => {
    // Create new URLSearchParams object based on current params
    const params = new URLSearchParams(searchParams?.toString() || '');
    
    // Update or add the page parameter
    params.set('page', page.toString());
    
    // Push the new URL
    router.push(`/servers?${params.toString()}`);
    
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Calculate pagination display values
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(startIndex + pageSize - 1, totalCount);
  
  return (
    <div className="mt-8 flex flex-col items-center justify-between gap-4 md:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium">{startIndex}</span> to{' '}
        <span className="font-medium">{endIndex}</span> of{' '}
        <span className="font-medium">{totalCount}</span> servers
      </p>
      
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
