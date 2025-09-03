import { useTheme } from '@/context/ThemeContext';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Camera, Crop, FileText } from 'lucide-react-native';
import React from 'react';
import {
    Dimensions,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function PhotoConfirmationScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ imageUri: string }>();

  const handleCrop = () => {
    router.push({
      pathname: '/crop-image' as any,
      params: { 
        imageUri: params.imageUri,
        mode: 'photo'
      }
    });
  };

  const handleScanText = () => {
    router.push({
      pathname: '/crop-image' as any,
      params: { 
        imageUri: params.imageUri,
        mode: 'scan'
      }
    });
  };

  const handleRetake = () => {
    router.back();
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
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      backgroundColor: colors.background,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    backButton: {
      padding: 8,
      backgroundColor: colors.cardBackground,
      borderRadius: 20,
    },
    imageContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    image: {
      width: screenWidth - 40,
      height: 400,
      borderRadius: 12,
      resizeMode: 'contain',
    },
    actionsContainer: {
      padding: 20,
      backgroundColor: colors.background,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cardBackground,
      paddingVertical: 16,
      paddingHorizontal: 20,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionButtonPrimary: {
      backgroundColor: '#007AFF',
      borderColor: '#007AFF',
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginLeft: 12,
    },
    actionButtonTextPrimary: {
      color: '#fff',
    },
    retakeButton: {
      backgroundColor: colors.destructive,
      borderColor: colors.destructive,
    },
    retakeButtonText: {
      color: '#fff',
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={dynamicStyles.header}>
        <TouchableOpacity style={dynamicStyles.backButton} onPress={handleRetake}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Photo Captured</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={dynamicStyles.imageContainer}>
        <Image source={{ uri: params.imageUri }} style={dynamicStyles.image} />
      </View>

      <View style={dynamicStyles.actionsContainer}>
        <TouchableOpacity
          style={[dynamicStyles.actionButton, dynamicStyles.actionButtonPrimary]}
          onPress={handleScanText}
        >
          <FileText size={24} color="#fff" />
          <Text style={[dynamicStyles.actionButtonText, dynamicStyles.actionButtonTextPrimary]}>
            Scan Text (OCR)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={dynamicStyles.actionButton}
          onPress={handleCrop}
        >
          <Crop size={24} color={colors.text} />
          <Text style={dynamicStyles.actionButtonText}>
            Crop & Save as Photo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[dynamicStyles.actionButton, dynamicStyles.retakeButton]}
          onPress={handleRetake}
        >
          <Camera size={24} color="#fff" />
          <Text style={[dynamicStyles.actionButtonText, dynamicStyles.retakeButtonText]}>
            Retake Photo
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
