"use client";

import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';

interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

interface ChangelogSectionProps {
  changelog: ChangelogEntry[];
}

export const ChangelogSection: React.FC<ChangelogSectionProps> = ({ changelog }) => {
  if (!changelog || changelog.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No changelog available.
      </div>
    );
  }

  return (
    <Accordion type="single" collapsible className="w-full">
      {changelog.map((entry, index) => (
        <AccordionItem key={index} value={`changelog-${index}`}>
          <AccordionTrigger className="flex justify-between">
            <div className="flex justify-between w-full">
              <span className="font-medium">{entry.version}</span>
              <span className="text-sm text-gray-500 mr-4">
                {new Date(entry.date).toLocaleDateString()}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
              {entry.changes.map((change, i) => (
                <li key={i}>{change}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default ChangelogSection;
