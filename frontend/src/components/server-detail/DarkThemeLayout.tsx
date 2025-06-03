import React, { useEffect } from 'react';
import '@/styles/smithery-dark-theme.css';

interface DarkThemeLayoutProps {
  children: React.ReactNode;
}

/**
 * DarkThemeLayout component - Provides the dark theme background for Smithery-inspired design
 * Part of the XOM-104 Smithery UI redesign
 */
const DarkThemeLayout: React.FC<DarkThemeLayoutProps> = ({ children }) => {
  // Add class to body to ensure dark theme is applied site-wide
  useEffect(() => {
    // Save previous body classes to restore later
    const originalBodyClasses = document.body.className;
    
    // Add dark theme class to body
    document.body.classList.add('dark-theme', 'custom-scrollbar', 'bg-zinc-950');
    
    // Cleanup function to restore original body classes when component unmounts
    return () => {
      document.body.className = originalBodyClasses;
    };
  }, []);
  
  // Add listener for responsive adjustments
  useEffect(() => {
    const handleResize = () => {
      // Add any responsive adjustments needed here
      const isMobile = window.innerWidth < 640;
      if (isMobile) {
        document.body.classList.add('is-mobile');
      } else {
        document.body.classList.remove('is-mobile');
      }
    };
    
    // Initial call
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl sm:px-6 lg:px-8 transition-all duration-200">
        {children}
      </div>
    </div>
  );
};

export default DarkThemeLayout;
