import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as Print from 'expo-print';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Download,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Italic,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Scissors,
  Underline,
  X
} from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type ScanResultParams = {
  imageUri: string;
  imageBase64?: string;
  extractedText?: string;
  documentTitle?: string;
  fromHistory?: string;
  mode?: string;
};

type ScanHistoryItem = {
  id: string;
  imageUri: string;
  extractedText: string;
  timestamp: number;
  preview: string;
  title?: string;
};

export default function ScanResultScreen() {
  const { colors } = useTheme();
  const { imageUri, imageBase64, extractedText: preExtractedText, documentTitle: preDocumentTitle, fromHistory, mode } = useLocalSearchParams<ScanResultParams>();
  const [extractedText, setExtractedText] = useState<string>(preExtractedText || '');
  const [isLoading, setIsLoading] = useState(!preExtractedText);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(fromHistory === 'true');
  const [isEditingText, setIsEditingText] = useState(false);
  const [editableText, setEditableText] = useState<string>(preExtractedText || '');
  const [documentTitle, setDocumentTitle] = useState<string>(preDocumentTitle || '');
  const [showExportOptions, setShowExportOptions] = useState(false);
  
  // Enhanced rich text editing state
  const [selectedText, setSelectedText] = useState<{start: number, end: number}>({start: 0, end: 0});
  const [textAlignment, setTextAlignment] = useState<'left' | 'center' | 'right'>('left');
  const [formattedSegments, setFormattedSegments] = useState<Array<{
    text: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: number;
    color?: string;
    backgroundColor?: string;
    start: number;
    end: number;
    id: string;
  }>>([]);
  const [showFormattingToolbar, setShowFormattingToolbar] = useState(false);
  const [activeFormats, setActiveFormats] = useState<{
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontSize: number;
    color: string;
  }>({
    bold: false,
    italic: false,
    underline: false,
    fontSize: 16,
    color: '#000000'
  });
  const [editHistory, setEditHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showAdvancedToolbar, setShowAdvancedToolbar] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  
  const textInputRef = useRef<TextInput>(null);
  
  console.log('ScanResultScreen params:', {
    imageUri,
    hasImageBase64: !!imageBase64,
    imageBase64Length: imageBase64?.length,
    preExtractedText,
    preDocumentTitle,
    fromHistory
  });

  // Generate simple document title from first 3 words (like Canva)
  const generateIntelligentTitle = (text: string) => {
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

  // Initialize document title on component mount
  useEffect(() => {
    if (!documentTitle && !fromHistory) {
      // If we already have a pre-extracted title, use it
      if (preDocumentTitle) {
        setDocumentTitle(preDocumentTitle);
      } else if (extractedText) {
        // Otherwise generate from extracted text
        setDocumentTitle(generateIntelligentTitle(extractedText));
      }
    }
  }, [extractedText, preDocumentTitle]);

  // Initialize text counts
  useEffect(() => {
    if (extractedText) {
      updateCounts(extractedText);
    }
  }, [extractedText]);

  // Sync activeFormats color with theme when not custom color
  useEffect(() => {
    if (activeFormats.color === '#000000') {
      setActiveFormats(prev => ({
        ...prev,
        color: colors.text
      }));
    }
  }, [colors.text]);

  // Alternative OCR service using OCR.space API (free tier)
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

  const extractTextFromImage = useCallback(async () => {
    console.log('extractTextFromImage called');
    
    let base64Data = imageBase64;
    
    // If no base64 data was passed, convert the image URI to base64
    if (!base64Data && imageUri) {
      console.log('No imageBase64 provided, converting from imageUri...');
      try {
        base64Data = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        console.log('Base64 conversion from URI completed, length:', base64Data.length);
      } catch (conversionError) {
        console.error('Failed to convert image to base64:', conversionError);
        setError('Failed to process image for text extraction');
        setIsLoading(false);
        return;
      }
    }
    
    if (!base64Data) {
      console.log('No image data available for text extraction');
      setError('No image data available');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('Starting text extraction API call...');

      // Try multiple API response formats
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
          setExtractedText(alternativeResult);
          setEditableText(alternativeResult);
          return;
        }
        
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      
      const extractedText = data.completion || data.message || data.text || data.response || 'No text detected';
      console.log('Extracted text:', extractedText);
      setExtractedText(extractedText);
      setEditableText(extractedText);
    } catch (error) {
      console.error('API text extraction error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        setError('Text extraction timed out. Please try again.');
      } else if (error instanceof Error && error.message.includes('Network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        // Try alternative OCR service as last resort
        console.log('Trying alternative OCR service as fallback...');
        try {
          const alternativeResult = await tryAlternativeOCR(base64Data);
          if (alternativeResult) {
            setExtractedText(alternativeResult);
            setEditableText(alternativeResult);
            return;
          }
        } catch (altError) {
          console.error('Alternative OCR also failed:', altError);
        }
        
        setError('Failed to extract text from image. Please try again or check your internet connection.');
      }
    } finally {
      setIsLoading(false);
      console.log('Text extraction process completed');
    }
  }, [imageBase64, imageUri]);

  useEffect(() => {
    if (!preExtractedText) {
      extractTextFromImage();
    }
  }, [preExtractedText, extractTextFromImage]);

  const copyToClipboard = async () => {
    const textToCopy = isEditingText ? editableText : extractedText;
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      Alert.alert('Copied', 'Text copied to clipboard');
    }
  };

  const formatText = (option: 'uppercase' | 'lowercase' | 'title' | 'paragraph' | 'bullet') => {
    let formatted = editableText;
    
    switch (option) {
      case 'uppercase':
        formatted = editableText.toUpperCase();
        break;
      case 'lowercase':
        formatted = editableText.toLowerCase();
        break;
      case 'title':
        formatted = editableText.replace(/\w\S*/g, (txt) => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        break;
      case 'paragraph':
        formatted = editableText.replace(/\n\n+/g, '\n\n').replace(/\n(?!\n)/g, ' ');
        break;
      case 'bullet':
        formatted = editableText
          .split('\n')
          .filter(line => line.trim())
          .map(line => `• ${line.trim()}`)
          .join('\n');
        break;
    }
    
    setEditableText(formatted);
  };

  const showFormatOptions = () => {
    Alert.alert(
      'Format Text',
      'Choose formatting option:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'UPPERCASE', onPress: () => formatText('uppercase') },
        { text: 'lowercase', onPress: () => formatText('lowercase') },
        { text: 'Title Case', onPress: () => formatText('title') },
        { text: 'Paragraph', onPress: () => formatText('paragraph') },
        { text: 'Bullet Points', onPress: () => formatText('bullet') },
      ]
    );
  };

  const saveEditedText = () => {
    setExtractedText(editableText);
    setIsEditingText(false);
    setShowFormattingToolbar(false);
    setPreviewMode(false);
    updateCounts(editableText);
    // Don't clear formattedSegments when saving - preserve formatting
    Alert.alert('Saved', 'Text changes saved successfully');
  };

  const cancelEdit = () => {
    setEditableText(extractedText);
    setIsEditingText(false);
    setShowFormattingToolbar(false);
    setFormattedSegments([]);
    setPreviewMode(false);
    setActiveFormats({
      bold: false,
      italic: false,
      underline: false,
      fontSize: 16,
      color: colors.text
    });
    // Reset edit history
    setEditHistory([extractedText]);
    setHistoryIndex(0);
  };

  const startEditing = () => {
    setEditableText(extractedText);
    setIsEditingText(true);
    // Initialize formatted segments with the current text
    if (extractedText) {
      setFormattedSegments([{
        text: extractedText,
        start: 0,
        end: extractedText.length,
        id: `segment-${Date.now()}`
      }]);
    }
    // Add to edit history
    setEditHistory(prev => [...prev, extractedText]);
    setHistoryIndex(prev => prev + 1);
    updateCounts(extractedText);
  };

  // Enhanced utility functions
  const updateCounts = (text: string) => {
    setCharacterCount(text.length);
    setWordCount(text.trim().split(/\s+/).filter(word => word.length > 0).length);
  };

  const generateSegmentId = () => `segment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Enhanced rich text formatting functions with undo/redo support
  const addToHistory = (text: string) => {
    const newHistory = editHistory.slice(0, historyIndex + 1);
    newHistory.push(text);
    setEditHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const previousText = editHistory[historyIndex - 1];
      setEditableText(previousText);
      setHistoryIndex(historyIndex - 1);
      updateCounts(previousText);
    }
  };

  const redo = () => {
    if (historyIndex < editHistory.length - 1) {
      const nextText = editHistory[historyIndex + 1];
      setEditableText(nextText);
      setHistoryIndex(historyIndex + 1);
      updateCounts(nextText);
    }
  };

  const applyFormatting = (formatType: 'bold' | 'italic' | 'underline' | 'fontSize' | 'color', value?: any) => {
    if (selectedText.start === selectedText.end) return; // No text selected
    
    const newSegment = {
      text: editableText.substring(selectedText.start, selectedText.end),
      bold: formatType === 'bold' ? true : undefined,
      italic: formatType === 'italic' ? true : undefined,
      underline: formatType === 'underline' ? true : undefined,
      fontSize: formatType === 'fontSize' ? value : activeFormats.fontSize,
      color: formatType === 'color' ? value : activeFormats.color,
      start: selectedText.start,
      end: selectedText.end,
      id: generateSegmentId(),
    };
    
    setFormattedSegments(prev => {
      // Remove any existing segments that overlap with the new selection
      const filtered = prev.filter(segment => 
        segment.end <= selectedText.start || segment.start >= selectedText.end
      );
      return [...filtered, newSegment];
    });

    // Update active formats
    if (formatType === 'bold' || formatType === 'italic' || formatType === 'underline') {
      setActiveFormats(prev => ({
        ...prev,
        [formatType]: !prev[formatType]
      }));
    } else if (formatType === 'fontSize' || formatType === 'color') {
      setActiveFormats(prev => ({
        ...prev,
        [formatType]: value
      }));
    }

    // Add to history
    addToHistory(editableText);
  };

  const changeFontSize = (delta: number) => {
    const newSize = Math.max(8, Math.min(32, activeFormats.fontSize + delta));
    setActiveFormats(prev => ({ ...prev, fontSize: newSize }));
    if (selectedText.start !== selectedText.end) {
      applyFormatting('fontSize', newSize);
    }
  };

  const clearFormatting = () => {
    if (selectedText.start === selectedText.end) return;
    
    setFormattedSegments(prev => 
      prev.filter(segment => 
        segment.end <= selectedText.start || segment.start >= selectedText.end
      )
    );
    addToHistory(editableText);
  };

  const changeAlignment = (alignment: 'left' | 'center' | 'right') => {
    setTextAlignment(alignment);
  };

  const handleTextSelection = (event: any) => {
    const { selection } = event.nativeEvent;
    setSelectedText({ start: selection.start, end: selection.end });
    setShowFormattingToolbar(selection.start !== selection.end);
    
    // Update active formats based on selection
    if (selection.start !== selection.end) {
      const selectedSegments = formattedSegments.filter(segment =>
        segment.start <= selection.start && segment.end >= selection.end
      );
      
      if (selectedSegments.length > 0) {
        const segment = selectedSegments[0];
        setActiveFormats(prev => ({
          ...prev,
          bold: segment.bold || false,
          italic: segment.italic || false,
          underline: segment.underline || false,
          fontSize: segment.fontSize || 16,
          color: segment.color || '#000000'
        }));
      }
    }
  };

  const handleTextChange = (text: string) => {
    setEditableText(text);
    updateCounts(text);
    
    // Auto-save to history every 10 characters
    if (Math.abs(text.length - (editHistory[historyIndex]?.length || 0)) >= 10) {
      addToHistory(text);
    }
  };

  const insertText = (textToInsert: string) => {
    const start = selectedText.start;
    const end = selectedText.end;
    const newText = editableText.substring(0, start) + textToInsert + editableText.substring(end);
    setEditableText(newText);
    updateCounts(newText);
    addToHistory(newText);
    
    // Move cursor to end of inserted text
    const newCursorPosition = start + textToInsert.length;
    setSelectedText({ start: newCursorPosition, end: newCursorPosition });
  };

  const duplicateSelection = () => {
    if (selectedText.start === selectedText.end) return;
    const selectedTextContent = editableText.substring(selectedText.start, selectedText.end);
    insertText(selectedTextContent);
  };

  const deleteSelection = () => {
    if (selectedText.start === selectedText.end) return;
    const newText = editableText.substring(0, selectedText.start) + editableText.substring(selectedText.end);
    setEditableText(newText);
    updateCounts(newText);
    addToHistory(newText);
    setSelectedText({ start: selectedText.start, end: selectedText.start });
  };

  const renderFormattedText = () => {
    if (formattedSegments.length === 0) {
      return (
        <Text style={[styles.extractedTextDisplay, { 
          textAlign: textAlignment,
          fontSize: activeFormats.fontSize,
          color: activeFormats.color 
        }]} selectable>
          {extractedText}
        </Text>
      );
    }

    // Split text into segments with formatting
    const segments: Array<{
      text: string;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      fontSize?: number;
      color?: string;
      backgroundColor?: string;
      key: string;
    }> = [];
    let lastIndex = 0;
    
    const sortedSegments = formattedSegments.sort((a, b) => a.start - b.start);
    
    sortedSegments.forEach((segment, index) => {
      // Add unformatted text before this segment
      if (segment.start > lastIndex) {
        segments.push({
          text: extractedText.substring(lastIndex, segment.start),
          key: `unformatted-${index}`,
        });
      }
      
      // Add formatted segment
      segments.push({
        text: segment.text,
        bold: segment.bold,
        italic: segment.italic,
        underline: segment.underline,
        fontSize: segment.fontSize,
        color: segment.color,
        backgroundColor: segment.backgroundColor,
        key: `formatted-${index}`,
      });
      
      lastIndex = segment.end;
    });
    
    // Add remaining unformatted text
    if (lastIndex < extractedText.length) {
      segments.push({
        text: extractedText.substring(lastIndex),
        key: 'final-unformatted',
      });
    }
    
    return (
      <Text style={[styles.extractedTextDisplay, { textAlign: textAlignment }]} selectable>
        {segments.map((segment) => (
          <Text
            key={segment.key}
            style={{
              fontWeight: segment.bold ? 'bold' : 'normal',
              fontStyle: segment.italic ? 'italic' : 'normal',
              textDecorationLine: segment.underline ? 'underline' : 'none',
              fontSize: segment.fontSize || activeFormats.fontSize,
              color: segment.color || activeFormats.color,
              backgroundColor: segment.backgroundColor,
            }}
          >
            {segment.text}
          </Text>
        ))}
      </Text>
    );
  };

  const saveToHistory = async () => {
    const textToSave = isEditingText ? editableText : extractedText;
    const titleToSave = documentTitle.trim() || generateIntelligentTitle(textToSave);
    
    if (!textToSave || !imageUri || isSaved) return;

    try {
      const historyItem: ScanHistoryItem = {
        id: Date.now().toString(),
        imageUri,
        extractedText: textToSave,
        timestamp: Date.now(),
        preview: textToSave.substring(0, 100),
        title: titleToSave,
      };

      const existingHistory = await AsyncStorage.getItem('scan_history');
      const history: ScanHistoryItem[] = existingHistory ? JSON.parse(existingHistory) : [];
      
      history.unshift(historyItem);
      
      // Keep only the last 50 items
      if (history.length > 50) {
        history.splice(50);
      }

      await AsyncStorage.setItem('scan_history', JSON.stringify(history));
      setIsSaved(true);
      
      // Show export options after saving
      setShowExportOptions(true);
    } catch (error) {
      console.error('Failed to save to history:', error);
      Alert.alert('Error', 'Failed to save scan');
    }
  };

  const retryExtraction = () => {
    console.log('Manual retry triggered');
    extractTextFromImage();
  };

  // Test function for debugging
  const testOCR = async () => {
    console.log('Test OCR triggered');
    Alert.alert(
      'Test OCR',
      'Choose test method:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Test API', 
          onPress: () => {
            setExtractedText('Test API Result: This is sample extracted text from the API.');
            setEditableText('Test API Result: This is sample extracted text from the API.');
          }
        },
        { 
          text: 'Test Image Info', 
          onPress: () => {
            const info = `Image URI: ${imageUri}\nBase64 Length: ${imageBase64?.length || 0}\nFrom History: ${fromHistory}`;
            setExtractedText(info);
            setEditableText(info);
          }
        },
      ]
    );
  };

  const exportTextAsPDF = async () => {
    const textToExport = isEditingText ? editableText : extractedText;
    if (!textToExport) {
      Alert.alert('Error', 'No text to export');
      return;
    }

    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Scanned Document</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #007AFF;
              padding-bottom: 20px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              color: #007AFF;
              margin-bottom: 10px;
            }
            .date {
              color: #666;
              font-size: 14px;
            }
            .content {
              white-space: pre-wrap;
              word-wrap: break-word;
              font-size: 16px;
              line-height: 1.8;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Scanned Document</div>
            <div class="date">${new Date().toLocaleDateString()}</div>
          </div>
          <div class="content">${textToExport.replace(/\n/g, '<br>')}</div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      if (Platform.OS === 'web') {
        // For web, create a download link
        const link = document.createElement('a');
        link.href = uri;
        link.download = `scanned-text-${Date.now()}.pdf`;
        link.click();
      } else {
        // For mobile, use sharing
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export Text as PDF',
        });
      }

      Alert.alert('Success', 'Text exported as PDF');
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Error', 'Failed to export PDF');
    }
  };

  const exportImageAs = async (format: 'pdf' | 'png' | 'jpeg') => {
    if (!imageUri) {
      Alert.alert('Error', 'No image to export');
      return;
    }

    try {
      if (format === 'pdf') {
        // Export image as PDF
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Scanned Image</title>
            <style>
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              }
              .header {
                text-align: center;
                margin-bottom: 20px;
              }
              .title {
                font-size: 20px;
                font-weight: bold;
                color: #007AFF;
                margin-bottom: 5px;
              }
              .date {
                color: #666;
                font-size: 12px;
              }
              img {
                max-width: 100%;
                height: auto;
                border: 1px solid #ddd;
                border-radius: 8px;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="title">Scanned Document</div>
              <div class="date">${new Date().toLocaleDateString()}</div>
            </div>
            <img src="${imageUri}" alt="Scanned Document" />
          </body>
          </html>
        `;

        const { uri } = await Print.printToFileAsync({
          html: htmlContent,
          base64: false,
        });

        if (Platform.OS === 'web') {
          const link = document.createElement('a');
          link.href = uri;
          link.download = `scanned-image-${Date.now()}.pdf`;
          link.click();
        } else {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Export Image as PDF',
          });
        }
      } else {
        // Export as PNG or JPEG
        const fileExtension = format === 'png' ? 'png' : 'jpg';
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        
        if (Platform.OS === 'web') {
          // For web, create download link
          const link = document.createElement('a');
          link.href = imageUri;
          link.download = `scanned-image-${Date.now()}.${fileExtension}`;
          link.click();
        } else {
          // For mobile, copy to documents directory and share
          const fileName = `scanned-image-${Date.now()}.${fileExtension}`;
          const newUri = `${FileSystem.documentDirectory}${fileName}`;
          
          await FileSystem.copyAsync({
            from: imageUri,
            to: newUri,
          });
          
          await Sharing.shareAsync(newUri, {
            mimeType,
            dialogTitle: `Export Image as ${format.toUpperCase()}`,
          });
        }
      }

      Alert.alert('Success', `Image exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', `Failed to export as ${format.toUpperCase()}`);
    }
  };

  const handleShowExportOptions = () => {
    setShowExportOptions(true);
  };

  const handleExport = async (format: 'pdf' | 'png' | 'jpg') => {
    setShowExportOptions(false);
    
    try {
      if (format === 'pdf') {
        await exportTextAsPDF();
      } else {
        await exportImage(format);
      }
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert('Export Failed', 'There was an error exporting your document.');
    }
  };

  const exportImage = async (format: 'png' | 'jpg') => {
    try {
      const fileExtension = format;
      const fileName = `scan_${new Date().getTime()}.${fileExtension}`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      
      // Copy the image to a new file with the desired format
      await FileSystem.copyAsync({
        from: imageUri,
        to: fileUri,
      });
      
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error('Image export failed:', error);
      Alert.alert('Export Failed', 'Failed to export image.');
    }
  };

  const showImageExportOptions = () => {
    Alert.alert(
      'Export Image As',
      'Choose image format:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'PDF',
          onPress: () => exportImageAs('pdf'),
        },
        {
          text: 'PNG',
          onPress: () => exportImageAs('png'),
        },
        {
          text: 'JPEG',
          onPress: () => exportImageAs('jpeg'),
        },
      ]
    );
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
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    textContainer: {
      minHeight: 120,
      backgroundColor: colors.background,
      borderRadius: 8,
      padding: 12,
      borderWidth: isEditingText ? 2 : 1,
      borderColor: isEditingText ? colors.tint : colors.border,
    },
    textInput: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.text,
      textAlignVertical: 'top',
      minHeight: 120,
    },
    extractedText: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.text,
    },
    textTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    titleLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    titleInput: {
      fontSize: 16,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 16,
      color: colors.tabIconDefault,
    },
    errorText: {
      fontSize: 16,
      color: colors.destructive,
      textAlign: 'center',
      marginBottom: 16,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: false 
        }} 
      />
      
      <View style={dynamicStyles.header}>
        <View style={styles.headerSpacer} />
        <Text style={dynamicStyles.headerTitle}>{mode === 'scan' ? 'Scan Result' : 'Document Scanner'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 120 : 100 }}
      >
        <View style={[styles.imageContainer, { backgroundColor: colors.background }]}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            contentFit="fill"
            transition={200}
          />
        </View>

        <View style={[styles.documentDetailsSection, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Document Details</Text>
          
          <View style={styles.titleInputSection}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Title</Text>
            <TextInput
              style={[styles.titleInput, { 
                color: colors.text, 
                backgroundColor: colors.cardBackground,
                borderColor: colors.border 
              }]}
              value={documentTitle}
              onChangeText={setDocumentTitle}
              placeholder="Enter document title..."
              placeholderTextColor={colors.tabIconDefault}
              selectionColor={colors.tint}
            />
          </View>
          
          <View style={styles.extractedTextSection}>
            <View style={styles.textHeaderWithButton}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Extracted Text</Text>
              {!isEditingText && extractedText ? (
                <TouchableOpacity 
                  style={[styles.editTextButton, { backgroundColor: colors.tint }]} 
                  onPress={startEditing}
                >
                  <Edit size={16} color="#fff" />
                  <Text style={[styles.editTextButtonText, { color: '#fff' }]}>Edit Text</Text>
                </TouchableOpacity>
              ) : isEditingText ? (
                <View style={styles.editHeaderActions}>
                  <TouchableOpacity style={[styles.editActionHeaderButton, { borderColor: colors.border }]} onPress={cancelEdit}>
                    <Text style={[styles.editActionHeaderButtonText, { color: colors.tabIconDefault }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.editActionHeaderButton, { backgroundColor: colors.tint }]} onPress={saveEditedText}>
                    <Text style={[styles.editActionHeaderButtonText, { color: '#fff' }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            
            {/* Enhanced Formatting Toolbar */}
            {isEditingText && (
              <View style={[styles.enhancedToolbarContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                {/* Main Formatting Toolbar */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarContent}>
                  {/* Basic Formatting */}
                  <TouchableOpacity 
                    style={[styles.formatButton, { 
                      borderColor: colors.border,
                      backgroundColor: activeFormats.bold ? colors.tint : 'transparent'
                    }]} 
                    onPress={() => applyFormatting('bold')}
                  >
                    <Bold size={18} color={activeFormats.bold ? '#fff' : colors.text} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.formatButton, { 
                      borderColor: colors.border,
                      backgroundColor: activeFormats.italic ? colors.tint : 'transparent'
                    }]} 
                    onPress={() => applyFormatting('italic')}
                  >
                    <Italic size={18} color={activeFormats.italic ? '#fff' : colors.text} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.formatButton, { 
                      borderColor: colors.border,
                      backgroundColor: activeFormats.underline ? colors.tint : 'transparent'
                    }]} 
                    onPress={() => applyFormatting('underline')}
                  >
                    <Underline size={18} color={activeFormats.underline ? '#fff' : colors.text} />
                  </TouchableOpacity>
                  
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  
                  {/* Font Size Controls */}
                  <TouchableOpacity 
                    style={[styles.formatButton, { borderColor: colors.border }]} 
                    onPress={() => changeFontSize(-2)}
                  >
                    <Minus size={18} color={colors.text} />
                  </TouchableOpacity>
                  
                  <View style={[styles.fontSizeDisplay, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.fontSizeText, { color: colors.text }]}>{activeFormats.fontSize}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.formatButton, { borderColor: colors.border }]} 
                    onPress={() => changeFontSize(2)}
                  >
                    <Plus size={18} color={colors.text} />
                  </TouchableOpacity>
                  
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  
                  {/* Alignment */}
                  <TouchableOpacity 
                    style={[styles.formatButton, { 
                      borderColor: colors.border,
                      backgroundColor: textAlignment === 'left' ? colors.tint : 'transparent'
                    }]} 
                    onPress={() => changeAlignment('left')}
                  >
                    <AlignLeft size={18} color={textAlignment === 'left' ? '#fff' : colors.text} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.formatButton, { 
                      borderColor: colors.border,
                      backgroundColor: textAlignment === 'center' ? colors.tint : 'transparent'
                    }]} 
                    onPress={() => changeAlignment('center')}
                  >
                    <AlignCenter size={18} color={textAlignment === 'center' ? '#fff' : colors.text} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.formatButton, { 
                      borderColor: colors.border,
                      backgroundColor: textAlignment === 'right' ? colors.tint : 'transparent'
                    }]} 
                    onPress={() => changeAlignment('right')}
                  >
                    <AlignRight size={18} color={textAlignment === 'right' ? '#fff' : colors.text} />
                  </TouchableOpacity>
                  
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                  
                  {/* Utility Tools */}
                  <TouchableOpacity 
                    style={[styles.formatButton, { borderColor: colors.border }]} 
                    onPress={undo}
                    disabled={historyIndex <= 0}
                  >
                    <RotateCcw size={18} color={historyIndex <= 0 ? colors.tabIconDefault : colors.text} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.formatButton, { borderColor: colors.border }]} 
                    onPress={redo}
                    disabled={historyIndex >= editHistory.length - 1}
                  >
                    <RotateCw size={18} color={historyIndex >= editHistory.length - 1 ? colors.tabIconDefault : colors.text} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.formatButton, { borderColor: colors.border }]} 
                    onPress={clearFormatting}
                  >
                    <Scissors size={18} color={colors.text} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.formatButton, { 
                      borderColor: colors.border,
                      backgroundColor: previewMode ? colors.tint : 'transparent'
                    }]} 
                    onPress={() => setPreviewMode(!previewMode)}
                  >
                    {previewMode ? <EyeOff size={18} color="#fff" /> : <Eye size={18} color={colors.text} />}
                  </TouchableOpacity>
                </ScrollView>
                
                {/* Text Statistics */}
                <View style={[styles.textStats, { backgroundColor: colors.background }]}>
                  <Text style={[styles.statText, { color: colors.tabIconDefault }]}>
                    Words: {wordCount} • Characters: {characterCount}
                  </Text>
                  {selectedText.start !== selectedText.end && (
                    <Text style={[styles.statText, { color: colors.tint }]}>
                      Selected: {selectedText.end - selectedText.start} chars
                    </Text>
                  )}
                </View>
              </View>
            )}

            <View style={[styles.textContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.tint} />
                  <Text style={[styles.loadingText, { color: colors.text }]}>Extracting text...</Text>
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { color: '#ff4444' }]}>{error}</Text>
                  <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.tint }]} onPress={retryExtraction}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.tabIconDefault, marginTop: 8 }]} onPress={testOCR}>
                    <Text style={styles.retryButtonText}>Debug OCR</Text>
                  </TouchableOpacity>
                </View>
              ) : isEditingText ? (
                <View>
                  {previewMode ? (
                    <View style={[styles.previewContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                      {renderFormattedText()}
                    </View>
                  ) : (
                    <TextInput
                      ref={textInputRef}
                      style={[styles.textInput, { 
                        textAlign: textAlignment,
                        color: colors.text,
                        backgroundColor: 'transparent',
                        fontSize: activeFormats.fontSize
                      }]}
                      value={editableText}
                      onChangeText={handleTextChange}
                      onSelectionChange={handleTextSelection}
                      multiline
                      placeholder="Enter or edit text..."
                      placeholderTextColor={colors.tabIconDefault}
                      selectionColor={colors.tint}
                    />
                  )}
                </View>
              ) : (
                <View>
                  {renderFormattedText()}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <TouchableOpacity 
          style={[styles.exportButton, { 
            borderColor: colors.tint, 
            backgroundColor: colors.background,
          }]} 
          onPress={() => router.push('/')}
        >
          <Text style={[styles.exportButtonText, { color: colors.tint }]}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, { backgroundColor: colors.tint }]} 
          onPress={handleShowExportOptions}
        >
          <Download size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* Export Options Modal */}
      <Modal
        visible={showExportOptions}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowExportOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View 
            style={[
              styles.modalContent, 
              { backgroundColor: colors.background }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Export Options</Text>
              <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: colors.cardBackground }]}
                onPress={() => setShowExportOptions(false)}
              >
                <X size={20} color={colors.tabIconDefault} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalSubtitle, { color: colors.tabIconDefault }]}>
              Choose your preferred export format
            </Text>
            
            <TouchableOpacity 
              style={[styles.exportOption, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
              onPress={() => handleExport('pdf')}
            >
              <View style={[styles.exportIconContainer, { backgroundColor: '#FF6B6B' }]}>
                <FileText size={24} color="#fff" />
              </View>
              <View style={styles.exportTextContainer}>
                <Text style={[styles.exportOptionText, { color: colors.text }]}>Export as PDF</Text>
                <Text style={[styles.exportOptionSubtext, { color: colors.tabIconDefault }]}>
                  Portable document with text content
                </Text>
              </View>
              <Download size={20} color={colors.tabIconDefault} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.exportOption, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
              onPress={() => handleExport('png')}
            >
              <View style={[styles.exportIconContainer, { backgroundColor: '#4ECDC4' }]}>
                <ImageIcon size={24} color="#fff" />
              </View>
              <View style={styles.exportTextContainer}>
                <Text style={[styles.exportOptionText, { color: colors.text }]}>Export as PNG</Text>
                <Text style={[styles.exportOptionSubtext, { color: colors.tabIconDefault }]}>
                  High-quality image with transparency
                </Text>
              </View>
              <Download size={20} color={colors.tabIconDefault} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.exportOption, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
              onPress={() => handleExport('jpg')}
            >
              <View style={[styles.exportIconContainer, { backgroundColor: '#45B7D1' }]}>
                <ImageIcon size={24} color="#fff" />
              </View>
              <View style={styles.exportTextContainer}>
                <Text style={[styles.exportOptionText, { color: colors.text }]}>Export as JPG</Text>
                <Text style={[styles.exportOptionSubtext, { color: colors.tabIconDefault }]}>
                  Compressed image format
                </Text>
              </View>
              <Download size={20} color={colors.tabIconDefault} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.cancelButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => setShowExportOptions(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.tabIconDefault }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerSpacer: {
    width: 40, // Same width as the removed back button to maintain layout balance
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    margin: 16,
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    minHeight: 250,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
  },
  documentDetailsSection: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  titleInputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontWeight: '400',
  },
  extractedTextSection: {
    flex: 1,
  },
  textContainer: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    minHeight: 120,
    marginTop: 8,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    lineHeight: 24,
  },
  editActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  editActionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  titleSection: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  textSection: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  textHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveEditButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  saveEditButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  editHeaderButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    gap: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Account for home indicator on iOS
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  exportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportTextContainer: {
    flex: 1,
  },
  exportOptionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  exportOptionSubtext: {
    fontSize: 12,
    lineHeight: 16,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  formattingToolbar: {
    marginTop: 8,
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  toolbarTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  toolbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  formatButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    width: 1,
    height: 24,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  extractedTextDisplay: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  enhancedToolbarContainer: {
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  fontSizeDisplay: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  textStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
  },
  previewContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 120,
  },
  textHeaderWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editTextButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  editHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editActionHeaderButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  editActionHeaderButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});