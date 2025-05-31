import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

// Define interfaces for the changelog data
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

interface ChangelogSectionProps {
  changelog?: ChangelogEntry[] | string;
}

/**
 * ChangelogSection - Displays version history and changes
 * 
 * Renders either a structured changelog from JSON or a raw markdown changelog
 */
export const ChangelogSection: React.FC<ChangelogSectionProps> = ({ changelog }) => {
  // If no changelog provided
  if (!changelog) {
    return null;
  }

  // Parse string changelog if needed
  const parseStringChangelog = (changelogString: string): ChangelogEntry[] => {
    try {
      // Try to parse as JSON first
      return JSON.parse(changelogString);
    } catch (e) {
      // If not JSON, try to parse as markdown with version headers
      const entries: ChangelogEntry[] = [];
      let currentEntry: Partial<ChangelogEntry> = {};
      
      changelogString.split('\n').forEach(line => {
        // Match version headers like "## v1.0.0 (2025-01-01)" or "# Version 1.0.0"
        const versionMatch = line.match(/^#+\s+(?:v|Version\s+)([\d\.]+)(?:\s+\(([\d\-]+)\))?/i);
        
        if (versionMatch) {
          // If we have a current entry with changes, push it to entries array
          if (currentEntry.version && currentEntry.changes?.length) {
            entries.push(currentEntry as ChangelogEntry);
          }
          
          // Start a new entry
          currentEntry = {
            version: versionMatch[1],
            date: versionMatch[2] || '',
            changes: []
          };
        } 
        // If line is a change (bullet point)
        else if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
          const change = line.trim().substring(1).trim();
          if (change && currentEntry.changes) {
            currentEntry.changes.push(change);
          }
        }
      });
      
      // Add the last entry if it has changes
      if (currentEntry.version && currentEntry.changes?.length) {
        entries.push(currentEntry as ChangelogEntry);
      }
      
      return entries;
    }
  };

  // Process changelog based on type
  const processedChangelog: ChangelogEntry[] = typeof changelog === 'string' 
    ? parseStringChangelog(changelog) 
    : changelog;

  // If no valid entries, return null
  if (!processedChangelog || processedChangelog.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Changelog</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {processedChangelog.map((entry, index) => (
            <AccordionItem key={index} value={`version-${index}`}>
              <AccordionTrigger className="text-sm">
                <div className="flex justify-between items-center w-full pr-4">
                  <span>Version {entry.version}</span>
                  {entry.date && <span className="text-xs text-muted-foreground">{entry.date}</span>}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="list-disc pl-5 space-y-1">
                  {entry.changes.map((change, idx) => (
                    <li key={idx} className="text-sm">{change}</li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default ChangelogSection;
