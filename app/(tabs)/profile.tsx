import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
=======
>>>>>>> de075df89583d38d6804d69a1509670f7999158d
  Bell,
  Camera,
  ChevronRight,
  FileText,
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
<<<<<<< HEAD
  UserCircle,
  X
>>>>>>> 9aadd63 (fix bug)
=======
  UserCircle
>>>>>>> de075df89583d38d6804d69a1509670f7999158d
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
<<<<<<< HEAD
<<<<<<< HEAD
    Alert,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
=======
  Alert,
  Image,
  Modal,
=======
  Alert,
>>>>>>> de075df89583d38d6804d69a1509670f7999158d
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
<<<<<<< HEAD
  TextInput,
  TouchableOpacity,
  View
>>>>>>> 9aadd63 (fix bug)
=======
  TouchableOpacity,
  View
>>>>>>> de075df89583d38d6804d69a1509670f7999158d
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
  const [storageInfo, setStorageInfo] = useState<{
    total: string;
    scans: number;
    pdfs: number;
    isCalculating: boolean;
  }>({
    total: '0 MB',
    scans: 0,
    pdfs: 0,
    isCalculating: false,
  });
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  const [showPersonalInfoModal, setShowPersonalInfoModal] = useState(false);
  const [editingName, setEditingName] = useState<string>('');
  const [tempProfilePicture, setTempProfilePicture] = useState<string | null>(null);
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);

  useEffect(() => {
    loadSettings();
    loadProfileData();
    calculateStorageUsed();
  }, [user, isGuest]); // Recalculate when user state changes

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

  const loadProfileData = async () => {
    try {
      // Only load profile data for authenticated users
      if (user) {
        const storedPicture = await AsyncStorage.getItem('profile_picture');
        const storedName = await AsyncStorage.getItem('display_name');

        if (storedPicture) {
          setProfilePicture(storedPicture);
        }
        if (storedName) {
          setDisplayName(storedName);
        } else {
          // Set default display name from user data
          const defaultName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
          setDisplayName(defaultName);
        }
      } else {
        // Clear profile data for guest users
        setProfilePicture(null);
        setDisplayName('');
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
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

  // Memoized handlers to prevent unnecessary re-renders
  const handleNotificationsChange = useCallback((value: boolean) => {
    saveSettings({ ...settings, notifications: value });
  }, [settings]);

  const handleHapticFeedbackChange = useCallback((value: boolean) => {
    saveSettings({ ...settings, hapticFeedback: value });
  }, [settings]);

  const handleHighQualityChange = useCallback((value: boolean) => {
    saveSettings({ ...settings, highQuality: value });
  }, [settings]);

  const handleAutoFlashChange = useCallback((value: boolean) => {
    saveSettings({ ...settings, autoFlash: value });
  }, [settings]);

  const handleAutoSaveChange = useCallback((value: boolean) => {
    saveSettings({ ...settings, autoSave: value });
  }, [settings]);

  const handleThemeChange = useCallback((value: boolean) => {
    const newTheme = value ? 'dark' : 'light';
    setThemeMode(newTheme);
  }, []);

  // Memoized Switch component to prevent visual glitches
  const MemoizedSwitch = React.memo(({ value, onValueChange, title }: { 
    value: boolean; 
    onValueChange: (value: boolean) => void; 
    title: string 
  }) => (
    <Switch
      key={title}
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: colors.border, true: colors.tint }}
      thumbColor={Platform.OS === 'ios' ? '#fff' : value ? '#fff' : '#f4f3f4'}
    />
  ));

  const calculateStorageUsed = async () => {
    try {
      setStorageInfo(prev => ({ ...prev, isCalculating: true }));

      let localSize = 0;
      let cloudSize = 0;
      let scanCount = 0;
      let pdfCount = 0;

      // Calculate local storage (AsyncStorage)
      try {
        const keys = await AsyncStorage.getAllKeys();
        for (const key of keys) {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            localSize += new Blob([value]).size;
          }
        }
      } catch (error) {
        console.error('Error calculating local storage:', error);
      }

      // Calculate cloud storage if user is authenticated
      if (user && !isGuest) {
        try {
          // Get all history to calculate cloud storage
          const result = await DatabaseService.getAllHistory(1000); // Get more items for accurate calculation
          if (result.success && result.data) {
            for (const item of result.data) {
              if (item.type === 'scan') {
                scanCount++;
                // Estimate image size (average ~500KB per high-quality scan)
                cloudSize += 500 * 1024; // 500KB in bytes
              } else if (item.type === 'pdf') {
                pdfCount++;
                // Estimate PDF size based on page count (average ~100KB per page)
                cloudSize += (item.page_count || 1) * 100 * 1024; // 100KB per page in bytes
              }
            }
          }
        } catch (error) {
          console.error('Error calculating cloud storage:', error);
        }
      }

      // Convert to MB
      const totalSizeMB = ((localSize + cloudSize) / (1024 * 1024)).toFixed(2);

      setStorageInfo({
        total: `${totalSizeMB} MB`,
        scans: scanCount,
        pdfs: pdfCount,
        isCalculating: false,
      });
    } catch (error) {
      console.error('Failed to calculate storage:', error);
      setStorageInfo(prev => ({ ...prev, isCalculating: false }));
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
              setStorageInfo({
                total: '0 MB',
                scans: 0,
                pdfs: 0,
                isCalculating: false,
              });
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

  const pickImage = async () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to change your profile picture.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: handleSignIn }
        ]
      );
      return;
    }

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos');
        return;
      }

      // Show options to choose from camera or gallery
      Alert.alert(
        'Select Profile Picture',
        'Choose how to select your profile picture',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Take Photo',
            onPress: async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission needed', 'Please grant camera permission');
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled) {
                const imageUri = result.assets[0].uri;
                setTempProfilePicture(imageUri); // Only set temporary, don't save yet
                setIsRemovingPhoto(false); // Reset removal flag when selecting new photo
              }
            },
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled) {
                const imageUri = result.assets[0].uri;
                setTempProfilePicture(imageUri); // Only set temporary, don't save yet
                setIsRemovingPhoto(false); // Reset removal flag when selecting new photo
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const saveProfileChanges = async () => {
    try {
      let hasChanges = false;

      // Save display name if changed
      if (editingName.trim() && editingName.trim() !== displayName) {
        setDisplayName(editingName.trim());
        await AsyncStorage.setItem('display_name', editingName.trim());
        hasChanges = true;
      }

      // Handle profile picture changes
      if (tempProfilePicture !== null && tempProfilePicture !== profilePicture) {
        // New photo selected
        setProfilePicture(tempProfilePicture);
        await AsyncStorage.setItem('profile_picture', tempProfilePicture);
        hasChanges = true;
      } else if (tempProfilePicture === null && profilePicture !== null) {
        // Photo removed
        setProfilePicture(null);
        await AsyncStorage.removeItem('profile_picture');
        hasChanges = true;
      }

      if (hasChanges) {
        setShowPersonalInfoModal(false);
        setTempProfilePicture(null); // Clear temporary state
        setIsRemovingPhoto(false); // Reset removal flag
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('No Changes', 'No changes were made to save.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile changes. Please try again.');
    }
  };

  const removeProfilePicture = async () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to access personal information settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: handleSignIn }
        ]
      );
      return;
    }

    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture? This will be applied when you save your changes.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setTempProfilePicture(null);
            setIsRemovingPhoto(true);
            // Removed alert - user sees immediate visual feedback
          }
        }
      ]
    );
  };

  const openPersonalInfoModal = () => {
    if (!user) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to access personal information settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: handleSignIn }
        ]
      );
      return;
    }
    setEditingName(displayName);
    setTempProfilePicture(null); // Reset temporary profile picture
    setIsRemovingPhoto(false); // Reset removal flag
    setShowPersonalInfoModal(true);
  };

  const ProfileItem = React.memo(({
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
        {onValueChange && value !== undefined && (
          <MemoizedSwitch
            value={value}
            onValueChange={onValueChange}
            title={title}
          />
        )}
        {showChevron && <ChevronRight size={20} color={colors.textSecondary} />}
      </View>
    </TouchableOpacity>
  ));

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={dynamicStyles.sectionHeader}>{title}</Text>
  );

  const ProfileHeader = () => (
    <View style={dynamicStyles.profileHeader}>
      <TouchableOpacity
        style={dynamicStyles.avatarContainer}
        onPress={user ? openPersonalInfoModal : undefined}
        activeOpacity={0.8}
      >
        {profilePicture ? (
          <Image source={{ uri: profilePicture }} style={dynamicStyles.profileImage} />
        ) : (
          <View style={dynamicStyles.profileImagePlaceholder}>
            <UserCircle size={80} color={user ? colors.tint : colors.textSecondary} />
          </View>
        )}
        {user && (
          <View style={dynamicStyles.editBadge}>
            <Camera size={16} color={colors.cardBackground} />
          </View>
        )}
      </TouchableOpacity>
      <View style={dynamicStyles.profileInfo}>
        <Text style={dynamicStyles.profileName}>
          {displayName || user?.user_metadata?.full_name || user?.email || (isGuest ? 'Guest User' : 'Welcome!')}
        </Text>
        <Text style={dynamicStyles.profileEmail}>
          {user
            ? (user.email || 'Signed in with Google')
            : isGuest
              ? 'Sign in to access more features'
              : 'Not signed in'}
        </Text>
        {user && (
          <View style={dynamicStyles.accountBadge}>
            <Shield size={12} color={colors.success} />
            <Text style={dynamicStyles.accountBadgeText}>Verified Account</Text>
          </View>
        )}
        {isGuest && (
          <View style={[dynamicStyles.accountBadge, { backgroundColor: colors.warning + '20', borderColor: colors.warning }]}>
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
      padding: 32,
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      position: 'relative',
    },
    avatarContainer: {
      marginBottom: 16,
      position: 'relative',
    },
    profileImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 3,
      borderColor: colors.tint,
    },
    profileImagePlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
    },
    editBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.tint,
      borderRadius: 12,
      width: 24,
      height: 24,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.cardBackground,
    },
    editProfileButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.cardBackground,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    profileInfo: {
      alignItems: 'center',
    },
    profileName: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
      letterSpacing: -0.5,
    },
    profileEmail: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 16,
      textAlign: 'center',
      opacity: 0.8,
    },
    accountBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success + '20',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.success + '30',
    },
    accountBadgeText: {
      fontSize: 13,
      color: colors.success,
      fontWeight: '600',
      marginLeft: 6,
      letterSpacing: -0.2,
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
    // Modal styles
    modalContainer: {
      flex: 1,
      backgroundColor: colors.background,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.cardBackground,
    },
    modalCloseButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      letterSpacing: -0.5,
    },
    modalSaveButton: {
      paddingHorizontal: 20,
      paddingVertical: 10,
      backgroundColor: colors.tint,
      borderRadius: 12,
      minWidth: 70,
      alignItems: 'center',
    },
    modalSaveText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.cardBackground,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
      marginHorizontal: 16,
    },
    pictureSection: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    pictureContainer: {
      position: 'relative',
      marginRight: 16,
    },
    largeProfileImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
      borderWidth: 3,
      borderColor: colors.tint,
    },
    placeholderImage: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    cameraOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.tint,
      borderRadius: 16,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.cardBackground,
    },
    pictureActions: {
      flex: 1,
    },
    pictureActionButton: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pictureActionText: {
      fontSize: 16,
      color: colors.tint,
      textAlign: 'center',
      fontWeight: '500',
    },
    inputContainer: {
      marginHorizontal: 16,
      marginBottom: 16,
    },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.background,
    },
    inputHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: 'right',
    },
    // Enhanced Modal styles
    modalSaveButtonDisabled: {
      backgroundColor: colors.border,
    },
    modalSaveTextDisabled: {
      color: colors.textSecondary,
    },
    profilePictureCard: {
      backgroundColor: colors.cardBackground,
      marginHorizontal: 16,
      marginTop: 24,
      borderRadius: 16,
      padding: 20,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    cardHeader: {
      alignItems: 'center',
      marginBottom: 20,
    },
    cardIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.tint + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    cardSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    profilePictureContainer: {
      alignItems: 'center',
    },
    profilePictureWrapper: {
      position: 'relative',
      marginBottom: 20,
    },
    profilePictureLarge: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 4,
      borderColor: colors.tint,
    },
    profilePicturePlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.border,
      borderStyle: 'dashed',
      position: 'relative',
    },
    placeholderOverlay: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: colors.tint,
      borderRadius: 20,
      width: 35,
      height: 35,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.cardBackground,
      margin: 5,
    
    },
    editIndicator: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: colors.tint,
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.cardBackground,
    },
    pictureOptions: {
      width: '100%',
      gap: 12,
    },
    optionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    optionButtonDestructive: {
      borderColor: colors.destructive + '30',
      backgroundColor: colors.destructive + '05',
    },
    optionIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.tint + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    optionText: {
      fontSize: 16,
      color: colors.tint,
      fontWeight: '500',
      flex: 1,
    },
    optionTextDestructive: {
      color: colors.destructive,
    },
    displayNameCard: {
      backgroundColor: colors.cardBackground,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 16,
      padding: 20,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    inputWrapper: {
      width: '100%',
    },
    inputField: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 4,
      marginBottom: 8,
    },
    nameInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      paddingVertical: 12,
    },
    clearButton: {
      padding: 4,
      marginLeft: 8,
    },
    inputFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    characterCount: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    unsavedIndicator: {
      fontSize: 12,
      color: colors.warning,
      fontWeight: '500',
    },
    quickActionsCard: {
      backgroundColor: colors.cardBackground,
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 32,
      borderRadius: 16,
      padding: 20,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    quickActionsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    quickActionButton: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.background,
      paddingVertical: 16,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickActionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.tint + '10',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    quickActionText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: '500',
      textAlign: 'center',
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
                key="personal-info"
                icon={<User size={20} color={colors.tint} />}
                title="Personal Information"
                subtitle="Edit your profile details"
                showChevron={true}
                onPress={openPersonalInfoModal}
              />
              <ProfileItem
                key="privacy-security"
                icon={<Lock size={20} color={colors.tint} />}
                title="Privacy & Security"
                subtitle="Manage your privacy settings"
                showChevron={true}
                onPress={() => Alert.alert('Feature Coming Soon', 'Privacy settings will be available soon.')}
              />
              <ProfileItem
                key="notifications"
                icon={<Bell size={20} color={colors.tint} />}
                title="Notifications"
                subtitle="Get notified about scan completions"
                value={settings.notifications}
                onValueChange={handleNotificationsChange}
                isLast={true}
              />
            </View>
          </>
        )}

        <Text style={dynamicStyles.sectionHeader}>App Preferences</Text>
        <View style={dynamicStyles.section}>
          <ProfileItem
            key="dark-mode"
            icon={getThemeIcon()}
            title="Dark Mode"
            subtitle={`Currently using ${getThemeLabel().toLowerCase()} theme`}
            value={themeMode === 'dark'}
            onValueChange={handleThemeChange}
          />
          <ProfileItem
