"use client";

import React from 'react';
import Link from 'next/link';
import NavMenu from '@/components/navigation/NavMenu';
import MobileNav from '@/components/navigation/MobileNav';
import UserMenu from '@/components/navigation/UserMenu';
import { cn } from '@/lib/utils';

interface LayoutShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * LayoutShell component wraps all pages with a consistent layout
 * Includes NavMenu, MobileNav, and main content area with max-width
 */
export function LayoutShell({ children, className }: LayoutShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header with navigation */}
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
          {/* Left section: Logo and site title */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 mr-6">
              <div className="h-8 w-8 bg-pastel-blue rounded-md flex items-center justify-center">
                <span className="font-bold text-lg text-foreground">M</span>
              </div>
              <span className="font-semibold text-xl hidden sm:inline-block">
                MCP Directory
              </span>
            </Link>
            
            {/* Desktop navigation */}
            <NavMenu />
          </div>

          {/* Right section: User menu (or sign in buttons) */}
          <div className="flex items-center space-x-4">
            <UserMenu />
            
            {/* Mobile navigation hamburger */}
            <div className="md:hidden">
              <MobileNav />
            </div>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main className="flex-1">
        <div className={cn(
          "container mx-auto px-4 md:px-8 py-6 md:py-10 bg-white",
          "max-w-7xl", // Maximum width
          className
        )}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4 md:h-16">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} MCP Directory. All rights reserved.
          </p>
          <div className="flex items-center space-x-4">
            <Link 
              href="/about" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </Link>
            <Link 
              href="/privacy" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link 
              href="https://github.com/yourusername/mcp-directory" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LayoutShell;
