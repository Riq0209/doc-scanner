import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
    Bell,
    Camera,
    ChevronRight,
    FileText,
    Globe,
    Info,
    Lock,
    LogOut,
    Moon,
    Settings as SettingsIcon,
    Shield,
    Smartphone,
    Sun,
    Trash2,
    User,
    UserCircle
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { DatabaseService } from '../../lib/database';

type AppSettings = {
  autoSave: boolean;
  highQuality: boolean;
  hapticFeedback: boolean;
  autoFlash: boolean;
  notifications: boolean;
};

const DEFAULT_SETTINGS: AppSettings = {
  autoSave: true,
  highQuality: true,
  hapticFeedback: true,
  autoFlash: false,
  notifications: true,
};

export default function ProfileScreen() {
  const { colors, themeMode, setThemeMode } = useTheme();
  const { user, signOut, isGuest } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [storageUsed, setStorageUsed] = useState<string>('0 MB');

  useEffect(() => {
    loadSettings();
    calculateStorageUsed();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('app_settings');
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem('app_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const calculateStorageUsed = async () => {
    try {
      const history = await AsyncStorage.getItem('scan_history');
      if (history) {
        const sizeInBytes = new Blob([history]).size;
        const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
        setStorageUsed(`${sizeInMB} MB`);
      }
    } catch (error) {
      console.error('Failed to calculate storage:', error);
    }
  };

  const clearAllData = async () => {
    Alert.alert(
      'Clear All Data',
      'This will delete all your scanned documents and reset settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear cloud data if user is authenticated
              if (user) {
                await DatabaseService.clearAllHistory();
              }
              // Clear local data
              await AsyncStorage.multiRemove(['scan_history', 'app_settings']);
              setSettings(DEFAULT_SETTINGS);
              setStorageUsed('0 MB');
              Alert.alert('Success', 'All data has been cleared');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    console.log('🔐 Sign out button pressed');
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => console.log('🚫 Sign out cancelled')
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🔄 User confirmed sign out');
              await signOut();
              console.log('✅ Sign out completed successfully');
            } catch (error) {
              console.error('❌ Sign out failed:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSignIn = () => {
    try {
      console.log('🔐 User requesting sign in from profile tab');
      console.log('🔐 Navigating back to login page...');
      
      // Navigate back to login page - same as app startup flow
      router.replace('/login');
      
      console.log('🔐 Navigation to login completed');
    } catch (error) {
      console.error('🔐 Navigation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Navigation Error', `Failed to open login: ${errorMessage}`);
    }
  };

  const showAbout = () => {
    Alert.alert(
      'Document Scanner',
      'Version 1.0.0\n\nA powerful OCR scanner that extracts text from images using AI technology.\n\nBuilt with React Native and Expo.',
      [{ text: 'OK' }]
    );
  };

  const toggleTheme = () => {
    const newTheme = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newTheme);
  };

  const getThemeIcon = () => {
    return themeMode === 'dark' ? 
      <Moon size={20} color="#5E5CE6" /> : 
      <Sun size={20} color={colors.warning} />;
  };

  const getThemeLabel = () => {
    return themeMode === 'dark' ? 'Dark' : 'Light';
  };

  const ProfileItem = ({
    icon,
    title,
    subtitle,
    value,
    onValueChange,
    showChevron = false,
    onPress,
    isLast = false,
    destructive = false,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    showChevron?: boolean;
    onPress?: () => void;
    isLast?: boolean;
    destructive?: boolean;
  }) => (
    <TouchableOpacity
      style={[dynamicStyles.profileItem, isLast && dynamicStyles.profileItemLast]}
      onPress={onPress}
      disabled={!onPress && !onValueChange}
    >
      <View style={styles.profileLeft}>
        <View style={dynamicStyles.iconContainer}>{icon}</View>
        <View style={styles.profileText}>
          <Text style={[dynamicStyles.profileTitle, destructive && { color: colors.destructive }]}>{title}</Text>
          {subtitle && <Text style={dynamicStyles.profileSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.profileRight}>
        {onValueChange && (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: colors.border, true: colors.tint }}
            thumbColor={Platform.OS === 'ios' ? '#fff' : value ? '#fff' : '#f4f3f4'}
          />
        )}
        {showChevron && <ChevronRight size={20} color={colors.textSecondary} />}
      </View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={dynamicStyles.sectionHeader}>{title}</Text>
  );

  const ProfileHeader = () => (
    <View style={dynamicStyles.profileHeader}>
      <View style={dynamicStyles.avatarContainer}>
        <UserCircle size={80} color={user ? colors.tint : colors.textSecondary} />
      </View>
      <View style={dynamicStyles.profileInfo}>
        <Text style={dynamicStyles.profileName}>
          {user?.user_metadata?.full_name || user?.email || 'Guest User'}
        </Text>
        <Text style={dynamicStyles.profileEmail}>
          {user 
            ? (user.email || 'Signed in with Google') 
            : isGuest 
              ? 'Using guest mode - Sign in to sync data' 
              : 'Not signed in'}
        </Text>
        {user && (
          <View style={dynamicStyles.accountBadge}>
            <Shield size={12} color={colors.success} />
            <Text style={dynamicStyles.accountBadgeText}>Verified Account</Text>
          </View>
        )}
        {isGuest && (
          <View style={[dynamicStyles.accountBadge, { backgroundColor: colors.warning + '20' }]}>
            <Info size={12} color={colors.warning} />
            <Text style={[dynamicStyles.accountBadgeText, { color: colors.warning }]}>Guest Mode</Text>
          </View>
        )}
      </View>
    </View>
  );

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      backgroundColor: colors.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    profileHeader: {
      backgroundColor: colors.cardBackground,
      padding: 24,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatarContainer: {
      marginBottom: 16,
    },
    profileInfo: {
      alignItems: 'center',
    },
    profileName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    accountBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success + '20',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    accountBadgeText: {
      fontSize: 12,
      color: colors.success,
      fontWeight: '600',
      marginLeft: 4,
    },
    sectionHeader: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: 32,
      marginBottom: 8,
      marginHorizontal: 16,
    },
    section: {
      backgroundColor: colors.cardBackground,
      marginHorizontal: 16,
      borderRadius: 12,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    profileItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    profileItemLast: {
      borderBottomWidth: 0,
    },
    iconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    profileTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 2,
    },
    profileSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    footerText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <View style={styles.headerLeft}>
          <User size={24} color={colors.tint} />
          <Text style={dynamicStyles.headerTitle}>Profile</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileHeader />

        {user && (
          <>
            <Text style={dynamicStyles.sectionHeader}>Account Settings</Text>
            <View style={dynamicStyles.section}>
              <ProfileItem
                icon={<User size={20} color={colors.tint} />}
                title="Personal Information"
                subtitle="Edit your profile details"
                showChevron={true}
                onPress={() => Alert.alert('Feature Coming Soon', 'Profile editing will be available in a future update.')}
              />
              <ProfileItem
                icon={<Lock size={20} color={colors.tint} />}
                title="Privacy & Security"
                subtitle="Manage your privacy settings"
                showChevron={true}
                onPress={() => Alert.alert('Feature Coming Soon', 'Privacy settings will be available soon.')}
              />
              <ProfileItem
                icon={<Bell size={20} color={colors.tint} />}
                title="Notifications"
                subtitle="Get notified about scan completions"
                value={settings.notifications}
                onValueChange={(value) => saveSettings({ ...settings, notifications: value })}
                isLast={true}
              />
            </View>
          </>
        )}

        <Text style={dynamicStyles.sectionHeader}>App Preferences</Text>
        <View style={dynamicStyles.section}>
          <ProfileItem
            icon={getThemeIcon()}
            title="Dark Mode"
            subtitle={`Currently using ${getThemeLabel().toLowerCase()} theme`}
            value={themeMode === 'dark'}
            onValueChange={toggleTheme}
          />
          <ProfileItem
            icon={<Globe size={20} color={colors.tint} />}
            title="Language"
            subtitle="English (US)"
            showChevron={true}
            onPress={() => Alert.alert('Feature Coming Soon', 'Language selection will be available soon.')}
          />
          <ProfileItem
            icon={<Smartphone size={20} color={colors.warning} />}
            title="Haptic Feedback"
            subtitle="Vibrate on button presses"
            value={settings.hapticFeedback}
            onValueChange={(value) => saveSettings({ ...settings, hapticFeedback: value })}
            isLast={true}
          />
        </View>

        <Text style={dynamicStyles.sectionHeader}>Camera Settings</Text>
        <View style={dynamicStyles.section}>
          <ProfileItem
            icon={<Camera size={20} color={colors.tint} />}
            title="High Quality"
            subtitle="Capture images in higher resolution"
            value={settings.highQuality}
            onValueChange={(value) => saveSettings({ ...settings, highQuality: value })}
          />
          <ProfileItem
            icon={<Camera size={20} color={colors.tint} />}
            title="Auto Flash"
            subtitle="Automatically use flash in low light"
            value={settings.autoFlash}
            onValueChange={(value) => saveSettings({ ...settings, autoFlash: value })}
          />
          <ProfileItem
            icon={<FileText size={20} color={colors.success} />}
            title="Auto Save"
            subtitle="Automatically save scanned documents"
            value={settings.autoSave}
            onValueChange={(value) => saveSettings({ ...settings, autoSave: value })}
            isLast={true}
          />
        </View>

        <Text style={dynamicStyles.sectionHeader}>Data & Storage</Text>
        <View style={dynamicStyles.section}>
          <ProfileItem
            icon={<FileText size={20} color={colors.textSecondary} />}
            title="Storage Used"
            subtitle={storageUsed}
            showChevron={false}
          />
          <ProfileItem
            icon={<Trash2 size={20} color={colors.destructive} />}
            title="Clear All Data"
            subtitle="Delete all scans and reset settings"
            onPress={clearAllData}
            showChevron={true}
            destructive={true}
            isLast={true}
          />
        </View>

        <Text style={dynamicStyles.sectionHeader}>Support</Text>
        <View style={dynamicStyles.section}>
          <ProfileItem
            icon={<Info size={20} color={colors.tint} />}
            title="About App"
            subtitle="Version and information"
            onPress={showAbout}
            showChevron={true}
          />
          <ProfileItem
            icon={<SettingsIcon size={20} color={colors.tint} />}
            title="Help & Support"
            subtitle="Get help with the app"
            showChevron={true}
            onPress={() => Alert.alert('Help & Support', 'For support, please contact us at support@docscanner.com')}
            isLast={!user}
          />
          {user && (
            <ProfileItem
              icon={<LogOut size={20} color={colors.destructive} />}
              title="Sign Out"
              subtitle="Sign out of your account"
              onPress={handleSignOut}
              showChevron={true}
              destructive={true}
              isLast={true}
            />
          )}
        </View>

        {!user && !isGuest && (
          <>
            <Text style={dynamicStyles.sectionHeader}>Authentication</Text>
            <View style={dynamicStyles.section}>
              <ProfileItem
                icon={<User size={20} color={colors.tint} />}
                title="Sign In"
                subtitle="Sign in to access all features"
                showChevron={true}
                onPress={handleSignIn}
                isLast={true}
              />
            </View>
          </>
        )}

        {isGuest && (
          <>
            <Text style={dynamicStyles.sectionHeader}>Account</Text>
            <View style={dynamicStyles.section}>
              <ProfileItem
                icon={<User size={20} color={colors.tint} />}
                title="Sign In"
                subtitle="Sync your data across all devices"
                showChevron={true}
                onPress={handleSignIn}
              />
              <ProfileItem
                icon={<Shield size={20} color={colors.success} />}
                title="Why Sign In?"
                subtitle="Access your scans from any device, automatic cloud backup"
                showChevron={true}
                onPress={() => Alert.alert(
                  'Benefits of Signing In',
                  '✅ Sync data across all your devices\n✅ Automatic cloud backup\n✅ Never lose your scans\n✅ Access history from anywhere\n✅ Enhanced security',
                  [{ text: 'Got it!' }]
                )}
                isLast={true}
              />
            </View>
          </>
        )}

        <View style={styles.footer}>
          <Text style={dynamicStyles.footerText}>
            Version 1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  content: {
    flex: 1,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileText: {
    flex: 1,
  },
  profileRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
});