<<<<<<< HEAD
<<<<<<< HEAD
            icon={<Globe size={20} color={colors.tint} />}
            title="Language"
            subtitle="English (US)"
            showChevron={true}
            onPress={() => Alert.alert('Feature Coming Soon', 'Language selection will be available soon.')}
          />
          <ProfileItem
=======
            key="haptic-feedback"
>>>>>>> 9aadd63 (fix bug)
=======
>>>>>>> de075df89583d38d6804d69a1509670f7999158d
            icon={<Smartphone size={20} color={colors.warning} />}
            title="Haptic Feedback"
            subtitle="Vibrate on button presses"
            value={settings.hapticFeedback}
            onValueChange={handleHapticFeedbackChange}
            isLast={true}
          />
        </View>

        <Text style={dynamicStyles.sectionHeader}>Camera Settings</Text>
        <View style={dynamicStyles.section}>
          <ProfileItem
            key="high-quality"
            icon={<Camera size={20} color={colors.tint} />}
            title="High Quality"
            subtitle="Capture images in higher resolution"
            value={settings.highQuality}
            onValueChange={handleHighQualityChange}
          />
          <ProfileItem
            key="auto-flash"
            icon={<Camera size={20} color={colors.tint} />}
            title="Auto Flash"
            subtitle="Automatically use flash in low light"
            value={settings.autoFlash}
            onValueChange={handleAutoFlashChange}
          />
          <ProfileItem
            key="auto-save"
            icon={<FileText size={20} color={colors.success} />}
            title="Auto Save"
            subtitle="Automatically save scanned documents"
            value={settings.autoSave}
            onValueChange={handleAutoSaveChange}
            isLast={true}
          />
        </View>

        <Text style={dynamicStyles.sectionHeader}>Data & Storage</Text>
        <View style={dynamicStyles.section}>
          <ProfileItem
            key="storage-used"
            icon={<FileText size={20} color={colors.textSecondary} />}
            title="Storage Used"
            subtitle={storageInfo.isCalculating ? 'Calculating...' : `${storageInfo.total} (${storageInfo.scans} scans, ${storageInfo.pdfs} PDFs)`}
            showChevron={false}
            onPress={() => calculateStorageUsed()}
          />
          <ProfileItem
            key="clear-data"
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
            key="about-app"
            icon={<Info size={20} color={colors.tint} />}
            title="About App"
            subtitle="Version and information"
            onPress={showAbout}
            showChevron={true}
          />
          <ProfileItem
            key="help-support"
            icon={<SettingsIcon size={20} color={colors.tint} />}
            title="Help & Support"
            subtitle="Get help with the app"
            showChevron={true}
            onPress={() => Alert.alert('Help & Support', 'For support, please contact us at support@docscanner.com')}
            isLast={!user}
          />
          {user && (
            <ProfileItem
              key="sign-out"
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
                key="sign-in-auth"
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
                key="sign-in-guest"
                icon={<User size={20} color={colors.tint} />}
                title="Sign In"
                subtitle="Sync your data across all devices"
                showChevron={true}
                onPress={handleSignIn}
              />
              <ProfileItem
                key="why-sign-in"
                icon={<Shield size={20} color={colors.success} />}
                title="Why Sign In?"
                subtitle="Access profile customization and cloud backup"
                showChevron={true}
                onPress={() => Alert.alert(
                  'Benefits of Signing In',
                  '✅ Personalize your profile with photo and name\n✅ Sync data across all your devices\n✅ Automatic cloud backup\n✅ Never lose your scans\n✅ Access history from anywhere\n✅ Enhanced security',
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

      {/* Personal Information Modal */}
      <Modal
        visible={showPersonalInfoModal && !!user}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowPersonalInfoModal(false);
          setTempProfilePicture(null); // Reset temporary state on close
          setIsRemovingPhoto(false); // Reset removal flag on close
        }}
      >
        <SafeAreaView style={dynamicStyles.modalContainer}>
          <View style={dynamicStyles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowPersonalInfoModal(false);
                setTempProfilePicture(null); // Reset temporary state on close
                setIsRemovingPhoto(false); // Reset removal flag on close
              }}
              style={dynamicStyles.modalCloseButton}
            >
              <X size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={dynamicStyles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity
              onPress={saveProfileChanges}
              style={[dynamicStyles.modalSaveButton, 
                ((editingName.trim() === displayName || editingName.trim() === '') && 
                 tempProfilePicture === profilePicture) && 
                dynamicStyles.modalSaveButtonDisabled]}
              disabled={(editingName.trim() === displayName || editingName.trim() === '') && 
                       tempProfilePicture === profilePicture}
            >
              <Text style={[dynamicStyles.modalSaveText, 
                ((editingName.trim() === displayName || editingName.trim() === '') && 
                 tempProfilePicture === profilePicture) && 
                dynamicStyles.modalSaveTextDisabled]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Profile Picture Section */}
            <View style={dynamicStyles.profilePictureCard}>
              <View style={dynamicStyles.cardHeader}>
                <View style={dynamicStyles.cardIconContainer}>
                  <Camera size={20} color={colors.tint} />
                </View>
                <Text style={dynamicStyles.cardTitle}>Profile Picture</Text>
                <Text style={dynamicStyles.cardSubtitle}>Tap to change your photo</Text>
              </View>

              <View style={dynamicStyles.profilePictureContainer}>
                <TouchableOpacity
                  style={dynamicStyles.profilePictureWrapper}
                  onPress={pickImage}
                  activeOpacity={0.8}
                >
                  {tempProfilePicture || (profilePicture && !isRemovingPhoto) ? (
                    <Image source={{ uri: tempProfilePicture || profilePicture! }} style={dynamicStyles.profilePictureLarge} />
                  ) : (
                    <View style={dynamicStyles.profilePicturePlaceholder}>
                      <UserCircle size={80} color={colors.textSecondary} />
                      <View style={dynamicStyles.placeholderOverlay}>
                        <Camera size={24} color={colors.textSecondary} />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={dynamicStyles.pictureOptions}>
                  <TouchableOpacity
                    style={dynamicStyles.optionButton}
                    onPress={pickImage}
                    activeOpacity={0.7}
                  >
                    <View style={dynamicStyles.optionIcon}>
                      <Camera size={18} color={colors.tint} />
                    </View>
                    <Text style={dynamicStyles.optionText}>
                      {(!profilePicture || isRemovingPhoto) && !tempProfilePicture ? 'Add Photo' : 'Change Photo'}
                    </Text>
                  </TouchableOpacity>

                  {((tempProfilePicture || profilePicture) && !isRemovingPhoto) && (
                    <TouchableOpacity
                      style={[dynamicStyles.optionButton, dynamicStyles.optionButtonDestructive]}
                      onPress={removeProfilePicture}
                      activeOpacity={0.7}
                    >
                      <View style={dynamicStyles.optionIcon}>
                        <Trash2 size={18} color={colors.destructive} />
                      </View>
                      <Text style={[dynamicStyles.optionText, dynamicStyles.optionTextDestructive]}>
                        Remove Photo
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Display Name Section */}
            <View style={dynamicStyles.displayNameCard}>
              <View style={dynamicStyles.cardHeader}>
                <View style={dynamicStyles.cardIconContainer}>
                  <User size={20} color={colors.tint} />
                </View>
                <Text style={dynamicStyles.cardTitle}>Display Name</Text>
                <Text style={dynamicStyles.cardSubtitle}>How others see you in the app</Text>
              </View>

              <View style={dynamicStyles.inputWrapper}>
                <View style={dynamicStyles.inputField}>
                  <TextInput
                    style={dynamicStyles.nameInput}
                    value={editingName}
                    onChangeText={setEditingName}
                    placeholder="Enter your display name"
                    placeholderTextColor={colors.textSecondary}
                    maxLength={50}
                    autoCapitalize="words"
                    autoCorrect={false}
                    autoFocus={false}
                  />
                  {editingName.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setEditingName('')}
                      style={dynamicStyles.clearButton}
                    >
                      <X size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={dynamicStyles.inputFooter}>
                  <Text style={dynamicStyles.characterCount}>
                    {editingName.length}/50 characters
                  </Text>
                  {editingName.trim() !== displayName && editingName.trim() && (
                    <Text style={dynamicStyles.unsavedIndicator}>Unsaved changes</Text>
                  )}
                  {isRemovingPhoto && (
                    <Text style={dynamicStyles.unsavedIndicator}>Photo will be removed</Text>
                  )}
                  {tempProfilePicture && tempProfilePicture !== profilePicture && (
                    <Text style={dynamicStyles.unsavedIndicator}>New photo selected</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={dynamicStyles.quickActionsCard}>
              <Text style={dynamicStyles.quickActionsTitle}>Quick Actions</Text>
              <View style={dynamicStyles.quickActionsGrid}>
                <TouchableOpacity
                  style={dynamicStyles.quickActionButton}
                  onPress={() => {
                    if (!user) {
                      Alert.alert(
                        'Sign In Required',
                        'Please sign in to access personal information settings.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Sign In', onPress: handleSignIn }
                        ]
                      );
                      return;
                    }
                    setEditingName(displayName);
                    Alert.alert('Reset', 'Display name has been reset to current value');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={dynamicStyles.quickActionIcon}>
                    <User size={20} color={colors.textSecondary} />
                  </View>
                  <Text style={dynamicStyles.quickActionText}>Reset Name</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={dynamicStyles.quickActionButton}
                  onPress={() => {
                    if (!user) {
                      Alert.alert(
                        'Sign In Required',
                        'Please sign in to access personal information settings.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Sign In', onPress: handleSignIn }
                        ]
                      );
                      return;
                    }

                    Alert.alert(
                      'Clear Profile Picture',
                      'Are you sure you want to clear your profile picture? This will be applied when you save your changes.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Clear',
                          style: 'destructive',
                          onPress: () => {
                            setTempProfilePicture(null);
                            setIsRemovingPhoto(true);
                            // Removed alert - user sees immediate visual feedback
                          }
                        }
                      ]
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <View style={dynamicStyles.quickActionIcon}>
                    <Trash2 size={20} color={colors.destructive} />
                  </View>
                  <Text style={dynamicStyles.quickActionText}>Clear Photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  modalContent: {
    flex: 1,
  },
});
