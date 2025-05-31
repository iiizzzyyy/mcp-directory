"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Navigation items configuration
const navItems = [
  { name: 'Discover', href: '/' },
  { name: 'Docs', href: '/docs' },
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Rules', href: '/rules' },
  { name: 'Community', href: '/community' },
];

export function NavMenu() {
  const pathname = usePathname();
  
  return (
    <nav className="hidden md:flex items-center space-x-6">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            pathname === item.href
              ? "text-foreground font-semibold"
              : "text-muted-foreground"
          )}
        >
          {item.name}
        </Link>
      ))}
    </nav>
  );
}

export default NavMenu;
