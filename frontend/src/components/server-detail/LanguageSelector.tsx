"use client";

import * as React from 'react';
import { Check, ChevronDown, Code, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fuzzySearch } from '@/lib/fuse';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

interface Language {
  id: string;
  name: string;
  icon?: string;
}

interface LanguageSelectorProps {
  languages: Language[];
  selectedLanguage: string;
  onLanguageChange: (languageId: string) => void;
  className?: string;
  persistKey?: string; // Optional key for localStorage persistence
}

/**
 * A dropdown selector for programming languages/platforms
 * 
 * @param languages - Array of language options with id, name, and optional icon
 * @param selectedLanguage - ID of the currently selected language
 * @param onLanguageChange - Callback function when a language is selected
 * @param className - Optional additional CSS classes
 */
export default function LanguageSelector({
  languages,
  selectedLanguage,
  onLanguageChange,
  className,
  persistKey
}: LanguageSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Load saved preference from localStorage if persistKey is provided
  React.useEffect(() => {
    if (persistKey) {
      const savedLanguage = localStorage.getItem(`lang_pref_${persistKey}`);
      if (savedLanguage && languages.some(lang => lang.id === savedLanguage)) {
        onLanguageChange(savedLanguage);
      }
    }
  }, [persistKey, languages, onLanguageChange]);
  
  // Save preference to localStorage when it changes
  React.useEffect(() => {
    if (persistKey && selectedLanguage) {
      localStorage.setItem(`lang_pref_${persistKey}`, selectedLanguage);
    }
  }, [persistKey, selectedLanguage]);

  // Apply fuzzy search to filter languages
  const filteredLanguages = React.useMemo(() => {
    return fuzzySearch(languages, searchQuery, ['name', 'id']);
  }, [languages, searchQuery]);
  
  const selectedLanguageObj = languages.find(lang => lang.id === selectedLanguage);
  
  // Get language icon - either use the provided icon URL or a default icon
  const getLanguageIcon = (language: Language) => {
    if (language.icon) {
      return (
        <img
          src={language.icon}
          alt={`${language.name} icon`}
          className="w-4 h-4"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }
    
    // Return default icon based on language name
    const nameLC = language.name.toLowerCase();
    
    if (nameLC.includes('terminal') || nameLC.includes('shell') || nameLC.includes('bash') || nameLC.includes('cmd')) {
      return <Terminal className="w-4 h-4" />;
    }
    
    // Default code icon
    return <Code className="w-4 h-4" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          <div className="flex items-center gap-2">
            {selectedLanguageObj?.icon && (
              <img 
                src={selectedLanguageObj.icon} 
                alt={`${selectedLanguageObj.name} icon`} 
                className="w-4 h-4" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <span>{selectedLanguageObj?.name || 'Select language'}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[200px]">
        <Command>
          <CommandInput 
            placeholder="Search languages..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            onKeyDown={(e) => {
              // Enhance keyboard navigation
              if (e.key === 'Enter' && filteredLanguages.length > 0) {
                onLanguageChange(filteredLanguages[0].id);
                setOpen(false);
              }
            }}
          />
          <CommandEmpty>No language found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {filteredLanguages.map(language => (
                <CommandItem
                  key={language.id}
                  value={language.id}
                  onSelect={() => {
                    onLanguageChange(language.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  {getLanguageIcon(language)}
                  {language.name}
                  {language.id === selectedLanguage && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
