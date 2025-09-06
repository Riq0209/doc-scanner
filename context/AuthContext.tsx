import { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName?: string) => Promise<{ needsVerification: boolean; email: string | undefined; }>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    console.log('🔄 AuthContext initializing...');
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      console.log('📱 Initial session check:', !!session?.user);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      console.log('🔄 Auth state changed:', _event, !!session?.user);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Debug: Check current user status
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.log("Error fetching user:", error.message);
      } else {
        console.log("Logged in user:", user?.email);
      }
      
      // Reset guest mode when user signs in
      if (session?.user) {
        console.log('✅ User signed in, disabling guest mode');
        setIsGuest(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      console.log('🔐 Starting Google OAuth...');
      // Clear guest mode when user attempts to sign in with Google
      setIsGuest(false);

      // Create the redirect URI - use production domain for web
      const redirectUrl = Platform.OS === 'web'
        ? `${window.location.origin}/auth/callback`
        : AuthSession.makeRedirectUri();

      console.log('🔗 Redirect URL:', redirectUrl);
      console.log('🔗 Platform:', Platform.OS);
      console.log('🔗 Current origin:', Platform.OS === 'web' ? window.location.origin : 'N/A');
      console.log('🔗 Full URL construction:', Platform.OS === 'web' ? `${window.location.origin}/auth/callback` : 'N/A');

      if (Platform.OS === 'web') {
        // Web version - use auth session with proper redirect
        console.log('🌐 Web OAuth - Sending request to Supabase');

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        console.log('🌐 Supabase OAuth response:', { url: data?.url, error: error?.message });

        if (error) throw error;

        if (data?.url) {
          console.log('🌐 Opening auth session with URL:', data.url);

          const result = await WebBrowser.openAuthSessionAsync(
            data.url,
            redirectUrl
          );

          console.log('🌐 Auth session result:', result);

          if (result.type === 'success' && result.url) {
            console.log('🌐 Success! Callback URL received:', result.url);
            await parseAuthCallback(result.url);
          } else if (result.type === 'cancel') {
            throw new Error('Authentication was cancelled');
          }
        }
      } else {
        // Mobile version - use proper redirect URI
        console.log('📱 Mobile OAuth - Sending request to Supabase');

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        console.log('📱 Supabase OAuth response:', { url: data?.url, error: error?.message });

        if (error) throw error;

        if (data?.url) {
          console.log('📱 OAuth URL received from Supabase:', data.url);
          console.log('📱 Opening OAuth URL in mobile browser...');

          // Start polling immediately for mobile
          const pollPromise = pollForAuth();

          // Open in browser
          const result = await WebBrowser.openBrowserAsync(data.url, {
            showTitle: true,
            toolbarColor: '#000',
          });

          console.log('📱 Browser result:', result);

          // Wait for polling to complete (auth detection)
          await pollPromise;
        }
      }
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const pollForAuth = async () => {
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;
    
    return new Promise<void>((resolve, reject) => {
      const interval = setInterval(async () => {
        attempts++;
        
        if (attempts > maxAttempts) {
          clearInterval(interval);
          reject(new Error('Authentication timeout - please try again'));
          return;
        }
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            console.log('✅ Mobile authentication successful!');
            clearInterval(interval);
            resolve();
          }
        } catch (error) {
          console.error('Error checking auth:', error);
        }
      }, 1000); // Check every second
    });
  };

  const parseAuthCallback = async (url: string) => {
    try {
      console.log('🔗 Parsing auth callback URL:', url);
      
      // Extract tokens from the URL fragment (after #)
      const urlObj = new URL(url);
      const fragment = urlObj.hash.substring(1); // Remove the #
      const params = new URLSearchParams(fragment);
      
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const expiresAt = params.get('expires_at');
      
      console.log('🔑 Found tokens:', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken,
        expiresAt 
      });
      
      if (accessToken) {
        // Set the session with the extracted tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });
        
        if (sessionError) {
          console.error('❌ Error setting session:', sessionError);
          throw sessionError;
        }
        
        console.log('✅ Authentication successful! User:', sessionData.user?.email);
      } else {
        console.error('❌ No access token found in callback URL');
        throw new Error('No access token found in authentication response');
      }
    } catch (error) {
      console.error('❌ Error parsing auth callback:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🔄 Starting sign out process...');
      setIsGuest(false);
      
      console.log('📱 Calling Supabase signOut...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('❌ Supabase signOut error:', error);
        throw error;
      }
      
      console.log('✅ Sign out successful');
      
      // Force clear local session state
      setUser(null);
      setSession(null);
      setLoading(false);
      
    } catch (error) {
      console.error('❌ Error signing out:', error);
      // Even if there's an error, clear local state
      setUser(null);
      setSession(null);
      setLoading(false);
      throw error;
    }
  };

  const continueAsGuest = () => {
    console.log('👤 Continuing as guest');
    setIsGuest(true);
    setLoading(false);
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('📧 Starting email sign in for:', email);
      setLoading(true);
      // Clear guest mode when user attempts to sign in
      setIsGuest(false);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        console.error('❌ Email sign in error:', error);
        throw error;
      }

      console.log('✅ Email sign in successful:', data.user?.email);
    } catch (error) {
      console.error('❌ Error signing in with email:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    try {
      console.log('📧 Starting email sign up for:', email);
      setLoading(true);
      // Clear guest mode when user attempts to sign up
      setIsGuest(false);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName || '',
          },
        },
      });

      if (error) {
        console.error('❌ Email sign up error:', error);
        throw error;
      }

      if (data.user && !data.session) {
        // User needs to verify email
        console.log('📧 User created, email verification required');
        // Return a special object to indicate verification needed
        return { needsVerification: true, email: data.user.email };
      }

      console.log('✅ Email sign up successful:', data.user?.email);
      return { needsVerification: false, email: data.user?.email };
    } catch (error) {
      console.error('❌ Error signing up with email:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('🔄 Starting password reset for:', email);

      // Use production domain for web, dynamic URI for mobile
      const redirectUrl = Platform.OS === 'web'
        ? `${window.location.origin}/reset-password`
        : AuthSession.makeRedirectUri();

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: redirectUrl,
        }
      );

      if (error) {
        console.error('❌ Password reset error:', error);
        throw error;
      }

      console.log('✅ Password reset email sent');
    } catch (error) {
      console.error('❌ Error sending password reset:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    isGuest,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    continueAsGuest,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
