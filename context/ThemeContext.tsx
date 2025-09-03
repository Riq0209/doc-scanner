import { Colors } from '@/constants/Colors';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  
  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';
  
  const colors = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    loadThemeMode();
  }, []);

  const loadThemeMode = async () => {
    try {
      const stored = await AsyncStorage.getItem('theme_mode');
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setThemeModeState(stored as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme mode:', error);
    }
  };

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('theme_mode', mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
  }, []);

  return useMemo(() => ({
    themeMode,
    isDark,
    colors,
    setThemeMode,
  }), [themeMode, isDark, colors, setThemeMode]);
});