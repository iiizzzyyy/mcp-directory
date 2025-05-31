import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { CheckIcon, XIcon, MinusIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export type CompatibilityStatus = 'compatible' | 'incompatible' | 'partial' | 'unknown';

export interface CompatibilityItem {
  platform: string;
  status: CompatibilityStatus;
  notes?: string;
  version?: string;
}

interface CompatibilityMatrixProps {
  compatibility: CompatibilityItem[];
}

/**
 * CompatibilityMatrix - Displays platform compatibility information
 * 
 * Shows which platforms are compatible with the MCP server
 * with visual indicators and optional notes
 */
export const CompatibilityMatrix: React.FC<CompatibilityMatrixProps> = ({ compatibility }) => {
  // If no compatibility data, show empty state
  if (!compatibility || compatibility.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compatibility</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No compatibility information available for this server.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderStatusIcon = (status: CompatibilityStatus) => {
    switch (status) {
      case 'compatible':
        return <CheckIcon className="h-5 w-5 text-green-500" />;
      case 'incompatible':
        return <XIcon className="h-5 w-5 text-red-500" />;
      case 'partial':
        return <CheckIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <MinusIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: CompatibilityStatus): string => {
    switch (status) {
      case 'compatible':
        return 'Compatible';
      case 'incompatible':
        return 'Incompatible';
      case 'partial':
        return 'Partially Compatible';
      default:
        return 'Unknown Compatibility';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Compatibility</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium">Platform</th>
                <th className="text-center py-2 px-2 font-medium">Status</th>
                <th className="text-left py-2 px-2 font-medium">Version</th>
              </tr>
            </thead>
            <tbody>
              {compatibility.map((item, index) => (
                <tr key={index} className={index < compatibility.length - 1 ? "border-b" : ""}>
                  <td className="py-3 px-2">{item.platform}</td>
                  <td className="py-3 px-2 text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="inline-flex justify-center">
                            {renderStatusIcon(item.status)}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{getStatusLabel(item.status)}</p>
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </td>
                  <td className="py-3 px-2 text-sm">
                    {item.version || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompatibilityMatrix;
