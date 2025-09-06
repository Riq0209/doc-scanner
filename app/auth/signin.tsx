import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function SignInScreen() {
  const { colors } = useTheme();
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await signInWithEmail(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('❌ Sign in failed:', error);
      Alert.alert('Error', error.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('❌ Google sign in failed:', error);
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 24,
      paddingTop: 20,
      paddingBottom: 30,
    },
    backButton: {
      padding: 8,
      marginRight: 16,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 40,
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 8,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      height: 52,
    },
    inputWrapperFocused: {
      borderColor: colors.tint,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
    },
    passwordToggle: {
      padding: 8,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginBottom: 32,
    },
    forgotPasswordText: {
      fontSize: 14,
      color: colors.tint,
    },
    loginButton: {
      backgroundColor: colors.text,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 24,
      flexDirection: 'row',
      justifyContent: 'center',
    },
    loginButtonDisabled: {
      opacity: 0.6,
    },
    loginButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.background,
      marginRight: 8,
    },
    orContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    orLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    orText: {
      paddingHorizontal: 16,
      fontSize: 14,
      color: colors.textSecondary,
    },
    socialContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 32,
    },
    socialButton: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    bottomText: {
      textAlign: 'center',
      fontSize: 14,
      color: colors.textSecondary,
    },
    signUpLink: {
      color: colors.tint,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={dynamicStyles.header}>
              <TouchableOpacity
                style={dynamicStyles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={dynamicStyles.content}>
          <Text style={dynamicStyles.title}>Welcome back!</Text>
          <Text style={dynamicStyles.subtitle}>Sign in to continue</Text>

          <View style={dynamicStyles.inputContainer}>
            <Text style={dynamicStyles.label}>Enter your email</Text>
            <View style={[
              dynamicStyles.inputWrapper,
              focusedInput === 'email' && dynamicStyles.inputWrapperFocused
            ]}>
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color={focusedInput === 'email' ? colors.tint : colors.textSecondary} 
              />
              <TextInput
                style={dynamicStyles.input}
                placeholder="Enter your email"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          <View style={dynamicStyles.inputContainer}>
            <Text style={dynamicStyles.label}>Enter your password</Text>
            <View style={[
              dynamicStyles.inputWrapper,
              focusedInput === 'password' && dynamicStyles.inputWrapperFocused
            ]}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color={focusedInput === 'password' ? colors.tint : colors.textSecondary} 
              />
              <TextInput
                style={dynamicStyles.input}
                placeholder="Enter your password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
                secureTextEntry={!showPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                style={dynamicStyles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={focusedInput === 'password' ? colors.tint : colors.textSecondary} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={dynamicStyles.forgotPassword}>
            <Text style={dynamicStyles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              dynamicStyles.loginButton,
              loading && dynamicStyles.loginButtonDisabled
            ]}
            onPress={handleEmailSignIn}
            disabled={loading}
          >
            <Text style={dynamicStyles.loginButtonText}>Login</Text>
            {loading && <ActivityIndicator size="small" color={colors.background} />}
          </TouchableOpacity>

          <View style={dynamicStyles.orContainer}>
            <View style={dynamicStyles.orLine} />
            <Text style={dynamicStyles.orText}>Or Login with</Text>
            <View style={dynamicStyles.orLine} />
          </View>

          <View style={dynamicStyles.socialContainer}>
            <TouchableOpacity 
              style={dynamicStyles.socialButton}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={24} color="#DB4437" />
            </TouchableOpacity>
          </View>

          <Text style={dynamicStyles.bottomText}>
            Don't have an account?{' '}
            <Text 
              style={dynamicStyles.signUpLink}
              onPress={() => router.replace('signup' as any)}
            >
              Register Now
            </Text>
          </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}
