"use client";

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';

interface AuthModalProps {
  /**
   * Whether the modal is open
   */
  open: boolean;
  
  /**
   * Function to call when the modal should be closed
   */
  onOpenChange: (open: boolean) => void;
  
  /**
   * Optional default tab to show (sign-in or sign-up)
   */
  defaultTab?: 'sign-in' | 'sign-up';
  
  /**
   * Optional callback for when authentication is successful
   */
  onAuthSuccess?: () => void;
}

/**
 * Modal component with tabbed interface for sign in and sign up forms
 */
export function AuthModal({
  open,
  onOpenChange,
  defaultTab = 'sign-in',
  onAuthSuccess,
}: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'sign-in' | 'sign-up'>(defaultTab);
  
  // Reset to default tab when modal is closed
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Small delay to avoid visual glitch during close animation
      setTimeout(() => setActiveTab(defaultTab), 300);
    }
    onOpenChange(open);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-semibold">
            {activeTab === 'sign-in' ? 'Welcome Back' : 'Create Account'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {activeTab === 'sign-in' 
              ? 'Sign in to your account to continue'
              : 'Sign up to get started with MCP Directory'
            }
          </DialogDescription>
        </DialogHeader>
        
        <Tabs 
          defaultValue={defaultTab} 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'sign-in' | 'sign-up')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="sign-in">Sign In</TabsTrigger>
            <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="sign-in" className="mt-0">
            <SignInForm onSuccess={onAuthSuccess} />
          </TabsContent>
          
          <TabsContent value="sign-up" className="mt-0">
            <SignUpForm 
              onSuccess={onAuthSuccess} 
              switchToSignIn={() => setActiveTab('sign-in')}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export default AuthModal;
