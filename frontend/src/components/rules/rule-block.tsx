"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface RuleBlockProps {
  /**
   * Rule title displayed prominently
   */
  title: string;
  
  /**
   * Detailed description of the rule
   */
  description: string;
  
  /**
   * Optional icon component to display
   */
  icon?: React.ReactNode;
  
  /**
   * Pastel color theme for the border
   * Use 'random' to assign a color based on the rule title
   */
  color?: 'blue' | 'green' | 'purple' | 'pink' | 'amber' | 'indigo' | 'red' | 'teal' | 'orange' | 'random';
  
  /**
   * Optional CSS classname
   */
  className?: string;
  
  /**
   * Optional border width
   */
  borderWidth?: 'thin' | 'medium' | 'thick';
  
  /**
   * Optional border style - solid or dashed
   */
  borderStyle?: 'solid' | 'dashed';
  
  /**
   * Optional onClick handler
   */
  onClick?: () => void;
}

/**
 * RuleBlock component displays a rule with title and description in a boxed UI element
 * with configurable pastel border
 */
export function RuleBlock({
  title,
  description,
  icon,
  color = 'random',
  className,
  borderWidth = 'medium',
  borderStyle = 'solid',
  onClick
}: RuleBlockProps) {
  // Define pastel colors for border
  const pastelColors = {
    blue: 'border-blue-200',
    green: 'border-green-200',
    purple: 'border-purple-200',
    pink: 'border-pink-200',
    amber: 'border-amber-200',
    indigo: 'border-indigo-200',
    red: 'border-red-200',
    teal: 'border-teal-200',
    orange: 'border-orange-200'
  };
  
  const pastelBackgrounds = {
    blue: 'bg-blue-50/50',
    green: 'bg-green-50/50',
    purple: 'bg-purple-50/50',
    pink: 'bg-pink-50/50',
    amber: 'bg-amber-50/50',
    indigo: 'bg-indigo-50/50',
    red: 'bg-red-50/50',
    teal: 'bg-teal-50/50',
    orange: 'bg-orange-50/50'
  };
  
  // For dark mode
  const darkPastelBackgrounds = {
    blue: 'dark:bg-blue-950/20',
    green: 'dark:bg-green-950/20',
    purple: 'dark:bg-purple-950/20',
    pink: 'dark:bg-pink-950/20',
    amber: 'dark:bg-amber-950/20',
    indigo: 'dark:bg-indigo-950/20',
    red: 'dark:bg-red-950/20',
    teal: 'dark:bg-teal-950/20',
    orange: 'dark:bg-orange-950/20'
  };
  
  // Map border width
  const borderWidths = {
    thin: 'border',
    medium: 'border-2',
    thick: 'border-4'
  };
  
  // Map border style
  const borderStyles = {
    solid: 'border-solid',
    dashed: 'border-dashed'
  };
  
  // Get a deterministic color based on the rule title if 'random' is specified
  const getColorFromTitle = (title: string): keyof typeof pastelColors => {
    const colors = Object.keys(pastelColors) as Array<keyof typeof pastelColors>;
    const index = title
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    
    return colors[index];
  };
  
  // Determine final color
  const finalColor = color === 'random' ? getColorFromTitle(title) : color;
  
  // Assemble class names
  const blockClassNames = cn(
    'rounded-lg p-6 transition-shadow hover:shadow-md',
    borderWidths[borderWidth],
    borderStyles[borderStyle],
    pastelColors[finalColor],
    pastelBackgrounds[finalColor],
    darkPastelBackgrounds[finalColor],
    onClick && 'cursor-pointer',
    className
  );
  
  return (
    <div 
      className={blockClassNames}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start gap-4">
        {icon && (
          <div className="mt-1 text-gray-500">{icon}</div>
        )}
        
        <div className="space-y-2">
          <h3 className="font-medium text-lg">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default RuleBlock;
