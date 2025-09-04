import { useRouter } from 'expo-router';
import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { continueAsGuest } = useAuth();
  const router = useRouter();

  const handleGuestMode = () => {
    console.log('👤 Guest mode selected');
    continueAsGuest();
    router.replace('/(tabs)');
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
    },
    imageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 60,
    },
    illustrationPlaceholder: {
      width: 200,
      height: 200,
      backgroundColor: '#E8F5E8',
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 40,
      borderWidth: 2,
      borderColor: colors.tint + '20',
    },
    illustrationIcon: {
      fontSize: 80,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginTop: 20,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
      paddingHorizontal: 20,
    },
    buttonsContainer: {
      paddingBottom: 40,
    },
    loginButton: {
      backgroundColor: colors.text,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    loginButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.background,
    },
    registerButton: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.text,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 24,
    },
    registerButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    guestButton: {
      alignItems: 'center',
    },
    guestButtonText: {
      fontSize: 16,
      color: colors.tint,
      textDecorationLine: 'underline',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.imageContainer}>
        <View style={dynamicStyles.illustrationPlaceholder}>
          <Text style={dynamicStyles.illustrationIcon}>📄</Text>
        </View>
        <Text style={dynamicStyles.title}>Document Scanner</Text>
        <Text style={dynamicStyles.subtitle}>Scan, convert to PDF, and store your documents securely</Text>
      </View>

      <View style={dynamicStyles.buttonsContainer}>
        <TouchableOpacity
          style={dynamicStyles.loginButton}
          onPress={() => router.push('/auth/signin' as any)}
        >
          <Text style={dynamicStyles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={dynamicStyles.registerButton}
          onPress={() => router.push('/auth/signup' as any)}
        >
          <Text style={dynamicStyles.registerButtonText}>Register</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={dynamicStyles.guestButton}
          onPress={handleGuestMode}
        >
          <Text style={dynamicStyles.guestButtonText}>Continue as guest</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
