import React, { useState } from 'react';
import { Search, Wrench } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tool } from '@/lib/types';
import ToolCard from './ToolCard';

interface ToolsSectionProps {
  tools: Tool[];
}

/**
 * ToolsSection component - Smithery-inspired tools section with search and expandable cards
 * Part of the XOM-104 Smithery UI redesign
 */
const ToolsSection: React.FC<ToolsSectionProps> = ({ tools }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter tools based on search query
  const filteredTools = tools.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tool.description && tool.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center">
          <Wrench className="h-5 w-5 mr-2 text-primary" />
          Tools
        </h2>
        
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search tools..."
            className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      {filteredTools.length > 0 ? (
        <div className="space-y-4">
          {filteredTools.map((tool, index) => (
            <ToolCard key={`${tool.name}-${index}`} tool={tool} />
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center">
          <Wrench className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
          <h3 className="text-zinc-400 mb-1">No tools found</h3>
          <p className="text-zinc-500 text-sm">
            {searchQuery 
              ? "Try a different search term" 
              : "This server doesn't have any documented tools"}
          </p>
        </div>
      )}
    </div>
  );
};

export default ToolsSection;
