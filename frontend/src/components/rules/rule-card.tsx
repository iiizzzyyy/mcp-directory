"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface RuleCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * RuleCard component displays a single rule in a boxed layout
 * 
 * @param title - The rule title
 * @param description - The rule description
 * @param icon - Optional icon to display
 * @param className - Additional CSS classes
 */
export function RuleCard({ 
  title, 
  description, 
  icon, 
  className 
}: RuleCardProps) {
  return (
    <div className={cn(
      "rounded-lg border bg-card p-6 transition-all hover:shadow-md",
      className
    )}>
      <div className="flex items-start gap-4">
        {icon && (
          <div className="mt-0.5 text-muted-foreground">
            {icon}
          </div>
        )}
        
        <div className="space-y-2">
          <h3 className="font-semibold leading-tight text-lg">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default RuleCard;
