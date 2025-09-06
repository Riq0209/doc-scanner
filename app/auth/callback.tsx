import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔗 Auth callback received');
        
        // For web OAuth, Supabase handles the session automatically
        // Just check if we have a valid session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting session:', error);
          router.replace('/login');
          return;
        }
        
        if (session?.user) {
          console.log('✅ User authenticated successfully:', session.user.email);
          router.replace('/(tabs)');
        } else {
          console.log('⚠️ No active session found, redirecting to login');
          router.replace('/login');
        }
      } catch (error) {
        console.error('❌ Error in auth callback:', error);
        router.replace('/login');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Completing authentication...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    color: '#666',
  },
});
