import { useTheme } from '@/context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
<<<<<<< HEAD
import { Camera as CameraIcon, FileText, Image as ImageIcon, Scan } from 'lucide-react-native';
import React from 'react';
=======
import { Camera as CameraIcon, FileText, Image as ImageIcon } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
>>>>>>> 9aadd63 (fix bug)
import {
  Alert,
  Animated,
  Easing,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const AnimatedCard = ({
  children,
  animation,
  delay = 0,
  style
}: {
  children: React.ReactNode;
  animation: Animated.Value;
  delay?: number;
  style?: any;
}) => {
  const cardStyle = {
    opacity: animation,
    transform: [{
      translateY: animation.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0], // Ultra minimal: was 30px
      }),
    }, {
      scale: animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.98, 1], // Ultra subtle: was 0.97
      }),
    }],
  };

  return (
    <Animated.View style={[cardStyle, style]}>
      {children}
    </Animated.View>
  );
};

export default function HomeScreen() {
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [hasInitialized, setHasInitialized] = useState(false);

  // ScrollView ref to control scroll position
  const scrollViewRef = useRef<ScrollView>(null);

  // Animation values
  const headerFadeAnim = useRef(new Animated.Value(0)).current;
  const headerSlideAnim = useRef(new Animated.Value(-30)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const contentSlideAnim = useRef(new Animated.Value(50)).current;

  // Staggered animations for cards
  const cameraCardAnim = useRef(new Animated.Value(0)).current;
  const galleryCardAnim = useRef(new Animated.Value(0)).current;
  const pdfCardAnim = useRef(new Animated.Value(0)).current;

  // Initialize animations when component mounts
  useEffect(() => {
    // Ensure ScrollView is at the top when component mounts
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
    }

    // Start header animation immediately - ultra fast
    Animated.parallel([
      Animated.timing(headerFadeAnim, {
        toValue: 1,
        duration: 300, // Ultra fast: was 400ms
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(headerSlideAnim, {
        toValue: 0,
        duration: 350, // Ultra fast: was 500ms
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();

    // Start content animation with minimal delay
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 250, // Ultra fast: was 350ms
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(contentSlideAnim, {
          toValue: 0,
          duration: 300, // Ultra fast: was 400ms
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start(() => {
        // Start staggered card animations after content is visible
        setHasInitialized(true);
        startCardAnimations();
      });
    }, 100); // Minimal delay: was 150ms
  }, []);

  // Ensure scroll position is reset when component mounts
  useEffect(() => {
    // Use setTimeout to ensure the ScrollView is fully rendered
    const timer = setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
      }
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Reset scroll position when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Small delay to ensure navigation is complete
      const timer = setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ x: 0, y: 0, animated: false });
        }
      }, 100);

      return () => clearTimeout(timer);
    }, [])
  );

  const startCardAnimations = () => {
    // Ultra-fast staggered entrance for each card
    Animated.stagger(80, [ // Ultra fast stagger: was 100ms
      Animated.timing(cameraCardAnim, {
        toValue: 1,
        duration: 250, // Ultra fast: was 350ms
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(galleryCardAnim, {
        toValue: 1,
        duration: 250, // Ultra fast: was 350ms
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(pdfCardAnim, {
        toValue: 1,
        duration: 250, // Ultra fast: was 350ms
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  };

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

  const convertImageToPDF = () => {
    // Navigate to the optimized PDF converter screen
    router.push('/pdf-converter');
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
    pdfButton: {
      backgroundColor: '#FF6B35', // Orange color for PDF
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    pdfButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <ScrollView 
        ref={scrollViewRef}
        style={dynamicStyles.container} 
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            dynamicStyles.header,
            {
              opacity: headerFadeAnim,
              transform: [{ translateY: headerSlideAnim }],
            },
          ]}
        >
          <Text style={dynamicStyles.headerTitle}>Document Scanner</Text>
          <Text style={dynamicStyles.headerSubtitle}>
            Scan documents, extract text, or convert images to PDF
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentFadeAnim,
              transform: [{ translateY: contentSlideAnim }],
            },
          ]}
        >
          {/* Camera Scan Option */}
          <AnimatedCard
            animation={cameraCardAnim}
            style={dynamicStyles.scanOption}
          >
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
          </AnimatedCard>

          {/* Gallery Scan Option */}
          <AnimatedCard
            animation={galleryCardAnim}
            style={dynamicStyles.scanOption}
          >
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
          </AnimatedCard>

          {/* PDF Conversion Option */}
          <AnimatedCard
            animation={pdfCardAnim}
            style={dynamicStyles.scanOption}
          >
            <View style={styles.optionHeader}>
              <FileText size={32} color={colors.tint} />
              <Text style={dynamicStyles.scanOptionTitle}>Convert to PDF</Text>
            </View>
            <Text style={dynamicStyles.scanOptionDescription}>
              Select multiple images from your gallery and convert them into a professional PDF document. Preview, rearrange, and customize settings before generating.
            </Text>
            <TouchableOpacity style={dynamicStyles.pdfButton} onPress={convertImageToPDF}>
              <FileText size={20} color="#fff" />
              <Text style={dynamicStyles.pdfButtonText}>Create PDF</Text>
            </TouchableOpacity>
<<<<<<< HEAD
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
                onPress={() => router.push('/profile')}
              >
                <Text style={[styles.quickActionText, { color: colors.text }]}>Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
=======
          </AnimatedCard>

        </Animated.View>
>>>>>>> 9aadd63 (fix bug)
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