"use client";

import React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import FilterDropdown from './FilterDropdown';

export interface TagOption {
  value: string;
  label: string;
  count?: number;
}

interface TagFilterProps {
  tags: TagOption[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
}

/**
 * TagFilter component with dropdown and selected tags display
 * 
 * @param tags - Available tag options
 * @param selectedTags - Currently selected tags
 * @param onChange - Function called when selected tags change
 */
export function TagFilter({ tags, selectedTags, onChange }: TagFilterProps) {
  const removeTag = (tag: string) => {
    onChange(selectedTags.filter(t => t !== tag));
  };

  const getTagLabel = (value: string): string => {
    const tag = tags.find(t => t.value === value);
    return tag ? tag.label : value;
  };

  return (
    <div className="space-y-2">
      <FilterDropdown 
        label="Tags"
        options={tags}
        selectedValues={selectedTags}
        onChange={onChange}
      />
      
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedTags.map(tag => (
            <Badge 
              key={tag} 
              variant="secondary"
              className="flex items-center gap-1 pl-2 pr-1 py-1"
            >
              {getTagLabel(tag)}
              <button
                onClick={() => removeTag(tag)}
                className="h-4 w-4 rounded-full hover:bg-muted-foreground/20 inline-flex items-center justify-center"
                aria-label={`Remove ${getTagLabel(tag)} tag`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedTags.length > 1 && (
            <button
              onClick={() => onChange([])}
              className="text-xs text-muted-foreground hover:text-foreground"
              aria-label="Clear all tags"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default TagFilter;
