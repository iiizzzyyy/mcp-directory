import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading component for the servers list page
 * Displayed while the page is loading or during navigation
 */
export default function ServersListLoading() {
  return (
    <div className="py-10">
      {/* Header loading skeleton */}
      <header className="mb-8">
        <Skeleton className="h-10 w-[200px] mb-3" /> {/* Title */}
        <Skeleton className="h-5 w-full max-w-[600px]" /> {/* Description */}
      </header>
      
      {/* Servers grid loading skeleton */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card shadow-sm">
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-6 w-3/4" /> {/* Server name */}
                <Skeleton className="h-4 w-1/3" /> {/* Category */}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" /> {/* Description line 1 */}
                <Skeleton className="h-4 w-full" /> {/* Description line 2 */}
                <Skeleton className="h-4 w-2/3" /> {/* Description line 3 */}
              </div>
              <div className="flex justify-between pt-2">
                <Skeleton className="h-5 w-20" /> {/* Stats */}
                <Skeleton className="h-5 w-20" /> {/* Status */}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination skeleton */}
      <div className="mt-8 flex justify-center">
        <Skeleton className="h-10 w-64" />
      </div>
    </div>
  );
}
