"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface RulesSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * RulesSection component organizes rule cards into categories
 * 
 * @param title - The section title
 * @param description - Optional section description
 * @param children - Rule card components
 * @param className - Additional CSS classes
 */
export function RulesSection({
  title,
  description,
  children,
  className,
}: RulesSectionProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

export default RulesSection;
