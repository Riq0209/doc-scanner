import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { DatabaseService } from '@/lib/database';
import type { PDFHistory, ScanHistory } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Calendar, FileText, Trash2, User } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type HistoryItem = (ScanHistory & { type: 'scan' }) | (PDFHistory & { type: 'pdf' });

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { user, isGuest } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isGuest && user) {
      loadHistory();
    } else {
      setIsLoading(false);
    }
  }, [user, isGuest]);

  const loadHistory = async () => {
    try {
      // Load all history from Supabase
      const result = await DatabaseService.getAllHistory(50);
      
      if (result.success && result.data) {
        setHistory(result.data);
      } else {
        console.error('Failed to load history:', result.error);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteItem = async (id: string, type: 'scan' | 'pdf') => {
    Alert.alert(
      type === 'scan' ? 'Delete Scan' : 'Delete PDF',
      `Are you sure you want to delete this ${type}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = type === 'scan' 
                ? await DatabaseService.deleteScan(id)
                : await DatabaseService.deletePDF(id);
              
              if (result.success) {
                setHistory(prev => prev.filter(item => item.id !== id));
              } else {
                Alert.alert('Error', 'Failed to delete item');
              }
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          },
        },
      ]
    );
  };

  const copyText = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', 'Text copied to clipboard');
  };

  const clearAllHistory = async () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all scans and PDFs? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await DatabaseService.clearAllHistory();
              if (result.success) {
                setHistory([]);
              } else {
                Alert.alert('Error', 'Failed to clear history');
              }
            } catch (error) {
              console.error('Error clearing history:', error);
              Alert.alert('Error', 'Failed to clear history');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: string | number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderHistoryItem = ({ item }: { item: HistoryItem }) => {
    if (item.type === 'scan') {
      return (
        <TouchableOpacity
          style={[styles.historyItem, { backgroundColor: colors.background }]}
          onPress={() => {
            router.push({
              pathname: '/scan-result',
              params: {
                imageUri: item.image_url,
                imageBase64: '', // We don't store base64 in history to save space
                extractedText: item.extracted_text || '',
                fromHistory: 'true'
              }
            });
          }}
        >
          <Image source={{ uri: item.image_url }} style={styles.thumbnail} contentFit="cover" />
          <View style={styles.itemContent}>
            <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={2}>
              {item.preview || 'No text detected'}
            </Text>
            <View style={styles.itemFooter}>
              <View style={styles.dateContainer}>
                <Calendar size={12} color={colors.tabIconDefault} />
                <Text style={[styles.dateText, { color: colors.tabIconDefault }]}>{formatDate(item.created_at)}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    copyText(item.extracted_text || '');
                  }}
                >
                  <FileText size={16} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    deleteItem(item.id, 'scan');
                  }}
                >
                  <Trash2 size={16} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    } else {
      // PDF item
      return (
        <TouchableOpacity
          style={[styles.historyItem, { backgroundColor: colors.background }]}
          onPress={() => {
            // Navigate to PDF success page or open PDF
            router.push({
              pathname: '/pdf-success',
              params: {
                pdfUri: item.pdf_url,
                pdfTitle: item.title,
                selectedImages: JSON.stringify([]) // Empty for history items
              }
            });
          }}
        >
          {item.thumbnail_url ? (
            <Image source={{ uri: item.thumbnail_url }} style={styles.thumbnail} contentFit="cover" />
          ) : (
            <View style={[styles.thumbnail, styles.pdfThumbnail, { backgroundColor: colors.border }]}>
              <FileText size={24} color="#007AFF" />
            </View>
          )}
          <View style={styles.itemContent}>
            <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.pdfInfo, { color: colors.tabIconDefault }]} numberOfLines={1}>
              PDF • {item.page_count} page{item.page_count === 1 ? '' : 's'}
            </Text>
            <View style={styles.itemFooter}>
              <View style={styles.dateContainer}>
                <Calendar size={12} color={colors.tabIconDefault} />
                <Text style={[styles.dateText, { color: colors.tabIconDefault }]}>{formatDate(item.created_at)}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    deleteItem(item.id, 'pdf');
                  }}
                >
                  <Trash2 size={16} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <FileText size={64} color={colors.tabIconDefault} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Scans Yet</Text>
      <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
        Your scanned documents will appear here. Start by scanning your first document!
      </Text>
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => router.push('/')}
      >
        <Text style={styles.scanButtonText}>Start Scanning</Text>
      </TouchableOpacity>
    </View>
  );

  const handleSignInPress = () => {
    try {
      console.log('🔐 Guest user wants to sign in from history tab');
      console.log('🔐 Clearing guest mode and returning to login...');
      
      // Clear guest mode and navigate back to login - just like app startup
      router.replace('/login');
      
      console.log('🔐 Navigation to login completed');
    } catch (error) {
      console.error('🔐 Navigation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Navigation Error', `Failed to open login: ${errorMessage}`);
    }
  };

  const renderGuestState = () => (
    <View style={styles.emptyState}>
      <User size={64} color={colors.tabIconDefault} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Sign In Required</Text>
      <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
        To view your scan history and sync across devices, please sign in to your account.
      </Text>
      <TouchableOpacity
        style={[styles.signInButton, { backgroundColor: colors.tint }]}
        onPress={handleSignInPress}
        activeOpacity={0.7}
      >
        <Text style={styles.signInButtonText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <FileText size={24} color="#007AFF" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Scan History</Text>
        </View>
        {!isGuest && history.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearAllHistory}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {isGuest ? (
        renderGuestState()
      ) : history.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={history}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  pdfThumbnail: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  previewText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 8,
  },
  pdfInfo: {
    fontSize: 12,
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signInButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});