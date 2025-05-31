'use client';

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Star, GitFork, AlertTriangle, Info, CheckCircle, User } from 'lucide-react';

interface ServerCardProps {
  name: string;
  description: string;
  tags: string[];
  healthStatus?: 'online' | 'offline' | 'degraded' | 'unknown';
  platform?: string;
  installMethod?: string;
  stars?: number;
  lastChecked?: string;
  onClick?: () => void;
}

export function ServerCard({
  name,
  description,
  tags,
  platform,
  stars,
  healthStatus = 'online',
  installMethod,
  lastChecked,
  onClick
}: ServerCardProps) {
  // Map health status to UI elements
  const healthStatusMap: Record<string, { color: string, icon: any, text: string }> = {
    online: { color: 'bg-green-500', icon: CheckCircle, text: 'Online' },
    offline: { color: 'bg-red-500', icon: AlertTriangle, text: 'Offline' },
    degraded: { color: 'bg-yellow-500', icon: Info, text: 'Degraded' },
    unknown: { color: 'bg-gray-400', icon: Info, text: 'Unknown' }
  };

  const { color, icon: StatusIcon, text } = healthStatusMap[healthStatus] || healthStatusMap.unknown;

  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <div className="p-6">
        {/* Health status indicator */}
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold hover:text-blue-600 transition-colors">
            {name}
          </h3>
          <div className="flex items-center">
            <span className={`${color} rounded-full w-2 h-2 mr-1`}></span>
            <span className="text-xs text-gray-600">{text}</span>
          </div>
        </div>
        
        {/* Description */}
        <p className="text-gray-600 mb-4 line-clamp-2">{description}</p>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {platform && (
            <Badge variant="outline" className="text-xs">
              {platform}
            </Badge>
          )}
        </div>
        
        {/* GitHub stats */}
        <div className="flex items-center text-sm text-gray-500 mt-2 space-x-4">
          {stars !== undefined && (
            <div className="flex items-center">
              <Star className="h-4 w-4 mr-1" />
              <span>{stars}</span>
            </div>
          )}
          {installMethod && (
            <div className="flex items-center">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">{installMethod}</span>
            </div>
          )}
          {lastChecked && (
            <div className="flex items-center text-xs text-gray-400">
              <span>Last checked: {new Date(lastChecked).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="border-t px-6 py-3 bg-gray-50 flex justify-between items-center">
        <span className="text-sm text-blue-600 hover:underline cursor-pointer">
          View Details
        </span>
        <span className="text-sm text-blue-600 hover:underline cursor-pointer">
          Install
        </span>
      </div>
    </div>
  );
}
