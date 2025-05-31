"use client";

import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Types for compatibility data
interface CompatibilityItem {
  name: string;
  version: string;
  status: 'compatible' | 'incompatible' | 'partial' | 'unknown';
  notes?: string;
}

interface CompatibilityData {
  frameworks: CompatibilityItem[];
  platforms: CompatibilityItem[];
  tools: CompatibilityItem[];
}

interface CompatibilityTabProps {
  compatibilityData?: CompatibilityData;
  isLoading?: boolean;
}

/**
 * CompatibilityTab component displays compatibility information for the MCP server
 * with different frameworks, platforms, and tools
 */
export function CompatibilityTab({ 
  compatibilityData,
  isLoading = false 
}: CompatibilityTabProps) {
  // If no data and not loading, show empty state
  if (!compatibilityData && !isLoading) {
    return (
      <div className="py-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
          <Info className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-2">No compatibility data available</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Compatibility information for this MCP server has not been added yet.
        </p>
      </div>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">Loading compatibility data...</p>
      </div>
    );
  }
  
  // Default to empty arrays if data is missing
  const { 
    frameworks = [], 
    platforms = [], 
    tools = [] 
  } = compatibilityData || {};
  
  return (
    <div className="space-y-8">
      {/* Frameworks section */}
      <section>
        <h3 className="text-lg font-medium mb-4">Frameworks</h3>
        {frameworks.length > 0 ? (
          <div className="space-y-4">
            {frameworks.map((item, index) => (
              <CompatibilityRow key={index} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No framework compatibility information available.</p>
        )}
      </section>
      
      <Separator />
      
      {/* Platforms section */}
      <section>
        <h3 className="text-lg font-medium mb-4">Platforms</h3>
        {platforms.length > 0 ? (
          <div className="space-y-4">
            {platforms.map((item, index) => (
              <CompatibilityRow key={index} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No platform compatibility information available.</p>
        )}
      </section>
      
      <Separator />
      
      {/* Tools section */}
      <section>
        <h3 className="text-lg font-medium mb-4">Tools</h3>
        {tools.length > 0 ? (
          <div className="space-y-4">
            {tools.map((item, index) => (
              <CompatibilityRow key={index} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No tool compatibility information available.</p>
        )}
      </section>
    </div>
  );
}

// Helper component for rendering a compatibility item row
function CompatibilityRow({ item }: { item: CompatibilityItem }) {
  // Status icon and color based on compatibility
  const statusInfo = {
    compatible: { 
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      label: 'Compatible',
      className: 'bg-green-50 text-green-700 border-green-200'
    },
    incompatible: { 
      icon: <AlertCircle className="h-5 w-5 text-red-500" />,
      label: 'Incompatible',
      className: 'bg-red-50 text-red-700 border-red-200'
    },
    partial: { 
      icon: <Info className="h-5 w-5 text-yellow-500" />,
      label: 'Partial',
      className: 'bg-yellow-50 text-yellow-700 border-yellow-200'
    },
    unknown: { 
      icon: <Info className="h-5 w-5 text-gray-500" />,
      label: 'Unknown',
      className: 'bg-gray-50 text-gray-700 border-gray-200'
    }
  };
  
  const { icon, label, className } = statusInfo[item.status];
  
  return (
    <div className="border rounded-md p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-medium">{item.name}</h4>
          <p className="text-sm text-muted-foreground">Version: {item.version}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center ${className}`}>
          {icon}
          <span className="ml-1">{label}</span>
        </div>
      </div>
      {item.notes && (
        <p className="text-sm mt-2 text-muted-foreground">{item.notes}</p>
      )}
    </div>
  );
}

export default CompatibilityTab;
