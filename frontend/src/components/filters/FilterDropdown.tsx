"use client";

import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  maxHeight?: number;
}

/**
 * Dropdown filter component for selecting multiple options
 * 
 * @param label - The label for the filter dropdown
 * @param options - Available filter options
 * @param selectedValues - Currently selected values
 * @param onChange - Function called when selected values change
 * @param maxHeight - Maximum height of the dropdown content (scrolls if exceeded)
 */
export function FilterDropdown({
  label,
  options,
  selectedValues,
  onChange,
  maxHeight = 300,
}: FilterDropdownProps) {
  // Toggle a single value in the selected values array
  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter(v => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  // Clear all selected values
  const clearAll = () => {
    onChange([]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="h-9 border-dashed justify-between"
        >
          <div className="flex items-center">
            <span>{label}</span>
            {selectedValues.length > 0 && (
              <span className="ml-2 rounded-full bg-primary/20 px-1.5 text-xs font-medium">
                {selectedValues.length}
              </span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-52" 
        align="start"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{label}</span>
          {selectedValues.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-auto p-0 text-xs text-muted-foreground"
              onClick={clearAll}
            >
              Clear ({selectedValues.length})
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div 
          className="overflow-y-auto" 
          style={{ maxHeight: `${maxHeight}px` }}
        >
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedValues.includes(option.value)}
              onCheckedChange={() => toggleValue(option.value)}
              className="flex items-center justify-between"
            >
              <span>{option.label}</span>
              {option.count !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {option.count}
                </span>
              )}
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default FilterDropdown;
