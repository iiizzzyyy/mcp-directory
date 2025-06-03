/**
 * ResponsiveContainer Component
 * A utility component for handling responsive layouts in the Smithery redesign
 * Part of XOM-107: Responsive Design Implementation
 */

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
  mobileStack?: boolean;
  tabletGrid?: boolean;
  desktopFlex?: boolean;
  gap?: number;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  mobileStack = true,
  tabletGrid = false,
  desktopFlex = true,
  gap = 4
}) => {
  // Build responsive classes based on props
  const containerClasses = cn(
    // Base styles
    'transition-all duration-200',
    
    // Mobile styles (default)
    mobileStack ? 'flex flex-col' : '',
    
    // Tablet styles (md: 768px+)
    tabletGrid ? 'md:grid md:grid-cols-2' : 'md:flex md:flex-row',
    
    // Desktop styles (lg: 1024px+)
    desktopFlex ? 'lg:flex lg:flex-row' : '',
    
    // Gap sizes
    `gap-${gap}`,
    
    // Any additional custom classes
    className
  );

  return (
    <div className={containerClasses}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;
