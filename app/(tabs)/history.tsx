import { useTheme } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Calendar, FileText, Trash2 } from 'lucide-react-native';
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

type ScanHistoryItem = {
  id: string;
  imageUri: string;
  extractedText: string;
  timestamp: number;
  preview: string;
};

export default function HistoryScreen() {
  const { colors } = useTheme();
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem('scan_history');
      if (stored) {
        const parsedHistory = JSON.parse(stored);
        setHistory(parsedHistory.sort((a: ScanHistoryItem, b: ScanHistoryItem) => b.timestamp - a.timestamp));
      }
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedHistory = history.filter(item => item.id !== id);
            setHistory(updatedHistory);
            await AsyncStorage.setItem('scan_history', JSON.stringify(updatedHistory));
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
      'Are you sure you want to delete all scans? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setHistory([]);
            await AsyncStorage.removeItem('scan_history');
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
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

  const renderHistoryItem = ({ item }: { item: ScanHistoryItem }) => (
    <TouchableOpacity
      style={[styles.historyItem, { backgroundColor: colors.background }]}
      onPress={() => {
        router.push({
          pathname: '/scan-result',
          params: {
            imageUri: item.imageUri,
            imageBase64: '', // We don't store base64 in history to save space
            extractedText: item.extractedText,
            fromHistory: 'true'
          }
        });
      }}
    >
      <Image source={{ uri: item.imageUri }} style={styles.thumbnail} contentFit="cover" />
      <View style={styles.itemContent}>
        <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={2}>
          {item.preview || 'No text detected'}
        </Text>
        <View style={styles.itemFooter}>
          <View style={styles.dateContainer}>
            <Calendar size={12} color={colors.tabIconDefault} />
            <Text style={[styles.dateText, { color: colors.tabIconDefault }]}>{formatDate(item.timestamp)}</Text>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                copyText(item.extractedText);
              }}
            >
              <FileText size={16} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                deleteItem(item.id);
              }}
            >
              <Trash2 size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <FileText size={24} color="#007AFF" />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Scan History</Text>
        </View>
        {history.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={clearAllHistory}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
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
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  previewText: {
    fontSize: 16,
    lineHeight: 22,
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
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});