'use client';

import Link from 'next/link';
import { Server } from '@/lib/types/index';
import { ServerCard } from '@/components/server-card';
import { Skeleton } from '@/components/ui/skeleton';
import ClientPagination from './pagination-client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { PaginationMeta } from '@/lib/data-fetching';

interface ServersPageContentProps {
  servers: Server[];
  pagination: PaginationMeta;
  error?: string;
}

export default function ServersPageContent({
  servers,
  pagination,
  error
}: ServersPageContentProps) {
  return (
    <div className="py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">MCP Servers</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Browse and discover Model Context Protocol servers for your AI applications
        </p>
      </header>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => (
          <ServerCard key={server.id} server={server} />
        ))}
        
        {servers.length === 0 && !error && (
          <div className="col-span-full py-8 text-center">
            <h3 className="text-lg font-medium">No servers found</h3>
            <p className="mt-1 text-muted-foreground">
              Try adjusting your search criteria or check back later
            </p>
          </div>
        )}
      </div>
      
      {servers.length > 0 && pagination.totalCount > 0 && (
        <div className="mt-8">
          <ClientPagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalCount={pagination.totalCount}
            pageSize={pagination.pageSize}
          />
        </div>
      )}
    </div>
  );
}
