"use client";

import { useState, useEffect } from 'react';
import ChangelogSection from './ChangelogSection';
import { ChangelogEntry } from './ChangelogSection';

interface ChangelogSectionWrapperProps {
  serverId: string;
}

export default function ChangelogSectionWrapper({ serverId }: ChangelogSectionWrapperProps) {
  const [changelogData, setChangelogData] = useState<ChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // In a real implementation, this would fetch changelog data for the server
    // For now, we'll use mock data
    const mockChangelogData: ChangelogEntry[] = [
      {
        version: '1.2.0',
        date: '2025-05-15',
        changes: [
          'Added support for TypeScript SDK',
          'Improved error handling',
          'Fixed cache invalidation issues'
        ]
      },
      {
        version: '1.1.0',
        date: '2025-04-01',
        changes: [
          'Added Python SDK support',
          'Performance improvements',
          'Bug fixes for authentication'
        ]
      },
      {
        version: '1.0.0',
        date: '2025-03-10',
        changes: [
          'Initial release',
          'Basic API functionality',
          'JavaScript SDK'
        ]
      }
    ];
    
    setChangelogData(mockChangelogData);
    setIsLoading(false);
  }, [serverId]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-20 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  return <ChangelogSection changelog={changelogData} />;
}
