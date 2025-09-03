import { useTheme } from '@/context/ThemeContext';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, FlipHorizontal } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    BackHandler,
    InteractionManager,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default React.memo(function CameraScanScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const { colors } = useTheme();
  const { retake } = useLocalSearchParams<{ retake?: string }>();

  // Optimize camera initialization with better state management
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      
      // If this is a retake, initialize immediately without delay
      if (retake === 'true') {
        if (isMounted) {
          setIsCameraReady(true);
        }
        return () => {
          isMounted = false;
        };
      }
      
      // Use InteractionManager to defer camera initialization until after navigation
      // Add a small additional delay to ensure smooth navigation from other screens
      const task = InteractionManager.runAfterInteractions(() => {
        // Small delay to ensure the screen is fully mounted and navigation is complete
        setTimeout(() => {
          if (isMounted) {
            setIsCameraReady(true);
          }
        }, 100);
      });

      return () => {
        isMounted = false;
        task.cancel();
        // Don't immediately set camera ready to false to avoid flicker
        // The camera will be properly cleaned up when the component unmounts
      };
    }, [retake])
  );

  // Separate effect for unmounting cleanup
  useEffect(() => {
    return () => {
      setIsCameraReady(false);
    };
  }, []);

  // Handle Android hardware back button
  const goBack = useCallback(() => {
    try {
      // Ensure we go back to the home screen
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback to home tab if no navigation history
        router.replace('/' as any);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Last resort: navigate to home
      router.replace('/' as any);
    }
  }, []);

  useEffect(() => {
    const backAction = () => {
      goBack();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [goBack]);

  // Create dynamic styles after all hooks are defined
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
      paddingTop: Platform.OS === 'ios' ? 0 : 12,
      paddingBottom: 12,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
  });

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionText, { color: colors.text }]}>
            We need your permission to show the camera
          </Text>
          <TouchableOpacity 
            style={[styles.permissionButton, { backgroundColor: colors.tint }]} 
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const takePicture = async () => {
    console.log('takePicture called - cameraReady:', isCameraReady, 'isCapturing:', isCapturing, 'hasRef:', !!cameraRef.current);
    
    if (!cameraRef.current || isCapturing) {
      console.log('Early return - no camera ref or already capturing');
      return;
    }

    if (!isCameraReady) {
      console.log('Camera not ready yet');
      Alert.alert('Please wait', 'Camera is still initializing...');
      return;
    }

    try {
      setIsCapturing(true);
      
      // Immediate haptic feedback when button is pressed
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      console.log('Taking picture...');
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: true, // Skip processing for faster capture
      });

      console.log('Photo captured:', photo);

      if (photo?.uri) {
        // Haptic feedback for successful capture
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        console.log('Navigating to photo-preview with URI:', photo.uri);
        // Try direct navigation with immediate execution
        try {
          router.push({
            pathname: '/photo-preview' as any,
            params: { photoUri: photo.uri }
          });
        } catch (navError) {
          console.error('Navigation error:', navError);
          // Fallback: try replace instead
          router.replace({
            pathname: '/photo-preview' as any,
            params: { photoUri: photo.uri }
          });
        }
      } else {
        console.error('No photo URI received');
        Alert.alert('Error', 'Failed to capture image. Please try again.');
      }
    } catch (error) {
      console.error('Failed to take picture:', error);
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={dynamicStyles.header}>
        <TouchableOpacity 
          style={[styles.headerButton, styles.backButton]} 
          onPress={goBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={colors.tint} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Document Scanner</Text>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={toggleCameraFacing}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <FlipHorizontal size={24} color={colors.tint} />
        </TouchableOpacity>
      </View>

      {!isCameraReady && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Initializing camera...
          </Text>
        </View>
      )}

      {/* Camera Container with improved sizing */}
      <View style={styles.cameraContainer}>
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            Position the document within the frame
          </Text>
        </View>

        <View style={styles.cameraWrapper}>
          <CameraView 
            ref={cameraRef}
            style={[styles.camera, { opacity: isCameraReady ? 1 : 0 }]} 
            facing={facing}
            animateShutter={false}
            enableTorch={false}
            mode="picture"
          >
            {/* Document Frame Overlay */}
            <View style={styles.frameOverlay}>
              <View style={styles.frameCorners}>
                {/* Top Left Corner */}
                <View style={[styles.corner, styles.topLeft]} />
                {/* Top Right Corner */}
                <View style={[styles.corner, styles.topRight]} />
                {/* Bottom Left Corner */}
                <View style={[styles.corner, styles.bottomLeft]} />
                {/* Bottom Right Corner */}
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              
              {/* Document frame guide */}
              <View style={styles.documentFrame} />
            </View>
          </CameraView>
        </View>

        <View style={styles.bottomContainer}>
          <View style={styles.captureContainer}>
            <TouchableOpacity 
              style={[
                styles.captureButton,
                isCapturing && styles.captureButtonDisabled
              ]} 
              onPress={takePicture}
              disabled={isCapturing || !isCameraReady}
            >
              <View style={styles.captureButtonInner}>
                <Camera size={32} color="#fff" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButton: {
    padding: 8,
  },
  backButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cameraWrapper: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    // Aspect ratio for document scanning (4:3 or A4-like ratio)
    aspectRatio: 3/4,
    maxHeight: '70%',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  frameOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameCorners: {
    ...StyleSheet.absoluteFillObject,
    margin: 40,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00ff88',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  documentFrame: {
    width: '70%',
    height: '70%',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 136, 0.4)',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  bottomContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  captureContainer: {
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    transform: [{ scale: 1 }],
  },
  captureButtonDisabled: {
    opacity: 0.5,
    transform: [{ scale: 0.95 }],
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
