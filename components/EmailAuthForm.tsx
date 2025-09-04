import { Eye, EyeOff, Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface EmailAuthFormProps {
  onSuccess?: () => void;
}

type AuthMode = 'signin' | 'signup' | 'reset';

export default function EmailAuthForm({ onSuccess }: EmailAuthFormProps) {
  const { colors } = useTheme();
  const { signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (mode === 'reset') {
      try {
        setLoading(true);
        await resetPassword(email);
        Alert.alert(
          'Reset Email Sent',
          'Please check your email for password reset instructions.',
          [{ text: 'OK', onPress: () => setMode('signin') }]
        );
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to send reset email');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (mode === 'signup') {
      if (!fullName.trim()) {
        Alert.alert('Error', 'Please enter your full name');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
    }

    try {
      setLoading(true);

      if (mode === 'signin') {
        await signInWithEmail(email, password);
        Alert.alert('Success', 'Welcome back!');
      } else {
        await signUpWithEmail(email, password, fullName);
        Alert.alert('Success', 'Account created successfully!');
      }

      onSuccess?.();
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${mode === 'signin' ? 'sign in' : 'sign up'}`);
    } finally {
      setLoading(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    form: {
      padding: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 6,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 28,
      textAlign: 'center',
      lineHeight: 20,
    },
    inputContainer: {
      marginBottom: 18,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 6,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.cardBackground,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    inputWrapperFocused: {
      borderColor: colors.tint,
      borderWidth: 2,
    },
    inputIcon: {
      paddingLeft: 14,
      paddingRight: 10,
      paddingVertical: 12,
    },
    input: {
      flex: 1,
      height: 50,
      fontSize: 16,
      color: colors.text,
      paddingRight: 12,
      paddingVertical: 12,
    },
    passwordToggle: {
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    submitButton: {
      backgroundColor: colors.tint,
      borderRadius: 14,
      height: 52,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 12,
      flexDirection: 'row',
      ...Platform.select({
        ios: {
          shadowColor: colors.tint,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    submitButtonDisabled: {
      backgroundColor: colors.border,
      shadowOpacity: 0,
      elevation: 0,
    },
    submitButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      marginRight: 8,
    },
    switchModeContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 28,
      paddingHorizontal: 20,
    },
    switchModeText: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    switchModeButton: {
      marginLeft: 4,
      paddingVertical: 4,
      paddingHorizontal: 4,
    },
    switchModeButtonText: {
      fontSize: 14,
      color: colors.tint,
      fontWeight: '700',
    },
    forgotPasswordButton: {
      alignSelf: 'center',
      marginTop: 20,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    forgotPasswordText: {
      fontSize: 14,
      color: colors.tint,
      fontWeight: '600',
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 24,
      marginHorizontal: 20,
    },
  });

  const getTitle = () => {
    switch (mode) {
      case 'signin': return 'Welcome Back';
      case 'signup': return 'Create Account';
      case 'reset': return 'Reset Password';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'signin': return 'Sign in to access your documents';
      case 'signup': return 'Join us to sync your documents';
      case 'reset': return 'Enter your email to reset password';
    }
  };

  const getSubmitText = () => {
    switch (mode) {
      case 'signin': return 'Sign In';
      case 'signup': return 'Create Account';
      case 'reset': return 'Send Reset Email';
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={dynamicStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={dynamicStyles.form}>
        <Text style={dynamicStyles.title}>{getTitle()}</Text>
        <Text style={dynamicStyles.subtitle}>{getSubtitle()}</Text>

        {mode === 'signup' && (
          <View style={dynamicStyles.inputContainer}>
            <Text style={dynamicStyles.label}>Full Name</Text>
            <View style={[
              dynamicStyles.inputWrapper,
              focusedInput === 'fullName' && dynamicStyles.inputWrapperFocused
            ]}>
              <View style={dynamicStyles.inputIcon}>
                <Mail size={20} color={focusedInput === 'fullName' ? colors.tint : colors.textSecondary} />
              </View>
              <TextInput
                style={dynamicStyles.input}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textSecondary}
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setFocusedInput('fullName')}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>
          </View>
        )}

        <View style={dynamicStyles.inputContainer}>
          <Text style={dynamicStyles.label}>Email Address</Text>
          <View style={[
            dynamicStyles.inputWrapper,
            focusedInput === 'email' && dynamicStyles.inputWrapperFocused
          ]}>
            <View style={dynamicStyles.inputIcon}>
              <Mail size={20} color={focusedInput === 'email' ? colors.tint : colors.textSecondary} />
            </View>
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

        {mode !== 'reset' && (
          <View style={dynamicStyles.inputContainer}>
            <Text style={dynamicStyles.label}>Password</Text>
            <View style={[
              dynamicStyles.inputWrapper,
              focusedInput === 'password' && dynamicStyles.inputWrapperFocused
            ]}>
              <View style={dynamicStyles.inputIcon}>
                <Lock size={20} color={focusedInput === 'password' ? colors.tint : colors.textSecondary} />
              </View>
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
                {showPassword ? 
                  <EyeOff size={20} color={focusedInput === 'password' ? colors.tint : colors.textSecondary} /> : 
                  <Eye size={20} color={focusedInput === 'password' ? colors.tint : colors.textSecondary} />
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        {mode === 'signup' && (
          <View style={dynamicStyles.inputContainer}>
            <Text style={dynamicStyles.label}>Confirm Password</Text>
            <View style={[
              dynamicStyles.inputWrapper,
              focusedInput === 'confirmPassword' && dynamicStyles.inputWrapperFocused
            ]}>
              <View style={dynamicStyles.inputIcon}>
                <Lock size={20} color={focusedInput === 'confirmPassword' ? colors.tint : colors.textSecondary} />
              </View>
              <TextInput
                style={dynamicStyles.input}
                placeholder="Confirm your password"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setFocusedInput('confirmPassword')}
                onBlur={() => setFocusedInput(null)}
                secureTextEntry={!showConfirmPassword}
                autoComplete="password"
              />
              <TouchableOpacity
                style={dynamicStyles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? 
                  <EyeOff size={20} color={focusedInput === 'confirmPassword' ? colors.tint : colors.textSecondary} /> : 
                  <Eye size={20} color={focusedInput === 'confirmPassword' ? colors.tint : colors.textSecondary} />
                }
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[
            dynamicStyles.submitButton,
            loading && dynamicStyles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={dynamicStyles.submitButtonText}>{getSubmitText()}</Text>
          {loading && <ActivityIndicator size="small" color="#fff" />}
        </TouchableOpacity>

        {mode === 'signin' && (
          <TouchableOpacity
            style={dynamicStyles.forgotPasswordButton}
            onPress={() => setMode('reset')}
          >
            <Text style={dynamicStyles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

        <View style={dynamicStyles.divider} />

        <View style={dynamicStyles.switchModeContainer}>
          <Text style={dynamicStyles.switchModeText}>
            {mode === 'signin' ? "Don't have an account?" : 
             mode === 'signup' ? "Already have an account?" : 
             "Remember your password?"}
          </Text>
          <TouchableOpacity
            style={dynamicStyles.switchModeButton}
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            <Text style={dynamicStyles.switchModeButtonText}>
              {mode === 'signin' ? 'Sign Up' : 
               mode === 'signup' ? 'Sign In' : 
               'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}
