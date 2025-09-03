import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Camera,
  ChevronRight,
  FileText,
  Info,
  Moon,
  Settings as SettingsIcon,
  Smartphone,
  Sun,
  Trash2
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
  View,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type AppSettings = {
  autoSave: boolean;
  highQuality: boolean;
  hapticFeedback: boolean;
  autoFlash: boolean;
};

const DEFAULT_SETTINGS: AppSettings = {
  autoSave: true,
  highQuality: true,
  hapticFeedback: true,
  autoFlash: false,
};

export default function SettingsScreen() {
  const { colors, themeMode, setThemeMode } = useTheme();
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

  const SettingItem = ({
    icon,
    title,
    subtitle,
    value,
    onValueChange,
    showChevron = false,
    onPress,
    isLast = false,
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    value?: boolean;
    onValueChange?: (value: boolean) => void;
    showChevron?: boolean;
    onPress?: () => void;
    isLast?: boolean;
  }) => (
    <TouchableOpacity
      style={[dynamicStyles.settingItem, isLast && dynamicStyles.settingItemLast]}
      onPress={onPress}
      disabled={!onPress && !onValueChange}
    >
      <View style={styles.settingLeft}>
        <View style={dynamicStyles.iconContainer}>{icon}</View>
        <View style={styles.settingText}>
          <Text style={dynamicStyles.settingTitle}>{title}</Text>
          {subtitle && <Text style={dynamicStyles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.settingRight}>
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
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    settingItemLast: {
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
    settingTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 2,
    },
    settingSubtitle: {
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
          <SettingsIcon size={24} color={colors.tint} />
          <Text style={dynamicStyles.headerTitle}>Settings</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={dynamicStyles.sectionHeader}>Appearance</Text>
        <View style={dynamicStyles.section}>
          <SettingItem
            icon={getThemeIcon()}
            title="Dark Mode"
            subtitle={`Currently using ${getThemeLabel().toLowerCase()} theme`}
            value={themeMode === 'dark'}
            onValueChange={toggleTheme}
            isLast={true}
          />
        </View>

        <Text style={dynamicStyles.sectionHeader}>Camera</Text>
        <View style={dynamicStyles.section}>
          <SettingItem
            icon={<Camera size={20} color={colors.tint} />}
            title="High Quality"
            subtitle="Capture images in higher resolution"
            value={settings.highQuality}
            onValueChange={(value) => saveSettings({ ...settings, highQuality: value })}
          />
          <SettingItem
            icon={<Camera size={20} color={colors.tint} />}
            title="Auto Flash"
            subtitle="Automatically use flash in low light"
            value={settings.autoFlash}
            onValueChange={(value) => saveSettings({ ...settings, autoFlash: value })}
            isLast={true}
          />
        </View>

        <Text style={dynamicStyles.sectionHeader}>Documents</Text>
        <View style={dynamicStyles.section}>
          <SettingItem
            icon={<FileText size={20} color={colors.success} />}
            title="Auto Save"
            subtitle="Automatically save scanned documents"
            value={settings.autoSave}
            onValueChange={(value) => saveSettings({ ...settings, autoSave: value })}
            isLast={true}
          />
        </View>

        <Text style={dynamicStyles.sectionHeader}>Experience</Text>
        <View style={dynamicStyles.section}>
          <SettingItem
            icon={<Smartphone size={20} color={colors.warning} />}
            title="Haptic Feedback"
            subtitle="Vibrate on button presses"
            value={settings.hapticFeedback}
            onValueChange={(value) => saveSettings({ ...settings, hapticFeedback: value })}
            isLast={true}
          />
        </View>

        <Text style={dynamicStyles.sectionHeader}>Storage</Text>
        <View style={dynamicStyles.section}>
          <SettingItem
            icon={<FileText size={20} color={colors.textSecondary} />}
            title="Storage Used"
            subtitle={storageUsed}
            showChevron={false}
          />
          <SettingItem
            icon={<Trash2 size={20} color={colors.destructive} />}
            title="Clear All Data"
            subtitle="Delete all scans and reset settings"
            onPress={clearAllData}
            showChevron={true}
            isLast={true}
          />
        </View>

        <Text style={dynamicStyles.sectionHeader}>About</Text>
        <View style={dynamicStyles.section}>
          <SettingItem
            icon={<Info size={20} color={colors.tint} />}
            title="About App"
            subtitle="Version and information"
            onPress={showAbout}
            showChevron={true}
            isLast={true}
          />
        </View>

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
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    padding: 32,
    alignItems: 'center',
  },
});