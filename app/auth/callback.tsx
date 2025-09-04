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
        console.log('🔗 Auth callback received with params:', params);
        
        // Extract tokens from URL parameters
        const accessToken = params.access_token as string;
        const refreshToken = params.refresh_token as string;
        
        if (accessToken) {
          console.log('✅ Setting session with tokens');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (error) {
            console.error('❌ Error setting session:', error);
          } else {
            console.log('✅ Session set successfully');
          }
        }
        
        // Redirect to the main app
        router.replace('/(tabs)');
      } catch (error) {
        console.error('❌ Error in auth callback:', error);
        router.replace('/login');
      }
    };

    handleAuthCallback();
  }, [params, router]);

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
