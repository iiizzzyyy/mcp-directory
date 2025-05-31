'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthProvider';
import { AlertCircle, CheckCircle2, Github, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

/**
 * Standalone signup page with password confirmation
 * and email verification success message
 */
function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, signInWithOAuth, updateProfile, isAuthenticated, isLoading } = useAuth();
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // Form validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVerificationSent, setShowVerificationSent] = useState(false);
  
  // Check for verification success parameter
  const verificationSuccess = searchParams?.get('verified') === 'true';
  
  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setDisplayNameError('');
    setErrorMessage(null);
    
    // Validate inputs
    let hasError = false;
    
    if (!email) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!/^\\S+@\\S+\\.\\S+$/.test(email)) {
      setEmailError('Must be a valid email address');
      hasError = true;
    }
    
    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      hasError = true;
    } else if (!/[A-Z]/.test(password)) {
      setPasswordError('Password must contain at least one uppercase letter');
      hasError = true;
    } else if (!/[a-z]/.test(password)) {
      setPasswordError('Password must contain at least one lowercase letter');
      hasError = true;
    } else if (!/[0-9]/.test(password)) {
      setPasswordError('Password must contain at least one number');
      hasError = true;
    }
    
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      hasError = true;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }
    
    if (displayName && displayName.length < 2) {
      setDisplayNameError('Display name must be at least 2 characters');
      hasError = true;
    } else if (displayName && displayName.length > 50) {
      setDisplayNameError('Display name must be at most 50 characters');
      hasError = true;
    }
    
    if (hasError) return;
    
    // Submit form
    setIsSubmitting(true);
    
    try {
      const { error } = await signUp(email, password);
      
      if (error) {
        // Handle specific error codes
        if (error.message?.includes('already registered')) {
          setErrorMessage(
            'This email is already registered. Please sign in instead.'
          );
        } else {
          setErrorMessage(
            error.message || 'Failed to sign up. Please try again.'
          );
        }
        setIsSubmitting(false);
        return;
      }
      
      // If successful, show verification message
      setShowVerificationSent(true);
      
      // Update profile with display name if provided
      if (displayName) {
        try {
          await updateProfile({ display_name: displayName });
        } catch (profileError) {
          console.error('Error updating profile:', profileError);
          // Non-critical error, so we don't show it to the user
        }
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle OAuth sign in
  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    setIsSubmitting(true);
    setErrorMessage(null);
    
    try {
      await signInWithOAuth(provider);
      // Note: The redirect will happen automatically
    } catch (error) {
      console.error(`${provider} sign in error:`, error);
      setErrorMessage(`Failed to sign up with ${provider}. Please try again.`);
      setIsSubmitting(false);
    }
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
  
  // If the user has just verified their email
  if (verificationSuccess) {
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
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-center">
              Email Verified Successfully!
            </CardTitle>
            <CardDescription className="text-center">
              Your email has been verified. You can now sign in to your account.
            </CardDescription>
          </CardHeader>
          
          <CardFooter className="flex flex-col space-y-4 pt-4">
            <Button 
              className="w-full" 
              onClick={() => router.push('/login')}
            >
              Sign In to Your Account
            </Button>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/')}
            >
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // If verification email has been sent
  if (showVerificationSent) {
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
              Check Your Email
            </CardTitle>
            <CardDescription className="text-center">
              We've sent a verification link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-md border border-green-200 text-green-800">
                <div className="flex">
                  <CheckCircle2 className="h-5 w-5 mr-2 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Verification email sent!</p>
                    <p className="mt-1 text-sm">
                      Please check your inbox and click the verification link to complete your registration.
                      If you don't see the email, check your spam folder.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                <p>
                  The verification link will expire in 24 hours. If you need a new verification link, please try signing up again.
                </p>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push('/')}
            >
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Normal signup form
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
            Create an account
          </CardTitle>
          <CardDescription className="text-center">
            Enter your information to create a new account
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Error message */}
          {errorMessage && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input 
                id="email"
                placeholder="you@example.com" 
                type="email" 
                autoComplete="email"
                disabled={isSubmitting} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={emailError ? 'border-red-500' : ''}
              />
              {emailError && (
                <p className="text-sm text-red-500">{emailError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input 
                id="password"
                placeholder="••••••••" 
                type="password" 
                autoComplete="new-password"
                disabled={isSubmitting} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={passwordError ? 'border-red-500' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase and a number
              </p>
              {passwordError && (
                <p className="text-sm text-red-500">{passwordError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <Input 
                id="confirmPassword"
                placeholder="••••••••" 
                type="password" 
                autoComplete="new-password"
                disabled={isSubmitting} 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={confirmPasswordError ? 'border-red-500' : ''}
              />
              {confirmPasswordError && (
                <p className="text-sm text-red-500">{confirmPasswordError}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="displayName">
                Display Name (Optional)
              </label>
              <Input 
                id="displayName"
                placeholder="Your Name" 
                autoComplete="name"
                disabled={isSubmitting} 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={displayNameError ? 'border-red-500' : ''}
              />
              {displayNameError && (
                <p className="text-sm text-red-500">{displayNameError}</p>
              )}
            </div>
            
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
          
          {/* OAuth options */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              disabled={isSubmitting}
              onClick={() => handleOAuthSignIn('github')}
            >
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>
            <Button 
              variant="outline" 
              disabled={isSubmitting}
              onClick={() => handleOAuthSignIn('google')}
            >
              <svg 
                className="mr-2 h-4 w-4" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 48 48"
                width="16"
                height="16"
              >
                <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
                <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
                <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
                <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
              </svg>
              Google
            </Button>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-4">
          <div className="text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </div>
          
          <div className="text-center text-xs text-muted-foreground">
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

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
