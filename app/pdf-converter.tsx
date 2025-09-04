import { useTheme } from '@/context/ThemeContext';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import {
    ArrowLeft,
    Eye,
    FileText,
    Plus,
    Settings,
    Trash2
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface SelectedImage {
  uri: string;
  base64?: string;
  width: number;
  height: number;
  id: string;
}

interface PDFSettings {
  title: string;
  quality: 'low' | 'medium' | 'high';
  pageSize: 'A4' | 'Letter' | 'Auto';
  orientation: 'portrait' | 'landscape';
}

const { width: screenWidth } = Dimensions.get('window');

export default function PDFConverterScreen() {
  const { colors } = useTheme();
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [pdfSettings, setPdfSettings] = useState<PDFSettings>({
    title: `Document_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
    quality: 'high',
    pageSize: 'A4',
    orientation: 'portrait'
  });

  const addImages = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 1.0,
        allowsMultipleSelection: true,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const newImages: SelectedImage[] = result.assets.map((asset, index) => ({
          uri: asset.uri,
          base64: asset.base64 || undefined,
          width: asset.width || 0,
          height: asset.height || 0,
          id: `img_${Date.now()}_${index}`
        }));
        
        setSelectedImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert('Error', 'Failed to select images');
    }
  };

  const removeImage = (id: string) => {
    setSelectedImages(prev => prev.filter(img => img.id !== id));
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= selectedImages.length) return;
    
    const newImages = [...selectedImages];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    setSelectedImages(newImages);
  };

  const convertUriToBase64 = async (uri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      let mimeType = 'image/jpeg';
      if (uri.toLowerCase().includes('.png')) {
        mimeType = 'image/png';
      } else if (uri.toLowerCase().includes('.webp')) {
        mimeType = 'image/webp';
      }
      
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('Error converting URI to base64:', error);
      return uri;
    }
  };

  const generatePDF = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Images', 'Please select at least one image to convert to PDF');
      return;
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsConverting(true);
    
    try {
      setConversionProgress('Processing images...');
      
      const processedImages = await Promise.all(
        selectedImages.map(async (image, index) => {
          setConversionProgress(`Converting image ${index + 1} of ${selectedImages.length}...`);
          
          if (image.base64) {
            let mimeType = 'image/jpeg';
            if (image.uri.toLowerCase().includes('.png')) {
              mimeType = 'image/png';
            } else if (image.uri.toLowerCase().includes('.webp')) {
              mimeType = 'image/webp';
            }
            return `data:${mimeType};base64,${image.base64}`;
          } else {
            return await convertUriToBase64(image.uri);
          }
        })
      );

      setConversionProgress('Generating PDF...');

      const pageStyle = pdfSettings.orientation === 'landscape' 
        ? 'width: 297mm; height: 210mm;' 
        : 'width: 210mm; height: 297mm;';
      
      let htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <title>${pdfSettings.title}</title>
            <style>
              @page {
                margin: 0;
                padding: 0;
                size: A4 portrait;
              }
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              html, body {
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
              }
              .page {
                width: 100%;
                height: 100vh;
                page-break-after: always;
                position: relative;
                padding: 0;
                margin: 0;
              }
              .page:last-child {
                page-break-after: avoid;
              }
              .image-cell {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                padding: 0;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              img {
                max-width: none;
                max-height: none;
                width: auto;
                height: auto;
                min-height: 80%;
                min-width: 65.35%;
                display: block;
                margin: auto;
                object-fit: contain;
                object-position: center center;
              }
            </style>
          </head>
          <body>
      `;

      processedImages.forEach((imageSource, index) => {
        htmlContent += `
          <div class="page">
            <div class="image-cell">
              <img src="${imageSource}" alt="Page ${index + 1}" />
            </div>
          </div>
        `;
      });

      htmlContent += `
          </body>
        </html>
      `;

      const pdfWidth = pdfSettings.pageSize === 'A4' ? 595 : 612;
      const pdfHeight = pdfSettings.pageSize === 'A4' ? 842 : 792;
      
      // Optimized scale factors for iPhone/iOS
      const scaleFactor = pdfSettings.quality === 'high' ? 3 : 
                         pdfSettings.quality === 'medium' ? 2.5 : 2;
      
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        width: pdfWidth * scaleFactor,
        height: pdfHeight * scaleFactor,
        margins: {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0,
        },
      });

      setIsConverting(false);
      setConversionProgress('');
      
      // Navigate to success page with PDF data
      router.push({
        pathname: '/pdf-success',
        params: {
          pdfUri: uri,
          pdfTitle: pdfSettings.title,
          selectedImages: JSON.stringify(selectedImages)
        }
      });

    } catch (error) {
      console.error('PDF generation error:', error);
      setIsConverting(false);
      setConversionProgress('');
      Alert.alert('Error', 'Failed to create PDF. Please try again.');
    }
  };

  const renderImageItem = ({ item, index }: { item: SelectedImage; index: number }) => (
    <View style={[styles.imageItem, { borderColor: colors.border }]}>
      <Image source={{ uri: item.uri }} style={styles.imagePreview} />
      
      {/* Page Number - Bottom Left */}
      <View style={styles.pageNumberContainer}>
        <Text style={styles.pageNumberText}>Page {index + 1}</Text>
      </View>
      
      {/* Floating Action Buttons - Top Right */}
      <View style={styles.floatingActions}>
        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: 'rgba(0,122,255,0.9)' }]}
          onPress={() => setPreviewUri(item.uri)}
        >
          <Eye size={16} color="#fff" />
        </TouchableOpacity>
        
        {index > 0 && (
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: 'rgba(52,199,89,0.9)' }]}
            onPress={() => moveImage(index, index - 1)}
          >
            <Text style={[styles.moveButton, { color: '#fff' }]}>↑</Text>
          </TouchableOpacity>
        )}
        
        {index < selectedImages.length - 1 && (
          <TouchableOpacity
            style={[styles.floatingButton, { backgroundColor: 'rgba(52,199,89,0.9)' }]}
            onPress={() => moveImage(index, index + 1)}
          >
            <Text style={[styles.moveButton, { color: '#fff' }]}>↓</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.floatingButton, { backgroundColor: 'rgba(255,68,68,0.9)' }]}
          onPress={() => removeImage(item.id)}
        >
          <Trash2 size={16} color="#fff" />
        </TouchableOpacity>
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
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text,
    },
    addButton: {
      backgroundColor: colors.tint,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    },
    addButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    generateButton: {
      backgroundColor: '#FF6B35',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    generateButtonDisabled: {
      backgroundColor: colors.tabIconDefault,
      opacity: 0.5,
    },
    generateButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '600',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    emptyStateText: {
      fontSize: 18,
      color: colors.tabIconDefault,
      textAlign: 'center',
      marginTop: 16,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: colors.tabIconDefault,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Create PDF</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Settings size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {selectedImages.length === 0 ? (
        <View style={dynamicStyles.emptyState}>
          <FileText size={64} color={colors.tabIconDefault} />
          <Text style={dynamicStyles.emptyStateText}>No Images Selected</Text>
          <Text style={dynamicStyles.emptyStateSubtext}>
            Add images from your gallery to create a PDF document. Each image will fit perfectly on one page.
          </Text>
        </View>
      ) : (
        <FlatList
          data={selectedImages}
          renderItem={renderImageItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <TouchableOpacity 
          style={dynamicStyles.addButton} 
          onPress={addImages}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#fff" />
          <Text style={dynamicStyles.addButtonText}>
            {selectedImages.length === 0 ? 'Select Images' : 'Add More Images'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            dynamicStyles.generateButton,
            selectedImages.length === 0 && dynamicStyles.generateButtonDisabled
          ]}
          onPress={generatePDF}
          disabled={selectedImages.length === 0 || isConverting}
          activeOpacity={0.8}
        >
          {isConverting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FileText size={20} color="#fff" />
          )}
          <Text style={dynamicStyles.generateButtonText}>
            {isConverting ? conversionProgress || 'Creating PDF...' : `Generate PDF (${selectedImages.length} ${selectedImages.length === 1 ? 'page' : 'pages'})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettings(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[dynamicStyles.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={dynamicStyles.headerTitle}>PDF Settings</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            <View style={styles.settingSection}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Document Title</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                value={pdfSettings.title}
                onChangeText={(text) => setPdfSettings(prev => ({ ...prev, title: text }))}
                placeholder="Enter document title"
                placeholderTextColor={colors.tabIconDefault}
              />
            </View>

            <View style={styles.settingSection}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Quality</Text>
              <View style={styles.optionButtons}>
                {(['low', 'medium', 'high'] as const).map((quality) => (
                  <TouchableOpacity
                    key={quality}
                    style={[
                      styles.optionButton,
                      { borderColor: colors.border },
                      pdfSettings.quality === quality && { backgroundColor: colors.tint, borderColor: colors.tint }
                    ]}
                    onPress={() => setPdfSettings(prev => ({ ...prev, quality }))}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      { color: colors.text },
                      pdfSettings.quality === quality && { color: '#fff' }
                    ]}>
                      {quality.charAt(0).toUpperCase() + quality.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.qualityDescription, { color: colors.tabIconDefault }]}>
                High quality uses maximum resolution for crisp, HD images in your PDF
              </Text>
            </View>

            <View style={styles.settingSection}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Page Size</Text>
              <View style={styles.optionButtons}>
                {(['A4', 'Letter', 'Auto'] as const).map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.optionButton,
                      { borderColor: colors.border },
                      pdfSettings.pageSize === size && { backgroundColor: colors.tint, borderColor: colors.tint }
                    ]}
                    onPress={() => setPdfSettings(prev => ({ ...prev, pageSize: size }))}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      { color: colors.text },
                      pdfSettings.pageSize === size && { color: '#fff' }
                    ]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.settingSection}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>Orientation</Text>
              <View style={styles.optionButtons}>
                {(['portrait', 'landscape'] as const).map((orientation) => (
                  <TouchableOpacity
                    key={orientation}
                    style={[
                      styles.optionButton,
                      { borderColor: colors.border },
                      pdfSettings.orientation === orientation && { backgroundColor: colors.tint, borderColor: colors.tint }
                    ]}
                    onPress={() => setPdfSettings(prev => ({ ...prev, orientation }))}
                  >
                    <Text style={[
                      styles.optionButtonText,
                      { color: colors.text },
                      pdfSettings.orientation === orientation && { color: '#fff' }
                    ]}>
                      {orientation.charAt(0).toUpperCase() + orientation.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Preview Modal */}
      <Modal
        visible={!!previewUri}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPreviewUri(null)}
      >
        <View style={styles.previewOverlay}>
          <TouchableOpacity 
            style={styles.previewCloseButton}
            onPress={() => setPreviewUri(null)}
          >
            <Text style={styles.previewCloseText}>✕</Text>
          </TouchableOpacity>
          
          {previewUri && (
            <Image 
              source={{ uri: previewUri }} 
              style={styles.previewImageLarge}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imageItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  pageNumberContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  pageNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  floatingActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'column',
    gap: 6,
  },
  floatingButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  imageControls: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageNumber: {
    fontSize: 14,
    fontWeight: '600',
  },
  imageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  moveButton: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingSection: {
    marginBottom: 24,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  qualityDescription: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewImageLarge: {
    width: '90%',
    height: '80%',
  },
});
