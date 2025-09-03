import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/context/ThemeContext';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Crop, X } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  PanResponder,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// OCR Functions
const tryAlternativeOCR = async (base64Data: string): Promise<string | null> => {
  try {
    console.log('Trying OCR.space API...');
    
    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${base64Data}`);
    formData.append('language', 'eng');
    formData.append('apikey', 'helloworld'); // Free tier key
    formData.append('OCREngine', '2');
    
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('OCR.space result:', result);
      
      if (result.ParsedResults && result.ParsedResults[0]) {
        const text = result.ParsedResults[0].ParsedText;
        if (text && text.trim()) {
          console.log('Alternative OCR successful');
          return text.trim();
        }
      }
    }
  } catch (error) {
    console.error('Alternative OCR failed:', error);
  }
  return null;
};

const extractTextFromImage = async (imageUri: string): Promise<string> => {
  console.log('extractTextFromImage called with URI:', imageUri);
  
  try {
    // Convert image to base64
    const base64Data = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log('Base64 conversion completed, length:', base64Data.length);
    
    // Try main OCR API
    console.log('Starting text extraction API call...');
    
    const requestBody = {
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all text from this image. Return only the extracted text, no additional commentary or formatting. If no text is found, return "No text detected".',
            },
            {
              type: 'image',
              image: `data:image/jpeg;base64,${base64Data}`,
            },
          ],
        },
      ],
    };
    
    console.log('Request body prepared, making API call...');

    // Create a timeout for the API call
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('API error response:', errorText);
      
      // Try alternative OCR service if main API fails
      console.log('Trying alternative OCR service...');
      const alternativeResult = await tryAlternativeOCR(base64Data);
      if (alternativeResult) {
        return alternativeResult;
      }
      
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API response data:', data);
    
    const extractedText = data.completion || data.message || data.text || data.response || 'No text detected';
    console.log('Extracted text:', extractedText);
    return extractedText;
  } catch (error) {
    console.error('API text extraction error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Text extraction timed out. Please try again.');
    } else if (error instanceof Error && error.message.includes('Network')) {
      throw new Error('Network error. Please check your connection and try again.');
    } else {
      // Try alternative OCR service as last resort
      console.log('Trying alternative OCR service as fallback...');
      try {
        const base64Data = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const alternativeResult = await tryAlternativeOCR(base64Data);
        if (alternativeResult) {
          return alternativeResult;
        }
      } catch (altError) {
        console.error('Alternative OCR also failed:', altError);
      }
      
      throw new Error('Failed to extract text from image. Please try again or check your internet connection.');
    }
  }
};

const generateIntelligentTitle = (text: string): string => {
  if (!text || text.trim() === '' || text.toLowerCase().includes('no text detected')) {
    return '';
  }

  // Clean the text and get words
  const cleanText = text.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');
  const words = cleanText.split(' ').filter(word => word.length > 0);
  
  // Take first 3 words
  const firstThreeWords = words.slice(0, 3).join(' ');
  
  // Clean up any special characters but keep letters, numbers and basic punctuation
  const cleanTitle = firstThreeWords.replace(/[^\w\s\.\,\-]/g, '').trim();
  
  // If we have content, return it, otherwise return empty
  return cleanTitle.length > 0 ? cleanTitle : '';
};

export default function PhotoPreviewScreen() {
  const { colors } = useTheme();
  const { photoUri, fromGallery } = useLocalSearchParams<{ photoUri: string; fromGallery?: string }>();
  
  const [showCropMode, setShowCropMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeCorner, setActiveCorner] = useState<string | null>(null);
  const [imageLayout, setImageLayout] = useState({ width: 0, height: 0, x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState('');
  
  // Check if this is from gallery selection
  const isFromGallery = fromGallery === 'true';
  
  // Add refs for smoother touch handling
  const lastTouchPosition = useRef({ x: 0, y: 0 });
  
  // Crop area state (as percentages of the image) - optimized for document scanning
  const [cropArea, setCropArea] = useState({
    x: 0.05,
    y: 0.05,
    width: 0.9,
    height: 0.9,
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: (evt) => {
      if (!showCropMode || !imageLayout.width) return false;
      const { locationX, locationY } = evt.nativeEvent;
      const hitTarget = getCornerFromTouch(locationX, locationY);
      return hitTarget !== null;
    },
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      // Allow gesture to start if we're already dragging or if movement is significant
      return isDragging || Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
    },
    onPanResponderGrant: (evt) => {
      if (!showCropMode) return;
      const { locationX, locationY } = evt.nativeEvent;
      const corner = getCornerFromTouch(locationX, locationY);
      if (corner) {
        setActiveCorner(corner);
        setIsDragging(true);
        // Initialize touch position for smooth movement
        lastTouchPosition.current = { x: locationX, y: locationY };
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    },
    onPanResponderMove: (evt, gestureState) => {
      if (!activeCorner || !imageLayout.width || !showCropMode || !isDragging) return;
      
      const { locationX, locationY } = evt.nativeEvent;
      
      // Simple but effective smoothing - reduce sensitivity for smoother movement
      const sensitivity = 0.9; // Higher sensitivity for more responsive updates
      const smoothedX = lastTouchPosition.current.x + (locationX - lastTouchPosition.current.x) * sensitivity;
      const smoothedY = lastTouchPosition.current.y + (locationY - lastTouchPosition.current.y) * sensitivity;
      
      // Update last position
      lastTouchPosition.current = { x: smoothedX, y: smoothedY };
      
      // Direct update for immediate response
      updateCropArea(activeCorner, smoothedX, smoothedY);
    },
    onPanResponderRelease: () => {
      setActiveCorner(null);
      setIsDragging(false);
      // Light haptic feedback on release
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    onPanResponderTerminate: () => {
      setActiveCorner(null);
      setIsDragging(false);
    },
  });

  const getCornerFromTouch = (x: number, y: number): string | null => {
    if (!imageLayout.width || !imageLayout.height) return null;
    
    const cropX = imageLayout.x + (cropArea.x * imageLayout.width);
    const cropY = imageLayout.y + (cropArea.y * imageLayout.height);
    const cropWidth = cropArea.width * imageLayout.width;
    const cropHeight = cropArea.height * imageLayout.height;

    // Corner circles have 14px offset and 28px diameter (14px radius)
    // So the visual corner centers are offset by 14px from the crop boundaries
    const cornerOffset = 14;
    const cornerRadius = 20; // Slightly larger touch radius for easier interaction
    const edgeTolerance = 20;   // Touch tolerance for edges

    // Corner positions accounting for the visual offset (-14px in JSX)
    const corners = [
      { x: cropX - cornerOffset, y: cropY - cornerOffset, type: 'topLeft' },
      { x: cropX + cropWidth + cornerOffset, y: cropY - cornerOffset, type: 'topRight' },
      { x: cropX - cornerOffset, y: cropY + cropHeight + cornerOffset, type: 'bottomLeft' },
      { x: cropX + cropWidth + cornerOffset, y: cropY + cropHeight + cornerOffset, type: 'bottomRight' }
    ];

    // Find closest corner within touch radius
    let closestCorner = null;
    let minDistance = Infinity;
    
    for (const corner of corners) {
      const distance = Math.sqrt(Math.pow(x - corner.x, 2) + Math.pow(y - corner.y, 2));
      if (distance <= cornerRadius && distance < minDistance) {
        closestCorner = corner.type;
        minDistance = distance;
      }
    }
    
    if (closestCorner) {
      return closestCorner;
    }

    // Check edges - exclude areas near corners to prevent conflicts
    const cornerExclusion = cornerRadius * 1.5; // Exclusion zone around corners
    
    // Top edge
    if (Math.abs(y - cropY) < edgeTolerance && 
        x > cropX + cornerExclusion && x < cropX + cropWidth - cornerExclusion) return 'topEdge';
    
    // Bottom edge  
    if (Math.abs(y - (cropY + cropHeight)) < edgeTolerance && 
        x > cropX + cornerExclusion && x < cropX + cropWidth - cornerExclusion) return 'bottomEdge';
    
    // Left edge
    if (Math.abs(x - cropX) < edgeTolerance && 
        y > cropY + cornerExclusion && y < cropY + cropHeight - cornerExclusion) return 'leftEdge';
    
    // Right edge
    if (Math.abs(x - (cropX + cropWidth)) < edgeTolerance && 
        y > cropY + cornerExclusion && y < cropY + cropHeight - cornerExclusion) return 'rightEdge';

    // Check if inside crop area for moving (smaller margin for better precision)
    const moveMargin = 30;
    if (x > cropX + moveMargin && x < cropX + cropWidth - moveMargin && 
        y > cropY + moveMargin && y < cropY + cropHeight - moveMargin) return 'move';

    return null;
  };

  const updateCropArea = (corner: string, touchX: number, touchY: number) => {
    if (!imageLayout.width) return;

    // Constrain touch coordinates to the image wrapper bounds
    const clampedX = Math.max(imageLayout.x, Math.min(touchX, imageLayout.x + imageLayout.width));
    const clampedY = Math.max(imageLayout.y, Math.min(touchY, imageLayout.y + imageLayout.height));
    
    // Convert to relative coordinates within the image
    const relativeX = (clampedX - imageLayout.x) / imageLayout.width;
    const relativeY = (clampedY - imageLayout.y) / imageLayout.height;

    // Round to reduce unnecessary updates
    const roundedX = Math.round(relativeX * 1000) / 1000;
    const roundedY = Math.round(relativeY * 1000) / 1000;

    const minSize = 0.1; // Slightly larger minimum size for better usability
    const maxSize = 1.0;

    setCropArea(prev => {
      let newCrop = { ...prev };

      switch (corner) {
        case 'topLeft':
          const newTopLeftX = Math.max(0, Math.min(roundedX, prev.x + prev.width - minSize));
          const newTopLeftY = Math.max(0, Math.min(roundedY, prev.y + prev.height - minSize));
          newCrop.width = prev.width + (prev.x - newTopLeftX);
          newCrop.height = prev.height + (prev.y - newTopLeftY);
          newCrop.x = newTopLeftX;
          newCrop.y = newTopLeftY;
          break;
          
        case 'topRight':
          const newTopRightY = Math.max(0, Math.min(roundedY, prev.y + prev.height - minSize));
          newCrop.width = Math.max(minSize, Math.min(maxSize - prev.x, roundedX - prev.x));
          newCrop.height = prev.height + (prev.y - newTopRightY);
          newCrop.y = newTopRightY;
          break;
          
        case 'bottomLeft':
          const newBottomLeftX = Math.max(0, Math.min(roundedX, prev.x + prev.width - minSize));
          newCrop.width = prev.width + (prev.x - newBottomLeftX);
          newCrop.height = Math.max(minSize, Math.min(maxSize - prev.y, roundedY - prev.y));
          newCrop.x = newBottomLeftX;
          break;
          
        case 'bottomRight':
          newCrop.width = Math.max(minSize, Math.min(maxSize - prev.x, roundedX - prev.x));
          newCrop.height = Math.max(minSize, Math.min(maxSize - prev.y, roundedY - prev.y));
          break;
          
        case 'topEdge':
          const newTopY = Math.max(0, Math.min(roundedY, prev.y + prev.height - minSize));
          newCrop.height = prev.height + (prev.y - newTopY);
          newCrop.y = newTopY;
          break;
          
        case 'bottomEdge':
          newCrop.height = Math.max(minSize, Math.min(maxSize - prev.y, roundedY - prev.y));
          break;
          
        case 'leftEdge':
          const newLeftX = Math.max(0, Math.min(roundedX, prev.x + prev.width - minSize));
          newCrop.width = prev.width + (prev.x - newLeftX);
          newCrop.x = newLeftX;
          break;
          
        case 'rightEdge':
          newCrop.width = Math.max(minSize, Math.min(maxSize - prev.x, roundedX - prev.x));
          break;
          
        case 'move':
          const centerX = prev.x + prev.width / 2;
          const centerY = prev.y + prev.height / 2;
          const deltaX = roundedX - centerX;
          const deltaY = roundedY - centerY;
          
          newCrop.x = Math.max(0, Math.min(maxSize - prev.width, prev.x + deltaX));
          newCrop.y = Math.max(0, Math.min(maxSize - prev.height, prev.y + deltaY));
          break;
      }

      // Ensure crop area stays within bounds of the image container
      newCrop.x = Math.max(0, Math.min(newCrop.x, maxSize - newCrop.width));
      newCrop.y = Math.max(0, Math.min(newCrop.y, maxSize - newCrop.height));
      newCrop.width = Math.max(minSize, Math.min(newCrop.width, maxSize - newCrop.x));
      newCrop.height = Math.max(minSize, Math.min(newCrop.height, maxSize - newCrop.y));

      return newCrop;
    });
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

  const toggleCropMode = () => {
    setShowCropMode(!showCropMode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRetake = () => {
    if (isFromGallery) {
      // If from gallery, go back to home screen to choose another photo
      router.back();
    } else {
      // If from camera, navigate back to camera with retake flag
      router.replace({
        pathname: '/camera-scan',
        params: { retake: 'true' }
      });
    }
  };

  const handleConfirm = async () => {
    if (!photoUri) {
      console.log('ERROR: No photoUri available');
      return;
    }
    
    if (isProcessing || isExtractingText) {
      console.log('Confirm button clicked but already processing, ignoring');
      return;
    }

    console.log('handleConfirm started with photoUri:', photoUri);
    setIsProcessing(true);
    
    try {
      let finalImageUri = photoUri;

      // Step 1: Process image (crop/resize)
      setIsExtractingText(true);
      if (showCropMode) {
        setExtractionProgress('Applying crop...');
      } else {
        setExtractionProgress('Preparing image...');
      }
      await new Promise(resolve => setTimeout(resolve, 500));

      if (showCropMode) {
        // Get the actual image dimensions first
        console.log('Getting original image dimensions...');
        const imageInfo = await ImageManipulator.manipulateAsync(photoUri, [], {});
        const originalWidth = imageInfo.width;
        const originalHeight = imageInfo.height;
        
        console.log('Original image dimensions:', { originalWidth, originalHeight });
        console.log('Crop area (relative):', cropArea);
        
        // Convert relative crop coordinates to pixel coordinates
        const cropPixels = {
          originX: Math.max(0, Math.round(cropArea.x * originalWidth)),
          originY: Math.max(0, Math.round(cropArea.y * originalHeight)),
          width: Math.min(originalWidth, Math.round(cropArea.width * originalWidth)),
          height: Math.min(originalHeight, Math.round(cropArea.height * originalHeight)),
        };
        
        // Ensure crop doesn't exceed image bounds
        if (cropPixels.originX + cropPixels.width > originalWidth) {
          cropPixels.width = originalWidth - cropPixels.originX;
        }
        if (cropPixels.originY + cropPixels.height > originalHeight) {
          cropPixels.height = originalHeight - cropPixels.originY;
        }
        
        console.log('Crop area (pixels, validated):', cropPixels);
        
        // Apply crop
        const cropResult = await ImageManipulator.manipulateAsync(
          photoUri,
          [
            {
              crop: cropPixels,
            },
            {
              resize: {
                width: 1024, // Resize to max 1024px width for faster OCR
              },
            },
          ],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        finalImageUri = cropResult.uri;
        console.log('Crop applied successfully, new URI:', finalImageUri);
      } else {
        // Resize image even if not cropping for faster OCR
        const resizeResult = await ImageManipulator.manipulateAsync(
          photoUri,
          [
            {
              resize: {
                width: 1024, // Resize to max 1024px width for faster OCR
              },
            },
          ],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );
        finalImageUri = resizeResult.uri;
      }

      // Step 2: Extract text using OCR
      setExtractionProgress('Extracting text...');
      const extractedText = await extractTextFromImage(finalImageUri);
      console.log('Extracted text:', extractedText);
      
      // Step 3: Generate intelligent title
      setExtractionProgress('Processing results...');
      const documentTitle = generateIntelligentTitle(extractedText);
      console.log('Generated title:', documentTitle);
      
      // Step 4: Add small delay for final processing feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Step 5: Complete extraction and navigate
      setIsExtractingText(false);
      
      // Navigate to scan result screen with processed data
      console.log('Attempting to navigate to scan-result...');
      
      router.dismissAll();
      setTimeout(() => {
        router.push({
          pathname: '/scan-result',
          params: {
            imageUri: finalImageUri,
            extractedText: extractedText,
            documentTitle: documentTitle
          }
        });
      }, 100);
      console.log('Navigation command sent to scan-result');
    } catch (error) {
      console.error('Error during text extraction:', error);
      setIsExtractingText(false);
      Alert.alert('Error', 'Failed to extract text from image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 20,
      paddingHorizontal: 20,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      backgroundColor: '#000',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },
    headerTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
    backButton: {
      padding: 8,
    },
    bottomControls: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingBottom: 50,
      paddingTop: 30,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
  });

  if (!photoUri) {
    return (
      <SafeAreaView style={[dynamicStyles.container, { backgroundColor: colors.background }]}>
        <ThemedText>No photo provided</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <View style={dynamicStyles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        
        {/* Header */}
        <View style={dynamicStyles.header}>
          <TouchableOpacity style={dynamicStyles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <ThemedText style={dynamicStyles.headerTitle}>
            {isFromGallery ? 'Selected Photo' : 'Photo Preview'}
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>

      {/* Crop Mode Instructions */}
      {showCropMode && (
        <View style={styles.cropInstructions}>
          <ThemedText style={styles.cropInstructionText}>
            Drag the corners to adjust crop area, then tap ✓ to apply
          </ThemedText>
        </View>
      )}

      {/* Photo Display */}
      <View style={styles.photoContainer} {...(showCropMode ? panResponder.panHandlers : {})}>
        <View style={styles.imageWrapper}>
          <Image 
            source={{ uri: photoUri }} 
            style={styles.photo}
            resizeMode="contain"
            onLayout={(event) => {
              const { x, y, width, height } = event.nativeEvent.layout;
              setImageLayout({ x, y, width, height });
            }}
          />
          
          {/* Crop overlay when in crop mode - constrained to image bounds */}
          {showCropMode && imageLayout.width > 0 && (
            <View style={[styles.cropOverlay, getCropOverlayStyle()]}>
              {/* Semi-transparent overlay outside crop area */}
              <View style={styles.cropDimOverlay} />
              
              {/* Grid lines - only show when actively dragging */}
              {isDragging && (
                <View style={styles.cropGrid}>
                  <View style={[styles.gridLine, { width: '100%', height: 1, top: '33.33%' }]} />
                  <View style={[styles.gridLine, { width: '100%', height: 1, top: '66.66%' }]} />
                  <View style={[styles.gridLine, { height: '100%', width: 1, left: '33.33%' }]} />
                  <View style={[styles.gridLine, { height: '100%', width: 1, left: '66.66%' }]} />
                </View>
              )}
              
              {/* Corner handles */}
              <View style={[styles.cropCorner, { top: -14, left: -14 }, activeCorner === 'topLeft' && styles.activeCorner]} />
              <View style={[styles.cropCorner, { top: -14, right: -14 }, activeCorner === 'topRight' && styles.activeCorner]} />
              <View style={[styles.cropCorner, { bottom: -14, left: -14 }, activeCorner === 'bottomLeft' && styles.activeCorner]} />
              <View style={[styles.cropCorner, { bottom: -14, right: -14 }, activeCorner === 'bottomRight' && styles.activeCorner]} />
              
              {/* Edge handles */}
              <View style={[styles.cropEdge, { top: -3, left: '20%', right: '20%', height: 6 }, 
                activeCorner === 'topEdge' && styles.activeEdge]} />
              <View style={[styles.cropEdge, { bottom: -3, left: '20%', right: '20%', height: 6 }, 
                activeCorner === 'bottomEdge' && styles.activeEdge]} />
              <View style={[styles.cropEdge, { left: -3, top: '20%', bottom: '20%', width: 6 }, 
                activeCorner === 'leftEdge' && styles.activeEdge]} />
              <View style={[styles.cropEdge, { right: -3, top: '20%', bottom: '20%', width: 6 }, 
                activeCorner === 'rightEdge' && styles.activeEdge]} />
            </View>
          )}
        </View>
      </View>

      {/* Bottom Controls */}
      <View style={dynamicStyles.bottomControls}>
        {/* Retake Button */}
        <TouchableOpacity style={styles.controlButton} onPress={handleRetake}>
          <X size={24} color="#fff" />
        </TouchableOpacity>

        {/* Confirm Button */}
        <TouchableOpacity 
          style={[styles.confirmButton, (isProcessing || isExtractingText) && styles.buttonDisabled]} 
          onPress={handleConfirm}
          disabled={isProcessing || isExtractingText}
        >
          <Check size={24} color="#fff" />
        </TouchableOpacity>

        {/* Crop Toggle */}
        <TouchableOpacity 
          style={[styles.controlButton, showCropMode && styles.activeCropButton]} 
          onPress={toggleCropMode}
        >
          <Crop size={24} color={showCropMode ? "#007AFF" : "#fff"} />
        </TouchableOpacity>
      </View>

      {/* Text Extraction Loading Overlay */}
      {isExtractingText && (
        <View style={styles.extractionOverlay}>
          <View style={[styles.extractionModal, { backgroundColor: colors.cardBackground }]}>
            <ActivityIndicator size="large" color={colors.tint} />
            <ThemedText style={[styles.extractionTitle, { color: colors.text }]}>
              Extracting Text
            </ThemedText>
            <ThemedText style={[styles.extractionProgress, { color: colors.tabIconDefault }]}>
              {extractionProgress}
            </ThemedText>
          </View>
        </View>
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  photoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  imageWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // Constrain the image container to a reasonable size for cropping
    maxWidth: screenWidth - 32,
    maxHeight: screenHeight * 0.6, // Use 60% of screen height
    aspectRatio: 3/4, // Default document aspect ratio
  },
  photo: {
    width: '100%',
    height: '100%',
    minHeight: 300,
  },
  cropOverlay: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cropDimOverlay: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 3,
    borderColor: 'transparent',
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
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  cropCorner: {
    position: 'absolute',
    width: 28,
    height: 28,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  activeCorner: {
    backgroundColor: '#007AFF',
    borderColor: '#ffffff',
    transform: [{ scale: 1.3 }],
  },
  cropEdge: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  activeEdge: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    transform: [{ scale: 1.1 }],
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeCropButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.3)',
  },
  confirmButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  extractionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  extractionModal: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  extractionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  extractionProgress: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  cropInstructions: {
    position: 'absolute',
    top: 70,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderRadius: 8,
    zIndex: 5,
  },
  cropInstructionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
