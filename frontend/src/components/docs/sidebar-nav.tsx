"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface NavItem {
  title: string;
  href?: string;
  items?: NavItem[];
}

interface DocsConfig {
  sidebarNav: NavItem[];
}

interface SidebarNavProps {
  items: NavItem[];
  docsConfig: DocsConfig;
  className?: string;
}

/**
 * Sidebar navigation component for documentation pages
 */
export function SidebarNav({ items, docsConfig, className }: SidebarNavProps) {
  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Documentation
          </h2>
          <div className="space-y-1">
            <DocsSidebarNavItems items={docsConfig.sidebarNav} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface DocsSidebarNavItemsProps {
  items: NavItem[];
  pathname?: string;
}

/**
 * Renders sidebar navigation items recursively
 */
export function DocsSidebarNavItems({ 
  items, 
  pathname 
}: DocsSidebarNavItemsProps) {
  const currentPath = usePathname();
  const path = pathname ?? currentPath;
  
  return items.length > 0 ? (
    <div className="grid grid-flow-row auto-rows-max text-sm">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {item.href ? (
            <Link
              href={item.href}
              className={cn(
                "flex w-full items-center rounded-md p-2 hover:underline",
                {
                  "bg-muted font-medium": path === item.href,
                }
              )}
              target={item.href.startsWith("http") ? "_blank" : undefined}
              rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {item.title}
            </Link>
          ) : (
            <CollapsibleNavItem item={item} pathname={path || ''} />
          )}
        </React.Fragment>
      ))}
    </div>
  ) : null;
}

interface CollapsibleNavItemProps {
  item: NavItem;
  pathname: string;
}

/**
 * Collapsible navigation item for sidebar
 */
function CollapsibleNavItem({ item, pathname }: CollapsibleNavItemProps) {
  // Check if any child is active
  const isActive = item.items?.some(
    (subItem) => subItem.href && pathname === subItem.href
  );
  
  // State for expanded/collapsed sections
  const [expanded, setExpanded] = useState(isActive);
  
  return (
    <div className="flex flex-col">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between rounded-md p-2 font-medium hover:bg-muted"
      >
        {item.title}
        <ChevronRight
          className={cn(
            "h-4 w-4 transition-transform",
            expanded ? "rotate-90" : ""
          )}
        />
      </button>
      
      {expanded && item.items?.length ? (
        <div className="ml-4 mt-1 space-y-1">
          {item.items.map((subItem, idx) => (
            <Link
              key={idx}
              href={subItem.href || "#"}
              className={cn(
                "flex w-full items-center rounded-md p-2 hover:underline",
                {
                  "bg-muted font-medium": pathname === subItem.href,
                }
              )}
            >
              {subItem.title}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default SidebarNav;
