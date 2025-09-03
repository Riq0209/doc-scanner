import { useTheme } from '@/context/ThemeContext';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Check, RotateCw } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    PanResponder,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function CropImageScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ imageUri: string; mode?: string }>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  
  // Crop area state (as percentages of the image)
  const [cropArea, setCropArea] = useState({
    x: 0.1, // 10% from left
    y: 0.1, // 10% from top
    width: 0.8, // 80% of image width
    height: 0.8, // 80% of image height
  });

  const [activeCorner, setActiveCorner] = useState<string | null>(null);

  // Predefined aspect ratios like iPhone
  const aspectRatios = [
    { name: 'Original', ratio: null },
    { name: 'Square', ratio: 1 },
    { name: '4:3', ratio: 4/3 },
    { name: '16:9', ratio: 16/9 },
    { name: '3:2', ratio: 3/2 },
  ];

  const [selectedRatio, setSelectedRatio] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const corner = getCornerFromTouch(locationX, locationY);
        setActiveCorner(corner);
      },
      onPanResponderMove: (evt) => {
        if (!activeCorner || !imageLayout.width) return;
        
        const { locationX, locationY } = evt.nativeEvent;
        updateCropArea(activeCorner, locationX, locationY);
      },
      onPanResponderRelease: () => {
        setActiveCorner(null);
      },
    })
  ).current;

  const getCornerFromTouch = (x: number, y: number): string | null => {
    const cropX = imageLayout.x + (cropArea.x * imageLayout.width);
    const cropY = imageLayout.y + (cropArea.y * imageLayout.height);
    const cropWidth = cropArea.width * imageLayout.width;
    const cropHeight = cropArea.height * imageLayout.height;

    const tolerance = 30;

    // Check corners
    if (Math.abs(x - cropX) < tolerance && Math.abs(y - cropY) < tolerance) return 'topLeft';
    if (Math.abs(x - (cropX + cropWidth)) < tolerance && Math.abs(y - cropY) < tolerance) return 'topRight';
    if (Math.abs(x - cropX) < tolerance && Math.abs(y - (cropY + cropHeight)) < tolerance) return 'bottomLeft';
    if (Math.abs(x - (cropX + cropWidth)) < tolerance && Math.abs(y - (cropY + cropHeight)) < tolerance) return 'bottomRight';

    // Check if inside crop area for moving
    if (x > cropX && x < cropX + cropWidth && y > cropY && y < cropY + cropHeight) return 'move';

    return null;
  };

  const updateCropArea = (corner: string, touchX: number, touchY: number) => {
    if (!imageLayout.width) return;

    const relativeX = (touchX - imageLayout.x) / imageLayout.width;
    const relativeY = (touchY - imageLayout.y) / imageLayout.height;

    setCropArea(prev => {
      let newCrop = { ...prev };

      switch (corner) {
        case 'topLeft':
          newCrop.width = Math.max(0.1, prev.width + (prev.x - Math.max(0, relativeX)));
          newCrop.height = Math.max(0.1, prev.height + (prev.y - Math.max(0, relativeY)));
          newCrop.x = Math.max(0, relativeX);
          newCrop.y = Math.max(0, relativeY);
          break;
        case 'topRight':
          newCrop.width = Math.min(1 - prev.x, Math.max(0.1, relativeX - prev.x));
          newCrop.height = Math.max(0.1, prev.height + (prev.y - Math.max(0, relativeY)));
          newCrop.y = Math.max(0, relativeY);
          break;
        case 'bottomLeft':
          newCrop.width = Math.max(0.1, prev.width + (prev.x - Math.max(0, relativeX)));
          newCrop.height = Math.min(1 - prev.y, Math.max(0.1, relativeY - prev.y));
          newCrop.x = Math.max(0, relativeX);
          break;
        case 'bottomRight':
          newCrop.width = Math.min(1 - prev.x, Math.max(0.1, relativeX - prev.x));
          newCrop.height = Math.min(1 - prev.y, Math.max(0.1, relativeY - prev.y));
          break;
        case 'move':
          const deltaX = relativeX - (prev.x + prev.width / 2);
          const deltaY = relativeY - (prev.y + prev.height / 2);
          newCrop.x = Math.max(0, Math.min(1 - prev.width, prev.x + deltaX));
          newCrop.y = Math.max(0, Math.min(1 - prev.height, prev.y + deltaY));
          break;
      }

      // Ensure crop area stays within bounds
      newCrop.x = Math.max(0, Math.min(1 - newCrop.width, newCrop.x));
      newCrop.y = Math.max(0, Math.min(1 - newCrop.height, newCrop.y));
      newCrop.width = Math.max(0.1, Math.min(1 - newCrop.x, newCrop.width));
      newCrop.height = Math.max(0.1, Math.min(1 - newCrop.y, newCrop.height));

      return newCrop;
    });
  };

  const applyAspectRatio = (ratio: number | null) => {
    if (!ratio) return; // Original aspect ratio

    setCropArea(prev => {
      const centerX = prev.x + prev.width / 2;
      const centerY = prev.y + prev.height / 2;

      let newWidth = prev.width;
      let newHeight = prev.height;

      // Calculate new dimensions based on aspect ratio
      if (ratio > 1) {
        // Landscape
        newHeight = newWidth / ratio;
      } else {
        // Portrait or square
        newWidth = newHeight * ratio;
      }

      // Ensure it fits within image bounds
      if (newWidth > 1) {
        newWidth = 1;
        newHeight = newWidth / ratio;
      }
      if (newHeight > 1) {
        newHeight = 1;
        newWidth = newHeight * ratio;
      }

      // Center the crop area
      const newX = Math.max(0, Math.min(1 - newWidth, centerX - newWidth / 2));
      const newY = Math.max(0, Math.min(1 - newHeight, centerY - newHeight / 2));

      return {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
      };
    });
  };

  const handleCrop = async () => {
    if (!params.imageUri) {
      Alert.alert('Error', 'No image to crop');
      return;
    }

    setIsProcessing(true);
    try {
      // Get the actual image dimensions
      const imageInfo = await manipulateAsync(params.imageUri, [], { compress: 1 });
      
      const cropParams = {
        originX: Math.floor(imageInfo.width * cropArea.x),
        originY: Math.floor(imageInfo.height * cropArea.y),
        width: Math.floor(imageInfo.width * cropArea.width),
        height: Math.floor(imageInfo.height * cropArea.height),
      };

      const croppedImage = await manipulateAsync(
        params.imageUri,
        [{ crop: cropParams }],
        { 
          compress: 0.8, 
          format: SaveFormat.JPEG,
          base64: true
        }
      );

      if (!croppedImage.base64) {
        throw new Error('Failed to generate base64 for cropped image');
      }

      // Navigate to appropriate result screen
      if (params.mode === 'scan') {
        router.replace({
          pathname: '/scan-result',
          params: { 
            imageUri: croppedImage.uri, 
            imageBase64: croppedImage.base64,
            mode: 'scan'
          }
        });
      } else {
        router.replace({
          pathname: '/photo-result' as any,
          params: { 
            imageUri: croppedImage.uri, 
            imageBase64: croppedImage.base64
          }
        });
      }
    } catch (error) {
      console.error('Crop error:', error);
      Alert.alert('Error', 'Failed to crop image');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCrop = () => {
    setCropArea({
      x: 0.1,
      y: 0.1,
      width: 0.8,
      height: 0.8,
    });
    setSelectedRatio(0);
  };

  const getCropOverlayStyle = () => {
    if (!imageLayout.width) return {};

    return {
      left: imageLayout.x + (cropArea.x * imageLayout.width),
      top: imageLayout.y + (cropArea.y * imageLayout.height),
      width: cropArea.width * imageLayout.width,
      height: cropArea.height * imageLayout.height,
    };
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crop</Text>
        <TouchableOpacity style={styles.headerButton} onPress={resetCrop}>
          <Text style={styles.headerButtonText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.imageContainer} {...panResponder.panHandlers}>
        <Image 
          source={{ uri: params.imageUri }} 
          style={styles.image}
          onLayout={(event) => {
            const { x, y, width, height } = event.nativeEvent.layout;
            setImageLayout({ x, y, width, height });
          }}
        />
        
        {imageLayout.width > 0 && (
          <View style={[styles.cropOverlay, getCropOverlayStyle()]}>
            {/* Grid lines */}
            <View style={styles.cropGrid}>
              <View style={[styles.gridLine, { width: '100%', height: 1, top: '33.33%' }]} />
              <View style={[styles.gridLine, { width: '100%', height: 1, top: '66.66%' }]} />
              <View style={[styles.gridLine, { height: '100%', width: 1, left: '33.33%' }]} />
              <View style={[styles.gridLine, { height: '100%', width: 1, left: '66.66%' }]} />
            </View>
            
            {/* Corner handles */}
            <View style={[styles.cropCorner, { top: -10, left: -10 }]} />
            <View style={[styles.cropCorner, { top: -10, right: -10 }]} />
            <View style={[styles.cropCorner, { bottom: -10, left: -10 }]} />
            <View style={[styles.cropCorner, { bottom: -10, right: -10 }]} />
            
            {/* Edge handles */}
            <View style={[styles.cropEdge, { top: -2, left: '25%', right: '25%', height: 4 }]} />
            <View style={[styles.cropEdge, { bottom: -2, left: '25%', right: '25%', height: 4 }]} />
            <View style={[styles.cropEdge, { left: -2, top: '25%', bottom: '25%', width: 4 }]} />
            <View style={[styles.cropEdge, { right: -2, top: '25%', bottom: '25%', width: 4 }]} />
          </View>
        )}
      </View>

      <View style={styles.aspectRatiosContainer}>
        {aspectRatios.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.aspectButton,
              selectedRatio === index && styles.aspectButtonActive
            ]}
            onPress={() => {
              setSelectedRatio(index);
              applyAspectRatio(item.ratio);
            }}
          >
            <Text style={styles.aspectButtonText}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bottomControls}>
        <TouchableOpacity style={styles.controlButton} onPress={resetCrop}>
          <RotateCw size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cropButton, isProcessing && styles.cropButtonDisabled]}
          onPress={handleCrop}
          disabled={isProcessing}
        >
          <Check size={32} color="#fff" />
        </TouchableOpacity>

        <View style={styles.controlButton} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    maxWidth: screenWidth,
    maxHeight: screenHeight - 300,
    resizeMode: 'contain',
  },
  cropOverlay: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cropGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  cropCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  cropEdge: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  aspectRatiosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  aspectButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  aspectButtonActive: {
    backgroundColor: '#007AFF',
  },
  aspectButtonText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 50,
    height: 50,
  },
  cropButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropButtonDisabled: {
    opacity: 0.5,
  },
});
