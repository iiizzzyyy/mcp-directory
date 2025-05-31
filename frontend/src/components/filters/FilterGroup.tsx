"use client";

import React from 'react';
import FilterDropdown from './FilterDropdown';
import TagFilter, { TagOption } from './TagFilter';

interface FilterGroupProps {
  tags: TagOption[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  
  categories: { value: string; label: string; count?: number }[];
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  
  platforms: { value: string; label: string; count?: number }[];
  selectedPlatforms: string[];
  onPlatformsChange: (platforms: string[]) => void;
}

/**
 * FilterGroup component that groups all filters together
 */
export function FilterGroup({
  tags,
  selectedTags,
  onTagsChange,
  categories,
  selectedCategories,
  onCategoriesChange,
  platforms,
  selectedPlatforms,
  onPlatformsChange,
}: FilterGroupProps) {
  return (
    <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:space-x-4 md:space-x-6">
      <div className="w-full sm:w-auto">
        <TagFilter 
          tags={tags} 
          selectedTags={selectedTags} 
          onChange={onTagsChange} 
        />
      </div>
      
      <div className="w-full sm:w-auto">
        <FilterDropdown 
          label="Category"
          options={categories}
          selectedValues={selectedCategories}
          onChange={onCategoriesChange}
        />
      </div>
      
      <div className="w-full sm:w-auto">
        <FilterDropdown 
          label="Platform"
          options={platforms}
          selectedValues={selectedPlatforms}
          onChange={onPlatformsChange}
        />
      </div>
    </div>
  );
}

export default FilterGroup;
