"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextProps, AuthState } from './types';
import { supabase } from '../supabase';
import { Session, User } from '@supabase/supabase-js';

/**
 * Authentication context providing global access to auth state
 * 
 * @remarks
 * This context synchronizes with Supabase auth and exposes methods
 * to interact with authentication throughout the app
 */
export const AuthContext = createContext<AuthContextProps | undefined>(undefined);

/**
 * Initial state for authentication
 */
const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  error: null,
};

/**
 * Authentication Provider component that wraps the application
 * and provides authentication state and methods to all child components
 * 
 * @example
 * ```tsx
 * // In your root layout
 * export default function RootLayout({ children }) {
 *   return (
 *     <AuthProvider>
 *       {children}
 *     </AuthProvider>
 *   )
 * }
 * ```
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(initialState);
  
  // Update auth state based on session changes
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (session) {
          const { data: { user } } = await supabase.auth.getUser();
          setAuthState({
            user,
            session,
            isLoading: false,
            error: null,
          });
        } else {
          setAuthState({
            ...initialState,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('Error getting auth session:', error);
        setAuthState({
          ...initialState,
          error: error as Error,
          isLoading: false,
        });
      }
    };
    
    initializeAuth();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (session) {
          const { data: { user } } = await supabase.auth.getUser();
          setAuthState({
            user,
            session,
            isLoading: false,
            error: null,
          });
        } else {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            error: null,
          });
        }
      }
    );
    
    // Clean up subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error: error as Error };
    }
  };
  
  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      return { error: null, data: { user: data.user } };
    } catch (error) {
      console.error('Error signing up:', error);
      return { error: error as Error, data: { user: null } };
    }
  };
  
  /**
   * Sign out the current user
   */
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  /**
   * Send magic link to email
   */
  const signInWithMagicLink = async (email: string, redirectTo?: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
      
      if (error) {
        throw error;
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error sending magic link:', error);
      return { error: error as Error };
    }
  };
  
  /**
   * Send password reset email
   */
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        throw error;
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { error: error as Error };
    }
  };
  
  /**
   * Update user profile
   */
  const updateProfile = async (profile: { display_name?: string; avatar_url?: string }) => {
    try {
      if (!authState.user) {
        throw new Error('User is not authenticated');
      }
      
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: authState.user.id,
          ...profile,
          updated_at: new Date().toISOString(),
        });
      
      if (error) {
        throw error;
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error: error as Error };
    }
  };
  
  // Value to provide through context
  const value: AuthContextProps = {
    ...authState,
    signIn,
    signUp,
    signOut,
    signInWithMagicLink,
    resetPassword,
    updateProfile,
    isAuthenticated: !!authState.user,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use authentication context
 * 
 * @example
 * ```tsx
 * function ProfileButton() {
 *   const { user, isAuthenticated, signOut } = useAuth();
 *   
 *   if (isAuthenticated) {
 *     return <button onClick={signOut}>Sign Out {user.email}</button>;
 *   }
 *   
 *   return <button>Sign In</button>;
 * }
 * ```
 */
export function useAuth(): AuthContextProps {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}
