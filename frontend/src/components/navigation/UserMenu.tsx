"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthProvider';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, LogOut, Settings, GitPullRequest, Heart } from 'lucide-react';
import { AuthModal } from '@/components/auth';

/**
 * UserMenu component displays either sign in buttons or a user avatar dropdown
 * based on authentication state
 */
export function UserMenu() {
  const { user, profile, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'sign-in' | 'sign-up'>('sign-in');
  
  // Generate user initials for avatar fallback
  const getUserInitials = () => {
    if (!user?.email) return 'U';
    return user.email.substring(0, 2).toUpperCase();
  };
  
  // Get display name (email or profile name)
  const getDisplayName = () => {
    if (profile?.display_name) return profile.display_name;
    if (user?.email) {
      const emailParts = user.email.split('@');
      return emailParts[0];
    }
    return 'User';
  };
  
  // Open auth modal with specific tab
  const openAuthModal = (tab: 'sign-in' | 'sign-up') => {
    setActiveTab(tab);
    setAuthModalOpen(true);
  };
  
  // If user is not authenticated, show sign in buttons
  if (!user) {
    return (
      <>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => openAuthModal('sign-in')}
            className="text-sm font-medium"
          >
            Sign In
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => openAuthModal('sign-up')}
            className="text-sm font-medium"
          >
            Sign Up
          </Button>
        </div>
        
        {/* Auth Modal */}
        <AuthModal 
          open={authModalOpen} 
          onOpenChange={setAuthModalOpen} 
          defaultTab={activeTab}
          onAuthSuccess={() => setAuthModalOpen(false)}
        />
      </>
    );
  }
  
  // If user is authenticated, show avatar dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8 border border-border">
            <AvatarImage 
              src={profile?.avatar_url || ''} 
              alt={getDisplayName()} 
            />
            <AvatarFallback className="bg-pastel-purple text-foreground">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{getDisplayName()}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex cursor-pointer items-center">
            <User className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/submissions" className="flex cursor-pointer items-center">
            <GitPullRequest className="mr-2 h-4 w-4" />
            <span>My Submissions</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/favorites" className="flex cursor-pointer items-center">
            <Heart className="mr-2 h-4 w-4" />
            <span>Favorites</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex cursor-pointer items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserMenu;
