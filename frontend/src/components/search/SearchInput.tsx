"use client";

import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * SearchInput component with search icon
 * 
 * @param placeholder - Placeholder text for the search input
 * @param value - Current search value
 * @param onChange - Function called when search value changes
 * @param className - Additional CSS classes
 */
export function SearchInput({
  placeholder = 'Search servers...',
  value,
  onChange,
  className,
}: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 w-full"
      />
    </div>
  );
}

export default SearchInput;
