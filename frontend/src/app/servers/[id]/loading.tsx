import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading component for the server detail page
 * Displayed while the page is loading or during navigation
 */
export default function ServerDetailLoading() {
  return (
    <div className="space-y-8 pb-10">
      {/* Header loading skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-[250px]" /> {/* Server name */}
        <Skeleton className="h-4 w-full max-w-[750px]" /> {/* Description */}
      </div>
      
      {/* Server metadata loading skeleton */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-8 w-24" /> {/* Status badge */}
        <Skeleton className="h-8 w-32" /> {/* Category */}
        <Skeleton className="h-8 w-20" /> {/* Stars */}
      </div>
      
      {/* Tabs loading skeleton */}
      <div className="border-b">
        <div className="flex space-x-6">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      {/* Tab content loading skeleton */}
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}
