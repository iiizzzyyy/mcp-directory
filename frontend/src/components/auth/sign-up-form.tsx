"use client";

import React, { useState, FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthProvider';


import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Github } from 'lucide-react';

interface SignUpFormProps {
  /**
   * Callback function when sign up is successful
   */
  onSuccess?: () => void;
  
  /**
   * Function to switch to sign in tab
   */
  switchToSignIn?: () => void;
}

/**
 * Sign Up Form component with email/password and OAuth options
 */
export function SignUpForm({ onSuccess, switchToSignIn }: SignUpFormProps) {
  const { signUp, signInWithOAuth, updateProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showVerificationSent, setShowVerificationSent] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // Form validation errors
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setEmailError('');
    setPasswordError('');
    setDisplayNameError('');
    setErrorMessage(null);
    
    // Validate inputs
    let hasError = false;
    
    if (!email) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
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
    
    if (displayName && displayName.length < 2) {
      setDisplayNameError('Display name must be at least 2 characters');
      hasError = true;
    } else if (displayName && displayName.length > 50) {
      setDisplayNameError('Display name must be at most 50 characters');
      hasError = true;
    }
    
    if (hasError) return;
    
    // Submit form
    setIsLoading(true);
    
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
      
      // If onSuccess callback is provided, call it
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Sign up error:', error);
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle OAuth sign in
  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      await signInWithOAuth(provider);
      // Note: The redirect will happen automatically,
      // so we don't need to call onSuccess here
    } catch (error) {
      console.error(`${provider} sign in error:`, error);
      setErrorMessage(`Failed to sign up with ${provider}. Please try again.`);
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Error message */}
      {errorMessage && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
      
      {/* Verification sent message */}
      {showVerificationSent && (
        <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
          <AlertDescription>
            A verification email has been sent to your email address.
            Please check your inbox and follow the instructions to complete registration.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Sign up form */}
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
            disabled={isLoading} 
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
            disabled={isLoading} 
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
          <label className="text-sm font-medium" htmlFor="displayName">
            Display Name (Optional)
          </label>
          <Input 
            id="displayName"
            placeholder="Your Name" 
            autoComplete="name"
            disabled={isLoading} 
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
          disabled={isLoading || showVerificationSent}
          className="w-full"
        >
          {isLoading ? 'Signing Up...' : 'Create Account'}
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
          disabled={isLoading}
          onClick={() => handleOAuthSignIn('github')}
        >
          <Github className="mr-2 h-4 w-4" />
          GitHub
        </Button>
        <Button 
          variant="outline" 
          disabled={isLoading}
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
      
      {/* Sign in link */}
      {switchToSignIn && (
        <div className="text-center mt-4">
          <Button 
            variant="link" 
            onClick={switchToSignIn} 
            className="text-sm p-0"
            type="button"
          >
            Already have an account? Sign in
          </Button>
        </div>
      )}
    </div>
  );
}

export default SignUpForm;
