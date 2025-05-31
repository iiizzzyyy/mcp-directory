"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  Session, 
  User, 
  AuthError, 
  AuthResponse, 
  UserResponse 
} from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/supabase';

/**
 * Profile type definition representing user profile data
 */
export type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * AuthContextType defines the shape of our authentication context
 */
interface AuthContextType {
  /**
   * Current authenticated user, null if not authenticated
   */
  user: User | null;
  /**
   * Current session data, null if no active session
   */
  session: Session | null;
  /**
   * User profile data from the profiles table
   */
  profile: Profile | null;
  /**
   * Whether auth state is currently loading
   */
  isLoading: boolean;
  /**
   * Error that occurred during authentication, if any
   */
  error: AuthError | Error | null;
  /**
   * Whether the user is authenticated (convenience property)
   */
  isAuthenticated: boolean;
  /**
   * Sign in with email and password
   */
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  /**
   * Sign in with OAuth provider
   */
  signInWithOAuth: (provider: 'github' | 'google') => Promise<void>;
  /**
   * Sign in with magic link sent to email
   */
  signInWithMagicLink: (email: string, redirectTo?: string) => Promise<{ data: {}; error: AuthError | null }>;
  /**
   * Sign up with email and password
   */
  signUp: (email: string, password: string) => Promise<AuthResponse>;
  /**
   * Sign out the current user
   */
  signOut: () => Promise<void>;
  /**
   * Update the user's profile
   */
  updateProfile: (data: Partial<Profile>) => Promise<void>;
  /**
   * Reset the user's password
   */
  resetPassword: (email: string) => Promise<{ data: {}; error: AuthError | null; }>;
}

/**
 * Default context values used before the provider is initialized
 */
const defaultContext: AuthContextType = {
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,
  signIn: async () => ({ data: { session: null, user: null }, error: null }),
  signInWithOAuth: async () => {},
  signInWithMagicLink: async () => ({ data: {}, error: null }),
  signUp: async () => ({ data: { session: null, user: null }, error: null }),
  signOut: async () => {},
  updateProfile: async () => {},
  resetPassword: async (email: string) => ({ data: {}, error: null } as { data: {}; error: AuthError | null }),
};

/**
 * Create the authentication context
 */
const AuthContext = createContext<AuthContextType>(defaultContext);

/**
 * AuthProvider component that wraps the application and provides authentication state
 * 
 * @param children - The child components to be wrapped by the provider
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<AuthError | Error | null>(null);
  // Derived state for authentication status
  const isAuthenticated = !!user;

  /**
   * Fetches the user's profile from the database
   * 
   * @param userId - The user's ID
   */
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      return data as Profile;
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      return null;
    }
  };

  /**
   * Handle auth state changes (login, logout, etc.)
   */
  useEffect(() => {
    setIsLoading(true);
    
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          // Fetch user profile if we have a user
          if (initialSession.user) {
            const userProfile = await fetchProfile(initialSession.user.id);
            setProfile(userProfile);
          }
        }
      } catch (e) {
        const err = e as Error;
        console.error('Error initializing auth:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user || null);
        
        if (newSession?.user) {
          const userProfile = await fetchProfile(newSession.user.id);
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password
   * 
   * @param email - User's email
   * @param password - User's password
   * @returns AuthResponse from Supabase
   */
  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (response.error) {
        setError(response.error);
      }
      
      return response;
    } catch (err) {
      const authError = err as AuthError;
      setError(authError);
      return { data: { user: null, session: null }, error: authError };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign in with a magic link sent to email
   */
  const signInWithMagicLink = async (email: string, redirectTo?: string): Promise<{ data: {}; error: AuthError | null }> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await supabase.auth.signInWithOtp({
        email,
        options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
      });
      
      if (response.error) {
        setError(response.error);
      }
      
      return response;
    } catch (err) {
      const authError = err as AuthError;
      setError(authError);
      return { data: {}, error: authError };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Sign in with OAuth provider (GitHub, Google)
   * 
   * @param provider - The OAuth provider to use
   */
  const signInWithOAuth = async (provider: 'github' | 'google') => {
    try {
      await supabase.auth.signInWithOAuth({ provider });
    } catch (e) {
      const err = e as Error;
      setError(err);
      throw err;
    }
  };

  /**
   * Sign up with email and password
   * 
   * @param email - User's email
   * @param password - User's password
   * @returns AuthResponse from Supabase
   */
  const signUp = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await supabase.auth.signUp({ email, password });
      
      if (response.error) {
        setError(response.error);
      }
      
      return response;
    } catch (e) {
      const err = e as Error;
      setError(err);
      throw err;
    }
  };

  /**
   * Sign out the current user
   */
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (e) {
      const err = e as Error;
      setError(err);
      throw err;
    }
  };

  /**
   * Update the user's profile
   * 
   * @param data - Profile data to update
   */
  const updateProfile = async (data: Partial<Profile>) => {
    try {
      if (!user) {
        throw new Error('User must be logged in to update profile');
      }

      // Update the profile in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Fetch the updated profile
      const updatedProfile = await fetchProfile(user.id);
      setProfile(updatedProfile);
    } catch (e) {
      const err = e as Error;
      setError(err);
      throw err;
    }
  };

  /**
   * Send a password reset email
   * 
   * @param email - User's email
   */
  const resetPassword = async (email: string) => {
    try {
      const response = await supabase.auth.resetPasswordForEmail(email);
      return { data: response.data || {}, error: response.error } as { data: {}; error: AuthError | null };
    } catch (e) {
      const err = e as Error;
      setError(err);
      throw err;
    }
  };

  // Construct the context value
  const value: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    error,
    isAuthenticated,
    signIn,
    signInWithOAuth,
    signInWithMagicLink,
    signUp,
    signOut,
    updateProfile,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use the authentication context
 * 
 * @returns The authentication context
 * @throws Error if used outside of AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default AuthProvider;
