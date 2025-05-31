'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { SignInForm } from '@/components/auth/sign-in-form';
import { SignUpForm } from '@/components/auth/sign-up-form';
import { useAuth } from '@/contexts/AuthProvider';
import { Loader2 } from 'lucide-react';

/**
 * Standalone login page with sign in and sign up tabs
 * 
 * Provides a dedicated page for authentication with both
 * email/password and OAuth options.
 */
export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'sign-in' | 'sign-up'>('sign-in');
  
  // Redirect authenticated users to dashboard
  useEffect(() => {
    // Reason: Only redirect after auth state is loaded and user is authenticated
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);
  
  // Handle authentication success
  const handleAuthSuccess = () => {
    // Redirect to dashboard after successful auth
    router.push('/dashboard');
  };
  
  // If auth state is loading, show loading indicator
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading authentication state...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container max-w-md py-12 px-4 mx-auto min-h-[80vh] flex flex-col justify-center">
      <div className="text-center mb-8">
        <Link 
          href="/" 
          className="inline-flex items-center space-x-2"
          aria-label="Return to home page"
        >
          <div className="h-8 w-8 bg-primary/20 rounded-md flex items-center justify-center">
            <span className="font-bold text-lg text-foreground">M</span>
          </div>
          <span className="font-semibold text-xl">MCP Directory</span>
        </Link>
      </div>
      
      <Card className="w-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {activeTab === 'sign-in' ? 'Welcome back' : 'Create an account'}
          </CardTitle>
          <CardDescription className="text-center">
            {activeTab === 'sign-in' 
              ? 'Sign in to your account to continue'
              : 'Create a new account to get started'
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as 'sign-in' | 'sign-up')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="sign-in">Sign In</TabsTrigger>
              <TabsTrigger value="sign-up">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sign-in" className="mt-0">
              <SignInForm onSuccess={handleAuthSuccess} />
            </TabsContent>
            
            <TabsContent value="sign-up" className="mt-0">
              <SignUpForm 
                onSuccess={handleAuthSuccess} 
                switchToSignIn={() => setActiveTab('sign-in')}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-4 hover:text-primary">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="underline underline-offset-4 hover:text-primary">
              Privacy Policy
            </Link>
            .
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
