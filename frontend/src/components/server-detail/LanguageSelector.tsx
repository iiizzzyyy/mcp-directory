"use client";

import * as React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  className
}: LanguageSelectorProps) {
  const [open, setOpen] = React.useState(false);

  const selectedLanguageObj = languages.find(lang => lang.id === selectedLanguage);

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
          <CommandInput placeholder="Search languages..." />
          <CommandEmpty>No language found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {languages.map(language => (
                <CommandItem
                  key={language.id}
                  value={language.id}
                  onSelect={() => {
                    onLanguageChange(language.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  {language.icon && (
                    <img 
                      src={language.icon} 
                      alt={`${language.name} icon`} 
                      className="w-4 h-4" 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
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
