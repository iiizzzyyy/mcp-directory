import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * StatsSkeletonLoader - Skeleton loader for the stats panel
 * Part of the XOM-104 Smithery UI redesign
 */
export const StatsSkeletonLoader: React.FC = () => {
  const statItems = [1, 2, 3, 4, 5, 6]; // Generate 6 skeleton stat items
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
      {statItems.map((item) => (
        <div key={item} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-4 bg-zinc-800" />
            <Skeleton className="h-4 w-24 bg-zinc-800" />
          </div>
          <Skeleton className="h-7 w-16 bg-zinc-800" />
        </div>
      ))}
    </div>
  );
};

/**
 * ServerHeaderSkeleton - Skeleton loader for the server header
 * Part of the XOM-104 Smithery UI redesign
 */
export const ServerHeaderSkeleton: React.FC = () => {
  return (
    <div className="flex items-center gap-4 mb-6">
      <Skeleton className="h-12 w-12 rounded-lg bg-zinc-800" />
      <div className="flex-1">
        <Skeleton className="h-8 w-64 mb-2 bg-zinc-800" />
        <Skeleton className="h-4 w-40 bg-zinc-800" />
      </div>
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-8 rounded-full bg-zinc-800" />
        <Skeleton className="h-8 w-8 rounded-full bg-zinc-800" />
      </div>
    </div>
  );
};

/**
 * TabNavigationSkeleton - Skeleton loader for the tab navigation
 * Part of the XOM-104 Smithery UI redesign
 */
export const TabNavigationSkeleton: React.FC = () => {
  return (
    <div className="border-b border-zinc-800 mb-6">
      <div className="flex overflow-x-auto space-x-8 py-2">
        {[1, 2, 3, 4, 5, 6].map((tab) => (
          <Skeleton key={tab} className="h-6 w-20 bg-zinc-800" />
        ))}
      </div>
    </div>
  );
};

/**
 * ToolsSkeletonLoader - Skeleton loader for the tools section
 * Part of the XOM-104 Smithery UI redesign
 */
export const ToolsSkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-8 w-24 bg-zinc-800" />
        <Skeleton className="h-10 w-48 bg-zinc-800 rounded-md" />
      </div>
      
      {[1, 2, 3, 4].map((item) => (
        <div key={item} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Skeleton className="h-5 w-5 mr-3 bg-zinc-800" />
              <Skeleton className="h-6 w-32 bg-zinc-800" />
            </div>
            <Skeleton className="h-8 w-8 rounded-sm bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * InstallationSkeletonLoader - Skeleton loader for the installation panel
 * Part of the XOM-104 Smithery UI redesign
 */
export const InstallationSkeletonLoader: React.FC = () => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <Skeleton className="h-5 w-5 mr-2 bg-zinc-800" />
        <Skeleton className="h-7 w-24 bg-zinc-800" />
      </div>
      
      <div className="grid grid-cols-3 gap-1 mb-4 bg-zinc-800 h-10 rounded-md p-1">
        {[1, 2, 3].map((tab) => (
          <Skeleton key={tab} className="h-8 rounded-md bg-zinc-750" />
        ))}
      </div>
      
      <Skeleton className="h-4 w-64 mb-4 bg-zinc-800" />
      <Skeleton className="h-10 w-full mb-4 bg-zinc-800 rounded-md" />
      
      <div className="space-y-3 mt-4">
        {[1, 2, 3].map((client) => (
          <div key={client} className="flex items-start bg-zinc-800 rounded-md p-3">
            <Skeleton className="h-8 w-8 rounded-full bg-zinc-700 mr-3" />
            <div className="flex-1">
              <Skeleton className="h-5 w-24 mb-2 bg-zinc-700" />
              <Skeleton className="h-20 w-full bg-zinc-700 rounded-md" />
            </div>
            <Skeleton className="h-8 w-8 ml-2 bg-zinc-700" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * MetricsSkeletonLoader - Skeleton loader for the metrics section
 * Part of the XOM-104 Smithery UI redesign
 */
export const MetricsSkeletonLoader: React.FC = () => {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32 bg-zinc-800" />
      
      <div className="space-y-4">
        <Skeleton className="h-64 w-full rounded-lg bg-zinc-800" />
        <Skeleton className="h-64 w-full rounded-lg bg-zinc-800" />
      </div>
    </div>
  );
};
