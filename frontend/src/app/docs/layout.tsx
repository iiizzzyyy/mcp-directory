"use client";

import React from 'react';
import Link from 'next/link';
import { SidebarNav } from '@/components/docs/sidebar-nav';
import { docsConfig } from '@/config/docs';
import { cn } from '@/lib/utils';
import { ChevronLeft, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

/**
 * Layout component for the documentation section
 * Includes sidebar navigation and mobile-responsive layout
 */
export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative container mx-auto px-4 md:px-8 py-8 flex-1">
      <div className="flex-1 md:grid md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr] xl:grid-cols-[280px_1fr] gap-10">
        {/* Mobile sidebar trigger */}
        <div className="sticky top-4 z-30 flex items-center md:hidden mb-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="mr-2 px-2 py-1.5">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px] pr-0">
              <div className="px-2 py-6">
                <Link href="/" className="flex items-center space-x-2 mb-8">
                  <span className="font-bold">MCP Directory</span>
                </Link>
                <SidebarNav 
                  docsConfig={docsConfig}
                  items={docsConfig.sidebarNav} 
                  className="h-[calc(100vh-8rem)]" 
                />
              </div>
            </SheetContent>
          </Sheet>
          <Link 
            href="/" 
            className="flex items-center space-x-2 hover:opacity-80"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="font-medium">Back</span>
          </Link>
        </div>
        
        {/* Desktop sidebar (hidden on mobile) */}
        <div className="hidden md:flex flex-col">
          <div className="sticky top-16 -mt-10 pt-10">
            <div className="hidden md:flex mb-8">
              <Link 
                href="/" 
                className="flex items-center space-x-2 hover:opacity-80"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="font-medium">Back to Home</span>
              </Link>
            </div>
            <SidebarNav 
              docsConfig={docsConfig}
              items={docsConfig.sidebarNav} 
              className="pb-12" 
            />
          </div>
        </div>
        
        {/* Main content */}
        <main className="relative py-6 md:py-0 lg:gap-10 lg:py-8">
          <div className="max-w-3xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
