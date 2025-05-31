import { User, Session } from '@supabase/supabase-js';

/**
 * Authentication state object
 */
export interface AuthState {
  /** Current authenticated user, null if not authenticated */
  user: User | null;
  
  /** Current session data, null if no active session */
  session: Session | null;
  
  /** Whether auth state is currently loading */
  isLoading: boolean;
  
  /** Error that occurred during authentication, if any */
  error: Error | null;
}

/**
 * Authentication context interface
 */
export interface AuthContextProps extends AuthState {
  /** Sign in with email and password */
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  
  /** Sign up with email and password */
  signUp: (email: string, password: string) => Promise<{ error: Error | null; data: { user: User | null } }>;
  
  /** Sign out the current user */
  signOut: () => Promise<void>;
  
  /** Sign in with magic link */
  signInWithMagicLink: (email: string, redirectTo?: string) => Promise<{ error: Error | null }>;
  
  /** Reset the user's password */
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  
  /** Update the current user's profile */
  updateProfile: (profile: { display_name?: string; avatar_url?: string }) => Promise<{ error: Error | null }>;
  
  /** Check if a user is authenticated */
  isAuthenticated: boolean;
}
