import { useTheme } from '@/context/ThemeContext';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera as CameraIcon, Image as ImageIcon, Scan } from 'lucide-react-native';
import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function HomeScreen() {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to use this feature.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    // Use push for proper navigation stack management
    router.push('/camera-scan' as any);
  };

  const pickFromGallery = async () => {
    console.log('pickFromGallery called');
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
      
      console.log('Image picker result:', {
        canceled: result.canceled,
        assetsLength: result.assets?.length
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('Selected asset:', {
          uri: asset.uri,
          hasBase64: !!asset.base64,
          base64Length: asset.base64?.length
        });
        
        // Go directly to photo-preview with crop capabilities
        console.log('Navigating directly to photo-preview for cropping and OCR...');
        router.push({
          pathname: '/photo-preview',
          params: { 
            photoUri: asset.uri,
            fromGallery: 'true'
          }
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 24,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 16,
      color: colors.tabIconDefault,
      lineHeight: 22,
    },
    scanOption: {
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 24,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    scanOptionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    scanOptionDescription: {
      fontSize: 14,
      color: colors.tabIconDefault,
      lineHeight: 20,
      marginBottom: 20,
    },
    scanButton: {
      backgroundColor: colors.tint,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    scanButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    galleryButton: {
      backgroundColor: 'transparent',
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
      borderWidth: 2,
      borderColor: colors.tint,
    },
    galleryButtonText: {
      color: colors.tint,
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ScrollView style={dynamicStyles.container} showsVerticalScrollIndicator={false}>
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.headerTitle}>Document Scanner</Text>
          <Text style={dynamicStyles.headerSubtitle}>
            Choose how you want to scan your documents
          </Text>
        </View>

        <View style={styles.content}>
          {/* Camera Scan Option */}
          <View style={dynamicStyles.scanOption}>
            <View style={styles.optionHeader}>
              <CameraIcon size={32} color={colors.tint} />
              <Text style={dynamicStyles.scanOptionTitle}>Scan with Camera</Text>
            </View>
            <Text style={dynamicStyles.scanOptionDescription}>
              Use your device's camera to capture documents in real-time. Perfect for scanning physical documents, books, or papers.
            </Text>
            <TouchableOpacity style={dynamicStyles.scanButton} onPress={openCamera}>
              <CameraIcon size={20} color="#fff" />
              <Text style={dynamicStyles.scanButtonText}>Open Camera</Text>
            </TouchableOpacity>
          </View>

          {/* Gallery Scan Option */}
          <View style={dynamicStyles.scanOption}>
            <View style={styles.optionHeader}>
              <ImageIcon size={32} color={colors.tint} />
              <Text style={dynamicStyles.scanOptionTitle}>Scan from Gallery</Text>
            </View>
            <Text style={dynamicStyles.scanOptionDescription}>
              Select existing photos from your gallery to extract text or save as documents. Great for images you've already captured.
            </Text>
            <TouchableOpacity style={dynamicStyles.galleryButton} onPress={pickFromGallery}>
              <ImageIcon size={20} color={colors.tint} />
              <Text style={dynamicStyles.galleryButtonText}>Choose Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Stats or Recent Activity */}
          <View style={[dynamicStyles.scanOption, { marginTop: 8 }]}>
            <View style={styles.optionHeader}>
              <Scan size={32} color={colors.tabIconDefault} />
              <Text style={[dynamicStyles.scanOptionTitle, { color: colors.tabIconDefault }]}>Quick Access</Text>
            </View>
            <Text style={dynamicStyles.scanOptionDescription}>
              Access your recently scanned documents or view scan history for easy retrieval.
            </Text>
            <View style={styles.quickActions}>
              <TouchableOpacity 
                style={[styles.quickActionButton, { backgroundColor: colors.background, borderColor: colors.border }]} 
                onPress={() => router.push('/history')}
              >
                <Text style={[styles.quickActionText, { color: colors.text }]}>View History</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.quickActionButton, { backgroundColor: colors.background, borderColor: colors.border }]} 
                onPress={() => router.push('/settings')}
              >
                <Text style={[styles.quickActionText, { color: colors.text }]}>Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  scanFrame: {
    width: 280,
    height: 200,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 24,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  controlButton: {
    alignItems: 'center',
    gap: 4,
  },
  controlButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
});