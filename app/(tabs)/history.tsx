import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { DatabaseService } from '@/lib/database';
import type { PDFHistory, ScanHistory } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Calendar, FileText, Search, Trash2, User } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type HistoryItem = (ScanHistory & { type: 'scan' }) | (PDFHistory & { type: 'pdf' });

const ITEMS_PER_PAGE = 20;
const PRELOAD_DISTANCE = 5;

const AnimatedHistoryItem = ({
  item,
  index,
  isLoading,
  filteredHistoryLength,
  colors,
  onPress,
  onCopyText,
  onDeleteItem,
  formatDate,
}: {
  item: HistoryItem;
  index: number;
  isLoading: boolean;
  filteredHistoryLength: number;
  colors: any;
  onPress: () => void;
  onCopyText: (text: string) => void;
  onDeleteItem: (id: string, type: 'scan' | 'pdf') => void;
  formatDate: (timestamp: string | number) => string;
}) => {
  const itemAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isLoading && filteredHistoryLength > 0) {
      // Staggered animation for each item
      const delay = index * 80; // 80ms delay between each item
      Animated.timing(itemAnim, {
        toValue: 1,
        duration: 500,
        delay: delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    } else {
      itemAnim.setValue(0);
    }
  }, [isLoading, filteredHistoryLength, index, itemAnim]);

  const itemStyle = {
    opacity: itemAnim,
    transform: [{
      translateY: itemAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [40, 0],
      }),
    }],
  };

  return (
    <Animated.View style={itemStyle}>
      <TouchableOpacity
        style={[styles.historyItem, { backgroundColor: colors.background }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {item.type === 'scan' ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.thumbnail}
            contentFit="cover"
            placeholder={require('../../assets/images/partial-react-logo.png')}
            placeholderContentFit="contain"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : item.thumbnail_url ? (
          <Image
            source={{ uri: item.thumbnail_url }}
            style={styles.thumbnail}
            contentFit="cover"
            placeholder={require('../../assets/images/partial-react-logo.png')}
            placeholderContentFit="contain"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.thumbnail, styles.pdfThumbnail, { backgroundColor: colors.border }]}>
            <FileText size={24} color="#007AFF" />
          </View>
        )}
        <View style={styles.itemContent}>
          <Text style={[styles.previewText, { color: colors.text }]} numberOfLines={2}>
            {item.type === 'scan' ? (item.preview || 'No text detected') : item.title}
          </Text>
          {item.type === 'pdf' && (
            <Text style={[styles.pdfInfo, { color: colors.tabIconDefault }]} numberOfLines={1}>
              PDF • {item.page_count} page{item.page_count === 1 ? '' : 's'}
            </Text>
          )}
          <View style={styles.itemFooter}>
            <View style={styles.dateContainer}>
              <Calendar size={12} color={colors.tabIconDefault} />
              <Text style={[styles.dateText, { color: colors.tabIconDefault }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
            <View style={styles.actions}>
              {item.type === 'scan' && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onCopyText(item.extracted_text || '');
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <FileText size={16} color="#007AFF" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.id, item.type);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={16} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function HistoryScreen() {
  const { colors } = useTheme();
  const { user, isGuest } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasMoreData, setHasMoreData] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Track initialization to prevent flash
  useEffect(() => {
    if (!isLoading && !isGuest && user) {
      setHasInitialized(true);
    } else if (isGuest) {
      setHasInitialized(true);
    }
  }, [isLoading, hasInitialized, isGuest, user]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const loadingFadeAnim = useRef(new Animated.Value(1)).current;
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  // Memoized filtered results
  const searchFilteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;

    const query = searchQuery.toLowerCase();
    return history.filter(item => {
      if (item.type === 'scan') {
        return (
          item.extracted_text?.toLowerCase().includes(query) ||
          item.preview?.toLowerCase().includes(query)
        );
      } else {
        return item.title?.toLowerCase().includes(query);
      }
    });
  }, [history, searchQuery]);

  useEffect(() => {
    setFilteredHistory(searchFilteredHistory);
  }, [searchFilteredHistory]);

  // Animation effects
  useEffect(() => {
    if (!isLoading && filteredHistory.length > 0 && hasInitialized) {
      // Start content animation immediately when ready
      Animated.parallel([
        Animated.timing(loadingFadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(contentFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]).start();
    } else if (isLoading) {
      // Reset animations when loading starts
      loadingFadeAnim.setValue(1);
      contentFadeAnim.setValue(0);
      slideAnim.setValue(50);
    }
  }, [isLoading, filteredHistory.length, loadingFadeAnim, contentFadeAnim, slideAnim, hasInitialized]);

  // Determine what to show based on current state
  const getContentToRender = () => {
    // Show loading by default until we know the auth state and have data
    if (isLoading || (!hasInitialized && !isGuest)) {
      return (
        <Animated.View
          style={[
            styles.centeredLoadingContainer,
            { opacity: loadingFadeAnim }
          ]}
        >
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading history...</Text>
        </Animated.View>
      );
    }

    if (isGuest) {
      return renderGuestState();
    }

    if (filteredHistory.length === 0) {
      return renderEmptyState();
    }

    // Show content with animation
    return (
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: contentFadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <FlatList
          data={filteredHistory}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      </Animated.View>
    );
  };

  useEffect(() => {
    if (!isGuest && user) {
      loadHistory(true);
    } else {
      setIsLoading(false);
    }
  }, [user, isGuest]);

  const loadHistory = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        setCurrentPage(1);
        setHasMoreData(true);
      } else {
        setIsLoadingMore(true);
      }

      const page = reset ? 1 : currentPage;
      const limit = ITEMS_PER_PAGE * page;

      const result = await DatabaseService.getAllHistory(limit);

      if (result.success && result.data) {
        const newHistory = reset ? result.data : [...history, ...result.data];
        setHistory(newHistory);

        // Check if we have more data
        setHasMoreData(result.data.length === limit);

        if (!reset) {
          setCurrentPage(page + 1);
        }
      } else {
        console.error('Failed to load history:', result.error);
        setHasMoreData(false);
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      setHasMoreData(false);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setRefreshing(false);
    }
  }, [currentPage, history]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory(true);
  }, [loadHistory]);

  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && hasMoreData && !searchQuery.trim()) {
      loadHistory(false);
    }
  }, [isLoadingMore, hasMoreData, searchQuery, loadHistory]);

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
                setFilteredHistory([]);
                setCurrentPage(1);
                setHasMoreData(true);
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

  const renderHistoryItem = ({ item, index }: { item: HistoryItem; index: number }) => {
    if (item.type === 'scan') {
      return (
        <AnimatedHistoryItem
          item={item}
          index={index}
          isLoading={isLoading}
          filteredHistoryLength={filteredHistory.length}
          colors={colors}
          onPress={() => {
            router.push({
              pathname: '/scan-result',
              params: {
                imageUri: item.image_url,
                imageBase64: '',
                extractedText: item.extracted_text || '',
                fromHistory: 'true'
              }
            });
          }}
          onCopyText={copyText}
          onDeleteItem={deleteItem}
          formatDate={formatDate}
        />
      );
    } else {
      return (
        <AnimatedHistoryItem
          item={item}
          index={index}
          isLoading={isLoading}
          filteredHistoryLength={filteredHistory.length}
          colors={colors}
          onPress={() => {
            router.push({
              pathname: '/pdf-success',
              params: {
                pdfUri: item.pdf_url,
                pdfTitle: item.title,
                selectedImages: JSON.stringify([])
              }
            });
          }}
          onCopyText={copyText}
          onDeleteItem={deleteItem}
          formatDate={formatDate}
        />
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
        activeOpacity={0.7}
      >
        <Text style={styles.scanButtonText}>Start Scanning</Text>
      </TouchableOpacity>
    </View>
  );

  const handleSignInPress = () => {
    try {
      console.log('🔐 Guest user wants to sign in from history tab');
      console.log('🔐 Clearing guest mode and returning to login...');

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

  const renderSearchBar = () => (
    <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Search size={20} color={colors.tabIconDefault} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search scans and PDFs..."
          placeholderTextColor={colors.tabIconDefault}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>
    </View>
  );

  const renderFooter = () => {
    // Only show footer loading if we have items and are loading more
    if (isLoadingMore && filteredHistory.length > 0) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={[styles.footerText, { color: colors.tabIconDefault }]}>Loading more...</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {!isGuest && history.length > 0 && renderSearchBar()}

      {getContentToRender()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
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
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerText: {
    fontSize: 14,
  },
  loadingContainer: {
    paddingVertical: 120,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  centeredLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  contentContainer: {
    flex: 1,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 12,
  },
});