import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Index() {
  const { user, loading, isGuest } = useAuth();
  const { colors } = useTheme();

  console.log('📱 Index screen - Auth state:', { hasUser: !!user, isGuest, loading });

  // Show loading while checking auth
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

  // Redirect based on auth state
  if (user || isGuest) {
    console.log('✅ User authenticated or guest mode, redirecting to tabs');
    return <Redirect href="/(tabs)" />;
  }

  console.log('🔐 No user and not guest, redirecting to login');
  return <Redirect href="/login" />;
}
