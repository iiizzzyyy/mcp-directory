"use client";

import { useState, useEffect } from 'react';
import CompatibilityMatrix from './CompatibilityMatrix';
import { CompatibilityItem } from './CompatibilityMatrix';

interface CompatibilityMatrixWrapperProps {
  serverId: string;
}

export default function CompatibilityMatrixWrapper({ serverId }: CompatibilityMatrixWrapperProps) {
  const [compatibilityData, setCompatibilityData] = useState<CompatibilityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // In a real implementation, this would fetch compatibility data for the server
    // For now, we'll use mock data
    const mockCompatibilityData: CompatibilityItem[] = [
      { platform: 'Windows', status: 'compatible', version: '10+' },
      { platform: 'macOS', status: 'compatible', version: '12+' },
      { platform: 'Linux', status: 'compatible', version: 'Ubuntu 20.04+' },
      { platform: 'Docker', status: 'compatible' },
      { platform: 'Node.js', status: 'partial', notes: 'Requires v18+' },
      { platform: 'Python', status: 'compatible', version: '3.8+' },
    ];
    
    setCompatibilityData(mockCompatibilityData);
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

  return <CompatibilityMatrix compatibility={compatibilityData} />;
}
