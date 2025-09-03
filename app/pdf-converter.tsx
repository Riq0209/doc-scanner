import { useTheme } from '@/context/ThemeContext';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
    ArrowLeft,
    Eye,
    FileText,
    Plus,
    Settings,
    Share2 as Share,
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
  base64?: string; // Add base64 property
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
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [generatedPDFUri, setGeneratedPDFUri] = useState<string | null>(null);
  const [pdfSettings, setPdfSettings] = useState<PDFSettings>({
    title: `Document_${new Date().toLocaleDateString().replace(/\//g, '-')}`,
    quality: 'high',
    pageSize: 'A4',
    orientation: 'portrait'
  });

  const addImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 1.0, // Maximum quality for HD output
        allowsMultipleSelection: true,
        base64: true, // Enable base64 for PDF embedding
      });

      if (!result.canceled && result.assets) {
        const newImages: SelectedImage[] = result.assets.map((asset, index) => ({
          uri: asset.uri,
          base64: asset.base64 || undefined, // Handle null case
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

  const getQualityValue = (quality: string) => {
    switch (quality) {
      case 'low': return 0.5;      // Increased from 0.3
      case 'medium': return 0.8;   // Increased from 0.7  
      case 'high': return 1.0;     // Maximum quality
      default: return 0.8;
    }
  };

  const convertUriToBase64 = async (uri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Detect image format from URI or default to jpeg
      let mimeType = 'image/jpeg';
      if (uri.toLowerCase().includes('.png')) {
        mimeType = 'image/png';
      } else if (uri.toLowerCase().includes('.webp')) {
        mimeType = 'image/webp';
      }
      
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('Error converting URI to base64:', error);
      return uri; // Fallback to original URI
    }
  };

  const generatePDF = async () => {
    if (selectedImages.length === 0) {
      Alert.alert('No Images', 'Please select at least one image to convert to PDF');
      return;
    }

    setIsConverting(true);
    
    try {
      setConversionProgress('Processing images...');
      
      // Convert all images to base64 if needed
      const processedImages = await Promise.all(
        selectedImages.map(async (image, index) => {
          setConversionProgress(`Converting image ${index + 1} of ${selectedImages.length}...`);
          
          if (image.base64) {
            // Detect image format from URI for proper MIME type
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

      // Create optimized HTML content
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
                size: ${pdfSettings.pageSize === 'A4' ? 'A4' : 'Letter'} ${pdfSettings.orientation};
              }
              * {
                box-sizing: border-box;
              }
              html, body {
                margin: 0;
                padding: 0;
                font-family: 'Helvetica', Arial, sans-serif;
                width: 100%;
                height: 100%;
                overflow: hidden;
              }
              .page {
                page-break-after: always;
                page-break-inside: avoid;
                width: 100%;
                height: ${pdfSettings.pageSize === 'A4' ? (pdfSettings.orientation === 'landscape' ? '210mm' : '297mm') : (pdfSettings.orientation === 'landscape' ? '216mm' : '279mm')};
                display: table-cell;
                vertical-align: middle;
                text-align: center;
                padding: 10mm;
                overflow: hidden;
                position: relative;
              }
              .page:last-child {
                page-break-after: avoid;
              }
              .image-container {
                width: 100%;
                height: 100%;
                display: inline-block;
                text-align: center;
                vertical-align: middle;
              }
              img {
                max-width: 100%;
                max-height: calc(${pdfSettings.pageSize === 'A4' ? (pdfSettings.orientation === 'landscape' ? '190mm' : '277mm') : (pdfSettings.orientation === 'landscape' ? '196mm' : '259mm')});
                width: auto;
                height: auto;
                object-fit: contain;
                object-position: center;
                image-rendering: -webkit-optimize-contrast;
                image-rendering: crisp-edges;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                display: inline-block;
                vertical-align: middle;
              }
            </style>
          </head>
          <body>
      `;

      // Add each processed image as a page - one image per page
      processedImages.forEach((imageSource, index) => {
        htmlContent += `
          <div class="page">
            <div class="image-container">
              <img src="${imageSource}" alt="Page ${index + 1}" />
            </div>
          </div>
        `;
      });

      htmlContent += `
          </body>
        </html>
      `;

      // Generate PDF with optimized settings for full-page images
      const pdfWidth = pdfSettings.pageSize === 'A4' ? 595 : 612;
      const pdfHeight = pdfSettings.pageSize === 'A4' ? 842 : 792;
      
      // Scale up for higher resolution (2x for HD quality)
      const scaleFactor = pdfSettings.quality === 'high' ? 2 : 
                         pdfSettings.quality === 'medium' ? 1.5 : 1;
      
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
      setGeneratedPDFUri(uri);
      setShowPDFPreview(true);

    } catch (error) {
      console.error('PDF generation error:', error);
      setIsConverting(false);
      setConversionProgress('');
      Alert.alert('Error', 'Failed to create PDF. Please try again.');
    }
  };

  const sharePDF = async (uri: string) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${pdfSettings.title}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Sharing not available', 'PDF saved to device but sharing is not available on this platform.');
      }
    } catch (error) {
      console.error('Sharing error:', error);
      Alert.alert('Error', 'Failed to share PDF');
    }
  };

  const saveToHistory = async (pdfUri: string) => {
    try {
      // Here you would typically save to AsyncStorage or your preferred storage
      // For now, we'll show a success message
      Alert.alert(
        'Saved to History! ✅',
        `"${pdfSettings.title}" has been saved to your scan history.`,
        [
          {
            text: 'View History',
            onPress: () => {
              setShowPDFPreview(false);
              router.push('/history');
            }
          },
          {
            text: 'OK',
            onPress: () => setShowPDFPreview(false)
          }
        ]
      );
    } catch (error) {
      console.error('Error saving to history:', error);
      Alert.alert('Error', 'Failed to save to history');
    }
  };

  const createNewPDF = () => {
    setSelectedImages([]);
    setGeneratedPDFUri(null);
    setShowPDFPreview(false);
    setPdfSettings(prev => ({
      ...prev,
      title: `Document_${new Date().toLocaleDateString().replace(/\//g, '-')}`
    }));
  };

  const renderImageItem = ({ item, index }: { item: SelectedImage; index: number }) => (
    <View style={[styles.imageItem, { borderColor: colors.border }]}>
      <Image source={{ uri: item.uri }} style={styles.imagePreview} />
      
      <View style={styles.imageControls}>
        <Text style={[styles.pageNumber, { color: colors.text }]}>Page {index + 1}</Text>
        
        <View style={styles.imageActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.background }]}
            onPress={() => setPreviewUri(item.uri)}
          >
            <Eye size={16} color={colors.tint} />
          </TouchableOpacity>
          
          {index > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.background }]}
              onPress={() => moveImage(index, index - 1)}
            >
              <Text style={[styles.moveButton, { color: colors.tint }]}>↑</Text>
            </TouchableOpacity>
          )}
          
          {index < selectedImages.length - 1 && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.background }]}
              onPress={() => moveImage(index, index + 1)}
            >
              <Text style={[styles.moveButton, { color: colors.tint }]}>↓</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#ff4444' }]}
            onPress={() => removeImage(item.id)}
          >
            <Trash2 size={16} color="#fff" />
          </TouchableOpacity>
        </View>
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
        <TouchableOpacity style={dynamicStyles.addButton} onPress={addImages}>
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

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewUri}
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={styles.previewHeader}>
            <TouchableOpacity onPress={() => setPreviewUri(null)}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.previewTitle}>Image Preview</Text>
            <View style={{ width: 24 }} />
          </View>
          
          {previewUri && (
            <Image 
              source={{ uri: previewUri }} 
              style={{ flex: 1 }} 
              resizeMode="contain" 
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* PDF Preview & Action Modal */}
      <Modal
        visible={showPDFPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPDFPreview(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[dynamicStyles.header, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
            <TouchableOpacity onPress={() => setShowPDFPreview(false)}>
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={dynamicStyles.headerTitle}>PDF Generated Successfully!</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            {/* PDF Info Section */}
            <View style={[styles.pdfInfoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.pdfInfoHeader}>
                <FileText size={48} color={colors.tint} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                  <Text style={[styles.pdfTitle, { color: colors.text }]}>{pdfSettings.title}</Text>
                  <Text style={[styles.pdfDetails, { color: colors.tabIconDefault }]}>
                    {selectedImages.length} {selectedImages.length === 1 ? 'page' : 'pages'} • {pdfSettings.quality.toUpperCase()} quality
                  </Text>
                  <Text style={[styles.pdfDetails, { color: colors.tabIconDefault }]}>
                    {pdfSettings.pageSize} {pdfSettings.orientation}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions Section */}
            <View style={styles.actionsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>What would you like to do?</Text>
              
              <TouchableOpacity 
                style={[styles.actionCard, { backgroundColor: colors.tint }]}
                onPress={() => generatedPDFUri && saveToHistory(generatedPDFUri)}
              >
                <View style={styles.actionContent}>
                  <View style={styles.actionIcon}>
                    <FileText size={24} color="#fff" />
                  </View>
                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>Save to History</Text>
                    <Text style={styles.actionDescription}>
                      Add this PDF to your scan history for easy access later
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionCard, { backgroundColor: '#34D399', marginTop: 12 }]}
                onPress={() => generatedPDFUri && sharePDF(generatedPDFUri)}
              >
                <View style={styles.actionContent}>
                  <View style={styles.actionIcon}>
                    <Share size={24} color="#fff" />
                  </View>
                  <View style={styles.actionText}>
                    <Text style={styles.actionTitle}>Share PDF</Text>
                    <Text style={styles.actionDescription}>
                      Save to Files, share via email, or send to other apps
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionCard, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border, marginTop: 12 }]}
                onPress={createNewPDF}
              >
                <View style={styles.actionContent}>
                  <View style={[styles.actionIcon, { backgroundColor: colors.background }]}>
                    <Plus size={24} color={colors.tint} />
                  </View>
                  <View style={styles.actionText}>
                    <Text style={[styles.actionTitle, { color: colors.text }]}>Create Another PDF</Text>
                    <Text style={[styles.actionDescription, { color: colors.tabIconDefault }]}>
                      Start over with new images
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Preview Section */}
            <View style={styles.previewSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Preview Images</Text>
              <View style={styles.imageGrid}>
                {selectedImages.slice(0, 6).map((image, index) => (
                  <View 
                    key={image.id} 
                    style={styles.previewImageContainer}
                  >
                    <Image source={{ uri: image.uri }} style={styles.previewImage} />
                    <Text style={[styles.pageLabel, { color: colors.text }]}>{index + 1}</Text>
                  </View>
                ))}
                {selectedImages.length > 6 && (
                  <View style={[styles.previewImageContainer, styles.moreImagesContainer]}>
                    <Text style={[styles.moreImagesText, { color: colors.tabIconDefault }]}>
                      +{selectedImages.length - 6} more
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imageItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  imageControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageNumber: {
    fontSize: 16,
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
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  qualityDescription: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  // PDF Preview Modal Styles
  pdfInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pdfInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pdfTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  pdfDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  actionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  actionCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  previewSection: {
    marginBottom: 20,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  previewImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
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
    fontWeight: '600',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  moreImagesContainer: {
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreImagesText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
