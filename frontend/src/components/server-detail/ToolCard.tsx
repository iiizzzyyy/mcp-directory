import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Code } from 'lucide-react';
import { Tool, ToolParameter } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ToolCardProps {
  tool: Tool;
}

/**
 * ToolCard component - Smithery-inspired dark-themed expandable tool card
 * Part of the XOM-104 Smithery UI redesign
 */
const ToolCard: React.FC<ToolCardProps> = ({ tool }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Function to get parameter type badge
  const getParameterTypeBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case 'string':
        return <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-800">string</Badge>;
      case 'number':
      case 'integer':
      case 'float':
        return <Badge variant="outline" className="bg-amber-900/20 text-amber-400 border-amber-800">number</Badge>;
      case 'boolean':
        return <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-800">boolean</Badge>;
      case 'array':
        return <Badge variant="outline" className="bg-purple-900/20 text-purple-400 border-purple-800">array</Badge>;
      case 'object':
        return <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-800">object</Badge>;
      default:
        return <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">{type}</Badge>;
    }
  };
  
  // Function to get badge for parameter requirement
  const getRequiredBadge = (isRequired: boolean) => {
    return isRequired ? (
      <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-800">required</Badge>
    ) : (
      <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-700">optional</Badge>
    );
  };
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg mb-4 transition-all duration-200 hover:border-zinc-700">
      {/* Tool header - always visible */}
      <div 
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center">
          <Code className="h-5 w-5 mr-3 text-primary" />
          <h3 className="font-medium text-white">{tool.name}</h3>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </Button>
      </div>
      
      {/* Expanded tool details */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-zinc-800 pt-4">
          {/* Tool description */}
          {tool.description && (
            <p className="text-zinc-400 text-sm mb-4">
              {tool.description}
            </p>
          )}
          
          {/* Tool parameters */}
          {tool.parameters && tool.parameters.length > 0 && (
            <div className="mt-2">
              <h4 className="text-sm font-medium text-zinc-300 mb-2">Parameters</h4>
              <div className="space-y-3">
                {tool.parameters.map((param: ToolParameter, index: number) => (
                  <div key={index} className="bg-zinc-800 rounded-md p-3">
                    <div className="flex flex-wrap gap-2 items-center mb-1">
                      <span className="font-mono text-sm text-white">{param.name}</span>
                      {getParameterTypeBadge(param.type)}
                      {getRequiredBadge(param.required)}
                    </div>
                    {param.description && (
                      <p className="text-xs text-zinc-400 mt-1">
                        {param.description}
                      </p>
                    )}
                    {param.enum && (
                      <div className="mt-2">
                        <span className="text-xs text-zinc-500">Allowed values:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {param.enum.map((value, i) => (
                            <Badge 
                              key={i}
                              variant="outline" 
                              className="bg-zinc-700 text-zinc-300 border-zinc-600 text-xs"
                            >
                              {String(value)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Example usage */}
          {tool.example && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-zinc-300 mb-2">Example</h4>
              <pre className="bg-zinc-800 p-3 rounded-md text-zinc-300 text-xs font-mono overflow-x-auto whitespace-pre">
                {tool.example}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolCard;
