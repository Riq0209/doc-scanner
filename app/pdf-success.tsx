import { useTheme } from '@/context/ThemeContext';
import { DatabaseService } from '@/lib/database';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
    ArrowLeft,
    FileText,
    Plus,
    Share2 as Share
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface SelectedImage {
  id: string;
  uri: string;
  width: number;
  height: number;
}

export default function PDFSuccessScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams();
  
  // Parse params
  const pdfUri = params.pdfUri as string;
  const pdfTitle = params.pdfTitle as string;
  const selectedImages: SelectedImage[] = params.selectedImages 
    ? JSON.parse(params.selectedImages as string) 
    : [];
  
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;

  // Debug logging for state changes - Essential only
  React.useEffect(() => {
    if (showImagePreview) {
      console.log('🔥 Image preview modal opened');
    }
  }, [showImagePreview]);

  const sharePDF = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Share PDF'
        });
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
    }
  };

  const saveToHistory = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Save to Supabase database
      const result = await DatabaseService.savePDFToHistory({
        title: pdfTitle,
        pdf_url: pdfUri,
        page_count: selectedImages.length,
        thumbnail_url: selectedImages[0]?.uri || undefined
      });
      
      if (result.success) {
        Alert.alert(
          'Saved to History! ✅',
          `"${pdfTitle}" has been saved to your scan history.`,
          [
            {
              text: 'View History',
              onPress: () => router.push('/(tabs)/history')
            },
            {
              text: 'OK',
              style: 'default'
            }
          ]
        );
      } else {
        throw new Error(String(result.error) || 'Failed to save to database');
      }
    } catch (error) {
      console.error('Error saving to history:', error);
      Alert.alert('Error', 'Failed to save to history. Please try again.');
    }
  };

  const createAnotherPDF = () => {
    router.back(); // Go back to PDF converter
  };

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
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    successContainer: {
      alignItems: 'center',
      marginBottom: 30,
    },
    successIcon: {
      backgroundColor: '#4CAF50',
      borderRadius: 50,
      padding: 20,
      marginBottom: 16,
    },
    successTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 8,
    },
    pdfInfo: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      flexDirection: 'row',
      alignItems: 'center',
    },
    pdfIcon: {
      marginRight: 12,
    },
    pdfDetails: {
      flex: 1,
    },
    pdfTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    pdfSubtitle: {
      fontSize: 14,
      color: colors.tabIconDefault,
    },
    actionsTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    saveButton: {
      backgroundColor: '#007AFF',
    },
    shareButton: {
      backgroundColor: '#34C759',
    },
    createAnotherButton: {
      backgroundColor: colors.background,
      borderColor: colors.border,
    },
    actionIcon: {
      marginRight: 12,
    },
    actionContent: {
      flex: 1,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    actionSubtitle: {
      fontSize: 14,
      opacity: 0.7,
    },
    previewSection: {
      marginTop: 24,
    },
    previewTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    previewSubtitle: {
      fontSize: 14,
      color: colors.tabIconDefault,
      marginBottom: 16,
    },
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 0,
    },
    previewImageContainer: {
      width: '32%',
      aspectRatio: 1,
      marginBottom: 12,
      borderRadius: 8,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    pageLabel: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.7)',
      color: '#fff',
      fontSize: 10,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontWeight: '600',
    },
    moreImagesContainer: {
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    moreImagesText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>PDF Generated</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={dynamicStyles.content} showsVerticalScrollIndicator={false}>
        {/* Success Message */}
        <View style={dynamicStyles.successContainer}>
          <View style={dynamicStyles.successIcon}>
            <FileText size={32} color="#fff" />
          </View>
          <Text style={dynamicStyles.successTitle}>Done!</Text>
        </View>

        {/* PDF Info */}
        <View style={dynamicStyles.pdfInfo}>
          <View style={dynamicStyles.pdfIcon}>
            <FileText size={24} color="#007AFF" />
          </View>
          <View style={dynamicStyles.pdfDetails}>
            <Text style={dynamicStyles.pdfTitle}>{pdfTitle}</Text>
            <Text style={dynamicStyles.pdfSubtitle}>
              {selectedImages.length} page{selectedImages.length === 1 ? '' : 's'} • HIGH quality
            </Text>
            <Text style={dynamicStyles.pdfSubtitle}>A4 portrait</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <Text style={dynamicStyles.actionsTitle}>What would you like to do?</Text>

        <TouchableOpacity 
          style={[dynamicStyles.actionButton, dynamicStyles.saveButton]}
          onPress={saveToHistory}
          activeOpacity={0.8}
        >
          <View style={dynamicStyles.actionIcon}>
            <FileText size={20} color="#fff" />
          </View>
          <View style={dynamicStyles.actionContent}>
            <Text style={[dynamicStyles.actionTitle, { color: '#fff' }]}>Save to History</Text>
            <Text style={[dynamicStyles.actionSubtitle, { color: '#fff' }]}>
              Add this PDF to your scan history for easy access later
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[dynamicStyles.actionButton, dynamicStyles.shareButton]}
          onPress={sharePDF}
          activeOpacity={0.8}
        >
          <View style={dynamicStyles.actionIcon}>
            <Share size={20} color="#fff" />
          </View>
          <View style={dynamicStyles.actionContent}>
            <Text style={[dynamicStyles.actionTitle, { color: '#fff' }]}>Share PDF</Text>
            <Text style={[dynamicStyles.actionSubtitle, { color: '#fff' }]}>
              Save to Files, share via email, or send to other apps
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[dynamicStyles.actionButton, dynamicStyles.createAnotherButton]}
          onPress={createAnotherPDF}
          activeOpacity={0.8}
        >
          <View style={dynamicStyles.actionIcon}>
            <Plus size={20} color={colors.text} />
          </View>
          <View style={dynamicStyles.actionContent}>
            <Text style={[dynamicStyles.actionTitle, { color: colors.text }]}>Create Another PDF</Text>
            <Text style={[dynamicStyles.actionSubtitle, { color: colors.text }]}>
              Start over with new images
            </Text>
          </View>
        </TouchableOpacity>

        {/* Preview Images */}
        <View style={dynamicStyles.previewSection}>
          <Text style={dynamicStyles.previewTitle}>Preview Images</Text>
          <Text style={dynamicStyles.previewSubtitle}>
            Tap any image to view the full-size version
          </Text>
          <View style={[dynamicStyles.imageGrid, { paddingHorizontal: 2, justifyContent: 'flex-start' }]}>
            {selectedImages.slice(0, 6).map((image, index) => (
              <TouchableOpacity 
                key={image.id} 
                style={[dynamicStyles.previewImageContainer, { marginRight: index % 3 === 2 ? 0 : '2%' }]}
                activeOpacity={0.7}
                onPress={async () => {
                  // Haptic feedback for better UX
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  
                  console.log('🖼️ Image tapped:', image.uri);
                  console.log('📋 All selectedImages:', selectedImages.length);
                  
                  setIsTransitioning(true);
                  setImageLoading(true);
                  
                  // Reset animations
                  fadeAnim.setValue(0);
                  scaleAnim.setValue(0.9);
                  
                  setPreviewUri(image.uri);
                  setShowImagePreview(true);
                  
                  console.log('🔥 Setting previewUri to:', image.uri);
                  
                  // Start entrance animation
                  Animated.parallel([
                    Animated.timing(fadeAnim, {
                      toValue: 1,
                      duration: 300,
                      useNativeDriver: true,
                    }),
                    Animated.spring(scaleAnim, {
                      toValue: 1,
                      tension: 100,
                      friction: 8,
                      useNativeDriver: true,
                    })
                  ]).start(() => {
                    setIsTransitioning(false);
                  });
                }}
              >
                <Image source={{ uri: image.uri }} style={dynamicStyles.previewImage} />
                <Text style={[dynamicStyles.pageLabel, { color: colors.text }]}>{index + 1}</Text>
              </TouchableOpacity>
            ))}
            {selectedImages.length > 6 && (
              <View style={[dynamicStyles.previewImageContainer, dynamicStyles.moreImagesContainer]}>
                <Text style={dynamicStyles.moreImagesText}>+{selectedImages.length - 6}</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal
        visible={showImagePreview}
        animationType="none"
        presentationStyle="overFullScreen"
        transparent={false}
        onRequestClose={() => {
          setShowImagePreview(false);
          setPreviewUri(null);
        }}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: '#000',
          zIndex: 9999
        }}>
          {/* Header */}
          <SafeAreaView style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(255,255,255,0.1)',
            zIndex: 10000
          }}>
            <View style={{ 
              paddingHorizontal: 16, 
              paddingVertical: 12, 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center'
            }}>
              <View style={{ width: 24 }} />
              <Text style={{ 
                fontSize: 18,
                fontWeight: '600',
                color: '#fff'
              }}>Full Image</Text>
              <TouchableOpacity onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                
                setIsTransitioning(true);
                
                // Exit animation
                Animated.parallel([
                  Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                  }),
                  Animated.timing(scaleAnim, {
                    toValue: 0.9,
                    duration: 250,
                    useNativeDriver: true,
                  })
                ]).start(() => {
                  setShowImagePreview(false);
                  setPreviewUri(null);
                  setImageLoading(false);
                  setIsTransitioning(false);
                });
              }}>
                <Text style={{ color: '#007AFF', fontSize: 16, fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
          
          {/* Image Container */}
          <Animated.View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center',
            paddingTop: 100,
            zIndex: 9999,
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }}>
            {previewUri ? (
              <>
                {/* Loading State */}
                {imageLoading && (
                  <View style={{
                    position: 'absolute',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    height: '100%',
                    zIndex: 10001,
                    backgroundColor: 'rgba(0,0,0,0.8)'
                  }}>
                    <View style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 12,
                      padding: 24,
                      alignItems: 'center'
                    }}>
                      <ActivityIndicator size="large" color="#fff" />
                      <Text style={{ 
                        color: '#fff', 
                        marginTop: 16, 
                        fontSize: 16,
                        fontWeight: '500'
                      }}>
                        Loading full image...
                      </Text>
                    </View>
                  </View>
                )}
                
                {/* PDF-style Image Preview */}
                <Animated.View style={{
                  width: '90%',
                  height: '80%',
                  opacity: imageLoading ? 0 : 1,
                  backgroundColor: '#fff',
                  borderRadius: 4,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 10,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#ddd'
                }}>
                  {/* PDF Page Content */}
                  <View style={{
                    width: '100%',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#fff'
                  }}>
                    {previewUri ? (
                      <Image 
                        source={{ uri: previewUri }} 
                        style={{ 
                          width: '100%',
                          height: '100%'
                        }} 
                        resizeMode="contain"
                        onLoad={() => {
                          console.log('✅ Image loaded successfully:', previewUri);
                          setImageLoading(false);
                        }}
                        onError={(error) => {
                          console.error('❌ Image load error:', error.nativeEvent.error);
                          console.log('Failed URI:', previewUri);
                          setImageLoading(false);
                        }}
                        onLoadStart={() => {
                          console.log('⏳ Image loading started:', previewUri);
                          setImageLoading(true);
                        }}
                      />
                    ) : (
                      <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ color: '#666', fontSize: 16 }}>No image to preview</Text>
                        <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>
                          URI: {String(previewUri || 'null')}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {/* PDF Page Indicator */}
                  <View style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 4
                  }}>
                    <Text style={{
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: '600'
                    }}>
                      PDF Preview
                    </Text>
                  </View>
                </Animated.View>
              </>
            ) : (
              <Text style={{ color: '#fff', fontSize: 18 }}>No image selected</Text>
            )}
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
