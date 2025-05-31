"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthProvider';
import { cn } from '@/lib/utils';
import { 
  Menu, X, Home, BookOpen, LayoutDashboard, 
  ScrollText, Users, LogIn, LogOut, User, Settings,
  ChevronRight, Github 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Navigation items configuration with icons
const navItems = [
  { name: 'Discover', href: '/', icon: <Home className="h-5 w-5 mr-3" /> },
  { name: 'Docs', href: '/docs', icon: <BookOpen className="h-5 w-5 mr-3" /> },
  { name: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-5 w-5 mr-3" /> },
  { name: 'Rules', href: '/rules', icon: <ScrollText className="h-5 w-5 mr-3" /> },
  { name: 'Community', href: '/community', icon: <Users className="h-5 w-5 mr-3" /> },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { user, profile, signOut, signInWithOAuth } = useAuth();
  
  // Handle sign in with GitHub
  const handleGitHubSignIn = async () => {
    try {
      await signInWithOAuth('github');
      setOpen(false);
    } catch (error) {
      console.error('GitHub sign in error:', error);
    }
  };
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };
  
  // Get display name
  const getDisplayName = () => {
    if (profile?.display_name) return profile.display_name;
    if (user?.email) {
      const emailParts = user.email.split('@');
      return emailParts[0];
    }
    return 'User';
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" className="md:hidden p-0 w-10 h-10">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] flex flex-col">
        {/* Header with logo and close button */}
        <SheetHeader className="px-1">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2" onClick={() => setOpen(false)}>
              <div className="h-8 w-8 bg-pastel-blue rounded-md flex items-center justify-center">
                <span className="font-bold text-lg text-foreground">M</span>
              </div>
              <span className="font-semibold text-xl">MCP Directory</span>
            </Link>
          </div>
        </SheetHeader>
        
        {/* User profile section */}
        {user ? (
          <div className="flex items-center space-x-3 mt-6 mb-2 px-2">
            <Avatar className="h-9 w-9 border border-border">
              <AvatarImage src={profile?.avatar_url || ''} alt={getDisplayName()} />
              <AvatarFallback className="bg-pastel-purple text-foreground">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                {user.email}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-2 mt-6 mb-2 px-2">
            <p className="text-sm text-muted-foreground">Sign in to access your dashboard</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleGitHubSignIn}
              className="justify-start"
            >
              <Github className="h-4 w-4 mr-2" />
              Sign in with GitHub
            </Button>
          </div>
        )}
        
        <Separator className="my-4" />
        
        {/* Main navigation */}
        <div className="flex-1 overflow-auto py-2">
          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center text-base px-2 py-2 rounded-md transition-colors",
                  pathname === item.href
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {item.icon}
                {item.name}
                {pathname === item.href && (
                  <div className="ml-auto w-1 h-6 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </nav>
        </div>
        
        <Separator className="my-4" />
        
        {/* Footer actions */}
        <SheetFooter className="mt-auto">
          {user ? (
            <Button 
              variant="ghost" 
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => { signOut(); setOpen(false); }}
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sign Out
            </Button>
          ) : (
            <div className="text-xs text-center text-muted-foreground p-2">
              MCP Directory © {new Date().getFullYear()}
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default MobileNav;
