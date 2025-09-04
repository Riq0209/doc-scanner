import { useRouter, useSegments } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { user, loading, isGuest } = useAuth();
  const { colors } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'auth';
    
    console.log('🔐 Auth check:', { 
      hasUser: !!user, 
      isGuest,
      currentRoute: segments[0], 
      inAuthGroup,
      loading 
    });

    // If no user and not guest and not on login/auth page, redirect to login
    if (!user && !isGuest && !inAuthGroup) {
      console.log('🔄 Redirecting to login - no user or guest');
      router.replace('/login');
      return;
    }
    
    // If user is authenticated (not guest) and on login/auth page, redirect to main app
    if (user && inAuthGroup) {
      console.log('🔄 User authenticated, redirecting to main app');
      router.replace('/(tabs)');
      return;
    }

    // If guest user and not on auth page and not authenticated, allow navigation
    // This allows guest users to navigate to login/auth pages when they want to sign in
  }, [user, loading, isGuest, segments]);

  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: colors.background 
      }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return <>{children}</>;
}
