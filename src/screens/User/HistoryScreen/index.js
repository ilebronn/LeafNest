// HistoryScreen/index.js 
import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Image, RefreshControl, Alert, Dimensions,
  Animated, PanResponder, Modal, ScrollView, ActivityIndicator, TextInput, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '@config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  getHistory, 
  deleteHistoryItem, 
  deleteMultipleHistoryItems, // ✅ ADDED: Batch delete function
  clearAllHistory, 
  getGlobalObservationCounts,
  toggleHistoryItemVisibility,
} from '@services/firebase';

// ✅ ADD IMPORT for offline access hook
import { useOfflineAccess } from '@hooks/useOfflineAccess';
import PremiumGate from '@components/modals/PremiumGate';

const { width } = Dimensions.get('window');

// ✅ ADD THIS
const CARD_HEIGHT = 116; // Card height for performance optimization
const ITEMS_PER_PAGE = 20; // Pagination constant

// ✅ FIX: Helper to safely get timestamp value
const getTimestampValue = (timestamp) => {
  // Already a number
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  // Firestore Timestamp object
  if (timestamp?.toMillis && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  
  // Date object
  if (timestamp?.getTime && typeof timestamp.getTime === 'function') {
    return timestamp.getTime();
  }
  
  // Fallback to current time
  return Date.now();
};

// ========== FIX 1: OPTIMIZED IMAGE COMPONENT ==========
const OptimizedImage = React.memo(({ uri, style }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!uri || error) {
    return (
      <LinearGradient
        colors={['#E8F5E9', '#C8E6C9']}
        style={[style, styles.imageFallback]}
      >
        <Ionicons name="image-outline" size={32} color="#5E936C" />
      </LinearGradient>
    );
  }

  return (
    <View style={style}>
      <Image
        source={{ 
          uri: uri,
          cache: 'default' // ✅ Better than force-cache
        }}
        style={[style, { position: 'absolute' }]}
        resizeMode="cover"
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        progressiveRenderingEnabled={true}
        fadeDuration={200}
      />
      {loading && (
        <View style={[style, styles.imageLoader]}>
          <ActivityIndicator size="small" color="#5E936C" />
        </View>
      )}
    </View>
  );
});

// ========== FIX 7: UPDATED SwipeableCard with disabled prop ==========
const SwipeableCard = React.memo(({ 
  item, 
  isSelected, 
  selectionMode, 
  onPress, 
  onDelete, 
  formatDate,
  disabled // ✅ Add disabled prop
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const [isRevealed, setIsRevealed] = useState(false);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 50;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dx < 0) {
        translateX.setValue(Math.max(gestureState.dx, -80));
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx < -50) {
        Animated.timing(translateX, {
          toValue: -80,
          duration: 250,
          useNativeDriver: false,
        }).start();
        setIsRevealed(true);
      } else {
        Animated.timing(translateX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }).start();
        setIsRevealed(false);
      }
    },
  }), [translateX]);

  const resetSwipe = useCallback(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
    setIsRevealed(false);
  }, [translateX]);

  const handlePress = useCallback(() => {
    if (isRevealed) {
      resetSwipe();
    } else {
      onPress();
    }
  }, [isRevealed, resetSwipe, onPress]);

  const handleDelete = useCallback(() => {
    resetSwipe();
    onDelete(item);
  }, [resetSwipe, onDelete, item]);

  return (
    <View style={styles.swipeContainer}>
      <LinearGradient
        colors={['#ef4444', '#dc2626']}
        style={styles.deleteBackground}
      >
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={disabled} // ✅ Disable when deleting
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <Animated.View
        style={[
          styles.cardWrapper,
          { transform: [{ translateX }] },
          disabled && { opacity: 0.5 } // ✅ Visual feedback
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={[styles.card, isSelected && styles.cardSelected]} 
          activeOpacity={0.7} 
          onPress={handlePress}
          disabled={disabled} // ✅ Disable when deleting
          onLongPress={() => {
            if (!selectionMode && !disabled) {
              onPress();
            }
          }}
        >
          {selectionMode && (
            <View style={styles.selectionCheckbox}>
              {isSelected ? (
                <Ionicons name="checkmark-circle" size={28} color="#22c55e" />
              ) : (
                <View style={styles.emptyCheckbox} />
              )}
            </View>
          )}

          {/* ✅ USE OPTIMIZED IMAGE */}
          <OptimizedImage 
            uri={item.imageUrl}
            style={styles.image}
          />
          
          <View style={styles.infoContainer}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
              <Ionicons 
                name={item.isPublic ? "eye-outline" : "eye-off-outline"} 
                size={16} 
                color={item.isPublic ? "#059669" : "#9CA3AF"} 
              />
            </View>
            
            {item.scientificName && item.scientificName !== item.name && (
              <Text numberOfLines={1} style={styles.scientificName}>{item.scientificName}</Text>
            )}
            
            <View style={styles.bottomRow}>
              <View style={styles.metadataRow}>
                <Ionicons name="time-outline" size={14} color="#9ca3af" />
                <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
              </View>
              
              {item.globalObsCount > 0 && (
                <View style={styles.globalObsCount}>
                  <Ionicons name="globe-outline" size={14} color="#059669" />
                  <Text style={styles.globalObsText}>{item.globalObsCount}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}, (prevProps, nextProps) => {
  // ✅ Custom comparison - CHECK isPublic changes
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.isPublic === nextProps.item.isPublic && // ✅ ADD THIS LINE
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.selectionMode === nextProps.selectionMode &&
    prevProps.disabled === nextProps.disabled
  );
});

export default function HistoryScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [globalCounts, setGlobalCounts] = useState({});
  
  // ✅ ADD STATE for premium gate
  const [premiumGateVisible, setPremiumGateVisible] = useState(false);
  
  // ========== FIX 4: DEBOUNCED SEARCH ==========
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // ========== FIX 3: PAGINATION ==========
  const [currentPage, setCurrentPage] = useState(1);

  // ========== FIX 6: LOADING STATE FOR DELETE OPERATIONS ==========
  const [isDeletingBatch, setIsDeletingBatch] = useState(false); // ✅ RENAMED for clarity

  // ✅ ADD OFFLINE ACCESS HOOK
  const { 
    isOffline, 
    isPremium, 
    canAccessOffline, 
    shouldBlockOfflineAccess 
  } = useOfflineAccess();

  // ✅ ADD REF FOR MODAL SCROLL INSIDE THE COMPONENT
  const modalScrollRef = useRef(null);

  // ========== FIX 2: OPTIMIZED loadHistory ==========
  const loadHistory = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const result = await getHistory(uid);
      
      if (result.success) {
        const normalized = result.data.map((it, idx) => ({
          id: it.id || `history:${it.plantName || it.name || 'item'}:${idx}`,
          name: it.plantName || it.name || it.commonName || it.scientificName || 'Unknown',
          scientificName: it.scientificName || null,
          commonName: it.commonName || null,
          rank: it.rank || null,
          iconicTaxon: it.iconicTaxon || null,
          taxonId: it.taxonId || null,
          imageUrl: it.imageUrl || null,
          conservation: it.conservation || null,
          about: it.about || it.description || null,
          iNatObsCount: it.iNatObsCount || 0,
          globalObsCount: it.globalObsCount || 0,
          type: it.type || 'history',
          createdAt: getTimestampValue(it.timestamp || it.createdAt),
          originalData: it.originalData || null,
          isPublic: it.isPublic === true ? true : false,
          scanCount: it.scanCount || 1,
        }));
        
        // Remove duplicates by keeping only the most recent scan of each species
        const uniqueItems = [];
        const seenSpecies = new Set();
        
        // Sort by most recent first
        normalized.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        
        // Filter out duplicates based on taxonId or scientificName
        for (const item of normalized) {
          const identifier = item.taxonId 
            ? `taxon_${item.taxonId}` 
            : (item.scientificName || item.name || '').toLowerCase().trim();
          
          if (!seenSpecies.has(identifier) && identifier) {
            seenSpecies.add(identifier);
            uniqueItems.push(item);
          }
        }
        
        // ✅ CRITICAL: Set items IMMEDIATELY - don't wait for counts
        setItems(uniqueItems);
        setLoading(false);

        // ✅ Fetch counts ONLY ONCE in background - SKIP if batch deleting
        if (!isDeletingBatch && Object.keys(globalCounts).length === 0 && uniqueItems.length > 0) {
          // Don't await - let it run in background
          getGlobalObservationCounts(uniqueItems).then(countsResult => {
            if (countsResult.success) {
              setGlobalCounts(countsResult.counts);
              
              setItems(prevItems => prevItems.map(item => {
                const docId = item.taxonId 
                  ? `taxon_${item.taxonId}` 
                  : (item.scientificName || item.name || '').toLowerCase().replace(/\s+/g, '_');
                
                return {
                  ...item,
                  globalObsCount: countsResult.counts[docId] || item.globalObsCount || 0
                };
              }));
            }
          }).catch(err => console.warn('⚠️ Count fetch failed:', err));
        }
      } else {
        console.warn('Failed to load history:', result.error);
        setItems([]);
        setLoading(false);
      }
    } catch (e) {
      console.error('Error loading history:', e);
      setItems([]);
      setLoading(false);
    }
  }, [uid, isDeletingBatch]); // ✅ Add isDeletingBatch dependency

  // ========== FIX 4: DEBOUNCE SEARCH EFFECT ==========
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  // ========== FIX 3: RESET PAGINATION WHEN FILTER CHANGES ==========
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, debouncedSearch]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const newUid = user?.uid ?? null;
      setUid(newUid);
      setLoading(true);
    });
    return unsub;
  }, []);

  useFocusEffect(useCallback(() => { loadHistory(); }, [loadHistory]));
  useEffect(() => { loadHistory(); }, [uid, loadHistory]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleTogglePublic = async (item) => {
  if (!uid) return;

  try {
    const newStatus = !item.isPublic;

    // ✅ FIX: Update selectedSpecies FIRST for instant modal update
    setSelectedSpecies(prev => prev ? { ...prev, isPublic: newStatus } : null);

    // Then update items list
    setItems(prevItems =>
      prevItems.map(i =>
        i.id === item.id ? { ...i, isPublic: newStatus } : i
      )
    );

    const result = await toggleHistoryItemVisibility(uid, item.id, newStatus);

    if (result.success) {
      // Show success message (don't close modal)
      Alert.alert(
        'Success',
        `Scan is now ${newStatus ? 'public' : 'private'}`
      );
    } else {
      // Revert both states on failure
      setSelectedSpecies(prev => prev ? { ...prev, isPublic: item.isPublic } : null);
      setItems(prevItems =>
        prevItems.map(i =>
          i.id === item.id ? { ...i, isPublic: item.isPublic } : i
        )
      );

      let errorMessage = 'Failed to update visibility';
      if (result.error?.includes('No document to update')) {
        errorMessage = 'This scan needs to sync first. Please try again in a moment.';
      } else if (result.error?.includes('offline')) {
        errorMessage = 'Cannot change visibility while offline. Please check your connection.';
      } else if (result.error) {
        errorMessage = `Error: ${result.error}`;
      }

      Alert.alert('Error', errorMessage);
    }
  } catch (error) {
    console.error('Error toggling visibility:', error);

    setSelectedSpecies(prev => prev ? { ...prev, isPublic: item.isPublic } : null);
    setItems(prevItems =>
      prevItems.map(i =>
        i.id === item.id ? { ...i, isPublic: item.isPublic } : i
      )
    );

    let errorMessage = 'Failed to update visibility';
    if (error.message?.includes('No document to update')) {
      errorMessage = 'This scan hasn\'t been synced to the cloud yet. Please wait for sync to complete and try again.';
    } else if (error.message?.includes('permission-denied')) {
      errorMessage = 'You don\'t have permission to modify this scan.';
    } else if (error.message?.includes('network')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }

    Alert.alert('Error', errorMessage);
  }
};

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedItems(new Set());
  };

  const toggleItemSelection = useCallback((itemId) => {
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(itemId)) {
        newSelection.delete(itemId);
      } else {
        newSelection.add(itemId);
      }
      return newSelection;
    });
  }, []);

  const selectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  // ========== deleteItem function ==========
  const deleteItem = useCallback(async (item) => {
    if (!uid || isDeletingBatch) return; // ✅ Prevent during batch delete
    
    Alert.alert(
      'Delete Record',
      `Delete "${item.name}" from history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from service (AsyncStorage + Firestore)
              const result = await deleteHistoryItem(uid, item.id);
              
              if (result.success) {
                // Reload to get fresh AsyncStorage data
                await loadHistory();
                
                Alert.alert('Success', 'Record deleted');
              } else {
                Alert.alert('Error', 'Failed to delete record');
              }
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete record');
            }
          },
        },
      ]
    );
  }, [uid, loadHistory, isDeletingBatch]);

  // ========== FIXED: deleteSelected function with BATCH DELETE ==========
  const deleteSelected = async () => {
    if (selectedItems.size === 0 || !uid || isDeletingBatch) return;

    const countToDelete = selectedItems.size;

    Alert.alert(
      'Delete Selected',
      `Delete ${countToDelete} ${countToDelete === 1 ? 'record' : 'records'} from history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingBatch(true); // ✅ Set loading state
            
            try {
              const idsToDelete = Array.from(selectedItems);
              
              // ✅ USE BATCH DELETE (single operation - prevents race condition)
              await deleteMultipleHistoryItems(uid, idsToDelete);

              // ✅ Reload to get fresh data
              await loadHistory();
              
              setSelectedItems(new Set());
              setSelectionMode(false);
              
              Alert.alert('Success', `${countToDelete} ${countToDelete === 1 ? 'record' : 'records'} deleted`);
            } catch (error) {
              console.error('Error deleting items:', error);
              Alert.alert('Error', 'Failed to delete selected records');
              await loadHistory(); // Reload on error
            } finally {
              setIsDeletingBatch(false); // ✅ Clear loading state
            }
          },
        },
      ]
    );
  };

  // ========== clearAllHistoryData function ==========
  const clearAllHistoryData = () => {
    if (items.length === 0 || !uid) return;
    
    Alert.alert(
      'Clear All History', 
      'Are you sure you want to delete all history records? This action cannot be undone.', 
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear all from service
              const result = await clearAllHistory(uid);
              
              if (result.success) {
                // Reload to verify
                await loadHistory();
                
                setSelectionMode(false);
                setSelectedItems(new Set());
                
                Alert.alert('Success', 'All history cleared');
              } else {
                Alert.alert('Error', 'Failed to clear history');
              }
            } catch (error) {
              console.error('Error clearing history:', error);
              Alert.alert('Error', 'Failed to clear history');
              await loadHistory(); // Reload on error
            }
          },
        },
      ]
    );
  };

  // ✅ MODIFIED openItem function with offline premium check
  const openItem = useCallback((item) => {
    if (selectionMode) {
      toggleItemSelection(item.id);
      return;
    }

    // ✅ OFFLINE PREMIUM CHECK - Block non-premium users
    if (isOffline && !isPremium) {
      console.log('❌ Offline access blocked - Premium required');
      setPremiumGateVisible(true);
      return;
    }

    setSelectedSpecies(item);
    setDetailsModalVisible(true);
  }, [selectionMode, isOffline, isPremium, toggleItemSelection]);

  const closeModal = () => {
    setDetailsModalVisible(false);
    setSelectedSpecies(null);
  };

  const formatDate = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours}h ago`;
    } else if (diffInHours < 168) {
      const days = Math.floor(diffInHours / 24);
      return `${days}d ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  }, []);

  // ========== FIX: UPDATED getFilteredItems with debounced search ==========
  const getFilteredItems = useCallback(() => {
    let filtered = items;

    if (filterType === 'plants') {
      filtered = filtered.filter(item => 
        item.iconicTaxon?.toLowerCase() === 'plantae' || 
        item.iconicTaxon?.toLowerCase().includes('plant')
      );
    } else if (filterType === 'animals') {
      filtered = filtered.filter(item => 
        item.iconicTaxon?.toLowerCase() === 'animalia' || 
        item.iconicTaxon?.toLowerCase() === 'aves' ||
        item.iconicTaxon?.toLowerCase() === 'mammalia' ||
        item.iconicTaxon?.toLowerCase() === 'reptilia' ||
        item.iconicTaxon?.toLowerCase() === 'amphibia' ||
        item.iconicTaxon?.toLowerCase() === 'actinopterygii' ||
        item.iconicTaxon?.toLowerCase() === 'insecta' ||
        item.iconicTaxon?.toLowerCase() === 'arachnida' ||
        (item.iconicTaxon && !item.iconicTaxon.toLowerCase().includes('plant'))
      );
    }

    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(query) ||
        item.commonName?.toLowerCase().includes(query) ||
        item.scientificName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [items, filterType, debouncedSearch]);

  const filteredItems = getFilteredItems();
  
  // ========== FIX 3: PAGINATED ITEMS ==========
  const paginatedItems = useMemo(() => {
    return filteredItems.slice(0, currentPage * ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const hasMore = useMemo(() => {
    return paginatedItems.length < filteredItems.length;
  }, [paginatedItems.length, filteredItems.length]);

  const handleLoadMore = useCallback(() => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore]);

  // ✅ OPTIMIZED renderItem
  const renderItem = useCallback(({ item }) => {
    const isSelected = selectedItems.has(item.id);

    return (
      <SwipeableCard
        item={item}
        isSelected={isSelected}
        selectionMode={selectionMode}
        onPress={() => openItem(item)}
        onDelete={deleteItem}
        formatDate={formatDate}
        disabled={isDeletingBatch} // ✅ Disable during batch delete
      />
    );
  }, [selectedItems, selectionMode, openItem, deleteItem, formatDate, isDeletingBatch]);

  // ✅ ADD keyExtractor
  const keyExtractor = useCallback((item) => item.id, []);

  // ✅ ADD getItemLayout for huge performance boost
  const getItemLayout = useCallback((data, index) => ({
    length: CARD_HEIGHT,
    offset: CARD_HEIGHT * index,
    index,
  }), []);

  const SpeciesDetailsModal = () => {
    if (!selectedSpecies || !detailsModalVisible) return null;

    return (
      <Modal
        transparent={true}
        visible={detailsModalVisible}
        animationType="slide"
        onRequestClose={closeModal}
        presentationStyle="overFullScreen"
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={closeModal}
          />
          
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closeModal}
              >
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              ref={modalScrollRef}
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
              }}
            >
              <View style={styles.modalImageContainer}>
                {selectedSpecies.imageUrl ? (
                  <Image 
                    source={{ 
                      uri: selectedSpecies.imageUrl,
                      cache: 'force-cache'
                    }} 
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={['#E8F5E9', '#C8E6C9']}
                    style={[styles.modalImage, styles.modalImageFallback]}
                  >
                    <Ionicons name="image-outline" size={56} color="#5E936C" />
                  </LinearGradient>
                )}
              </View>

              {/* PUBLIC/PRIVATE TOGGLE */}
              <View style={styles.publicToggleContainer}>
                <View style={styles.publicToggleInfo}>
                  <Ionicons 
                    name={selectedSpecies.isPublic ? "eye-outline" : "eye-off-outline"} 
                    size={20} 
                    color={selectedSpecies.isPublic ? "#059669" : "#6B7280"} 
                  />
                  <Text style={styles.publicToggleLabel}>
                    {selectedSpecies.isPublic ? "Public" : "Private"}
                  </Text>
                </View>
                <Switch
                  value={selectedSpecies.isPublic}
                  onValueChange={() => handleTogglePublic(selectedSpecies)}
                  trackColor={{ false: "#D1D5DB", true: "#86EFAC" }}
                  thumbColor={selectedSpecies.isPublic ? "#059669" : "#9CA3AF"}
                />
              </View>

              <Text style={styles.modalTitle}>
                {selectedSpecies.name || 'Unknown Species'}
              </Text>

              <View style={styles.detailsContainer}>
                {selectedSpecies.commonName && selectedSpecies.commonName !== selectedSpecies.name && (
                  <View style={styles.detailRow}>
                    <Ionicons name="leaf-outline" size={20} color="#5E936C" style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Common Name</Text>
                      <Text style={styles.detailValue}>{selectedSpecies.commonName}</Text>
                    </View>
                  </View>
                )}
                
                {selectedSpecies.scientificName && selectedSpecies.scientificName !== selectedSpecies.name && (
                  <View style={styles.detailRow}>
                    <Ionicons name="flask-outline" size={20} color="#5E936C" style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Scientific Name</Text>
                      <Text style={[styles.detailValue, styles.italicText]}>
                        {selectedSpecies.scientificName}
                      </Text>
                    </View>
                  </View>
                )}
                
                {selectedSpecies.rank && (
                  <View style={styles.detailRow}>
                    <Ionicons name="git-branch-outline" size={20} color="#5E936C" style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Taxonomic Rank</Text>
                      <Text style={styles.detailValue}>{selectedSpecies.rank}</Text>
                    </View>
                  </View>
                )}
                
                {selectedSpecies.iconicTaxon && (
                  <View style={styles.detailRow}>
                    <Ionicons name="scan-circle-outline" size={20} color="#5E936C" style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Type</Text>
                      <Text style={styles.detailValue}>{selectedSpecies.iconicTaxon}</Text>
                    </View>
                  </View>
                )}

                {selectedSpecies.conservation && (
                  <View style={styles.detailRow}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#059669" style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Conservation Status</Text>
                      <Text style={[styles.detailValue, styles.conservationText]}>
                        {selectedSpecies.conservation}
                      </Text>
                    </View>
                  </View>
                )}

                {selectedSpecies.scanCount > 1 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="analytics-outline" size={20} color="#5E936C" style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Times Scanned</Text>
                      <Text style={styles.detailValue}>
                        {selectedSpecies.scanCount} {selectedSpecies.scanCount === 1 ? 'time' : 'times'}
                      </Text>
                    </View>
                  </View>
                )}

                {selectedSpecies.globalObsCount > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="globe-outline" size={20} color="#059669" style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Global App Scans</Text>
                      <Text style={[styles.detailValue, styles.globalObsDetailText]}>
                        {selectedSpecies.globalObsCount.toLocaleString()} {selectedSpecies.globalObsCount === 1 ? 'scan' : 'scans'}
                      </Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Ionicons name="calendar-outline" size={20} color="#5E936C" style={styles.detailIcon} />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Scanned On</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedSpecies.createdAt).toLocaleDateString([], { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </Text>
                  </View>
                </View>
              </View>

              {selectedSpecies.about && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionTitle}>About</Text>
                  <Text style={styles.descriptionText}>
                    {selectedSpecies.about}
                  </Text>
                </View>
              )}

              {/* ✅ MODIFIED View Full Details button with offline premium check */}
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={async () => {
                  // ✅ OFFLINE PREMIUM CHECK before navigation
                  if (isOffline && !isPremium) {
                    closeModal();
                    console.log('❌ Offline navigation blocked - Premium required');
                    setPremiumGateVisible(true);
                    return;
                  }

                  // ✅ DON'T CLOSE MODAL IMMEDIATELY - NAVIGATE FIRST
                  const navigationData = {
                    photoUri: selectedSpecies.imageUri || selectedSpecies.imageUrl,
                    speciesData: selectedSpecies.originalData || {
                      scientificName: selectedSpecies.scientificName,
                      canonicalName: selectedSpecies.scientificName,
                      rank: selectedSpecies.rank,
                      kingdom: selectedSpecies.taxonomy?.find(t => t.label === 'Kingdom')?.value,
                      phylum: selectedSpecies.taxonomy?.find(t => t.label === 'Phylum')?.value,
                      class: selectedSpecies.taxonomy?.find(t => t.label === 'Class')?.value,
                      order: selectedSpecies.taxonomy?.find(t => t.label === 'Order')?.value,
                      family: selectedSpecies.taxonomy?.find(t => t.label === 'Family')?.value,
                      genus: selectedSpecies.taxonomy?.find(t => t.label === 'Genus')?.value,
                      species: selectedSpecies.scientificName,
                    },
                    iNaturalistData: {
                      id: selectedSpecies.taxonId,
                      name: selectedSpecies.scientificName,
                      preferred_common_name: selectedSpecies.commonName,
                      rank: selectedSpecies.rank,
                      iconic_taxon_name: selectedSpecies.iconicTaxon,
                      conservation_status: selectedSpecies.conservation ? {
                        status_name: selectedSpecies.conservation
                      } : null,
                      wikipedia_summary: selectedSpecies.about,
                      default_photo: selectedSpecies.imageUrl ? {
                        medium_url: selectedSpecies.imageUrl
                      } : null,
                    },
                    iNatObsCount: selectedSpecies.iNatObsCount || 0,
                    confidence: selectedSpecies.confidence || null,
                    offlineCacheId: selectedSpecies.taxonId || selectedSpecies.scientificName || selectedSpecies.name,
                  };
                  
                  // ✅ NAVIGATE FIRST, THEN CLOSE MODAL
                  navigation.navigate('SpeciesLandingPage', navigationData);
                  
                  // ✅ CLOSE MODAL AFTER SHORT DELAY
                  setTimeout(() => {
                    closeModal();
                  }, 100);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#5E936C', '#3E704C']}
                  style={styles.viewDetailsGradient}
                >
                  <Ionicons name="information-circle" size={22} color="#fff" />
                  <Text style={styles.viewDetailsText}>View Full Details</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#5E936C', '#4A7A5A']}
          style={styles.header}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>History</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E936C" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </View>
    );
  }

  if (!uid) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#5E936C', '#4A7A5A']}
          style={styles.header}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>History</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconWrapper}>
            <LinearGradient
              colors={['#5E936C', '#3E704C']}
              style={styles.emptyIconGradient}
            >
              <Ionicons name="person-outline" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>Sign in Required</Text>
          <Text style={styles.emptyText}>
            Create an account or sign in to view your scan history.
          </Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <LinearGradient
              colors={['#5E936C', '#3E704C']}
              style={styles.signInGradient}
            >
              <Text style={styles.signInText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#5E936C', '#4A7A5A']}
        style={styles.header}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            {selectionMode ? (
              <>
                <TouchableOpacity onPress={toggleSelectionMode} style={styles.headerButton}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.selectionTitle}>
                  {selectedItems.size} Selected
                </Text>
                <TouchableOpacity onPress={selectAll} style={styles.headerButton}>
                  <Ionicons 
                    name={selectedItems.size === filteredItems.length ? "checkbox" : "checkbox-outline"} 
                    size={24} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.headerTitle}>History</Text>
                {items.length > 0 && (
                  <TouchableOpacity 
                    onPress={toggleSelectionMode} 
                    style={styles.headerButton}
                  >
                    <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
                {items.length === 0 && <View style={{ width: 40 }} />}
              </>
            )}
          </View>
          
          {!selectionMode && items.length > 0 && (
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Ionicons name="time" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.statText}>
                  {paginatedItems.length} of {filteredItems.length} shown • Total: {items.length}
                </Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* ✅ ADD Visual indicator for offline mode */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.offlineBannerText}>
            {isPremium ? '✅ Offline Mode (Premium)' : '⚠️ Offline - Subscribe for access'}
          </Text>
        </View>
      )}

      {items.length > 0 && !selectionMode && (
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={setSearchText}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchText('')} 
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[
                styles.filterButton, 
                filterType === 'all' && styles.filterButtonActive
              ]}
              onPress={() => setFilterType('all')}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterButtonText, 
                filterType === 'all' && styles.filterButtonTextActive
              ]}>
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton, 
                filterType === 'plants' && styles.filterButtonActive
              ]}
              onPress={() => setFilterType('plants')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="leaf" 
                size={16} 
                color={filterType === 'plants' ? '#fff' : '#5E936C'} 
                style={{ marginRight: 4 }}
              />
              <Text style={[
                styles.filterButtonText, 
                filterType === 'plants' && styles.filterButtonTextActive
              ]}>
                Plants
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton, 
                filterType === 'animals' && styles.filterButtonActive
              ]}
              onPress={() => setFilterType('animals')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="paw" 
                size={16} 
                color={filterType === 'animals' ? '#fff' : '#5E936C'} 
                style={{ marginRight: 4 }}
              />
              <Text style={[
                styles.filterButtonText, 
                filterType === 'animals' && styles.filterButtonTextActive
              ]}>
                Animals
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {items.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconWrapper}>
            <LinearGradient
              colors={['#5E936C', '#3E704C']}
              style={styles.emptyIconGradient}
            >
              <Ionicons name="time-outline" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>No History Yet</Text>
          <Text style={styles.emptyText}>
            Your species scan history will appear here once you start identifying plants and animals.
          </Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconWrapper}>
            <LinearGradient
              colors={['#5E936C', '#3E704C']}
              style={styles.emptyIconGradient}
            >
              <Ionicons name="search-outline" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>No Results Found</Text>
          <Text style={styles.emptyText}>
            No records match your search or filter criteria. Try adjusting your filters.
          </Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => {
              setSearchText('');
              setFilterType('all');
            }}
          >
            <LinearGradient
              colors={['#5E936C', '#3E704C']}
              style={styles.signInGradient}
            >
              <Text style={styles.signInText}>Clear Filters</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        // ========== FIX 5: UPDATED FLATLIST WITH PAGINATION ==========
        <FlatList
          data={paginatedItems}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          extraData={paginatedItems.length}
          contentContainerStyle={styles.listContent}
          
          // ✅ PERFORMANCE PROPS
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          updateCellsBatchingPeriod={50}
          
          // ✅ PAGINATION
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          
          ListFooterComponent={
            hasMore ? (
              <View style={styles.loadMoreIndicator}>
                <ActivityIndicator size="small" color="#5E936C" />
                <Text style={styles.loadMoreText}>Loading more...</Text>
              </View>
            ) : null
          }
          
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#5E936C']} 
              tintColor="#5E936C"
            />
          }
        />
      )}

      {selectionMode && selectedItems.size > 0 && (
        <View style={styles.bottomBar}>
          <LinearGradient
            colors={['#dc2626', '#b91c1c']}
            style={styles.bottomBarGradient}
          >
            <TouchableOpacity 
              style={styles.bottomBarButton}
              onPress={deleteSelected}
              activeOpacity={0.8}
              disabled={isDeletingBatch} // ✅ Disable during batch delete
            >
              {isDeletingBatch ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={22} color="#fff" />
                  <Text style={styles.bottomBarText}>
                    Delete {selectedItems.size} {selectedItems.size === 1 ? 'record' : 'records'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {!selectionMode && items.length > 0 && (
        <TouchableOpacity 
          style={styles.fab}
          onPress={clearAllHistoryData}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#ef4444', '#dc2626']}
            style={styles.fabGradient}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <SpeciesDetailsModal />

      {/* ✅ OFFLINE PREMIUM GATE */}
      <PremiumGate
        visible={premiumGateVisible}
        onClose={() => setPremiumGateVisible(false)}
        onUpgrade={() => {
          setPremiumGateVisible(false);
          navigation.navigate('Plan');
        }}
        title="Subscribe to Access Offline Mode"
        message="Offline access to your History is a premium feature. Subscribe to view your scan history when you're offline."
        feature="offline_history"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    left: 9,
  },
  selectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  statText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  // ✅ ADD Offline Banner Styles
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  offlineBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  searchFilterContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#F5F7FA',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 5,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#5E936C',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  filterButtonActive: {
    backgroundColor: '#5E936C',
    borderColor: '#5E936C',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E936C',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 100,
  },
  swipeContainer: {
    marginBottom: 12,
    marginHorizontal: 16,
    position: 'relative',
  },
  cardWrapper: {
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  deleteButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  selectionCheckbox: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  emptyCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  // ========== FIX 1: ADDED IMAGE LOADER STYLE ==========
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallback: { 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  scientificName: {
    color: '#6B7280',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  globalObsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  globalObsText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  signInButton: {
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#5E936C',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  signInGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    gap: 8,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 88,
    left: 0,
    right: 0,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
  },
  bottomBarGradient: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bottomBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bottomBarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    bottom: 104,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#ef4444',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, 
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    minHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
    position: 'relative',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    marginBottom: 12,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  modalImageContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  modalImage: {
    width: 160,
    height: 160,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
  },
  modalImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  publicToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  publicToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publicToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 34,
    paddingHorizontal: 10,
  },
  detailsContainer: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  detailIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 22,
  },
  italicText: {
    fontStyle: 'italic',
    fontWeight: '500',
  },
  conservationText: {
    color: '#059669',
    fontWeight: '700',
  },
  globalObsDetailText: {
    color: '#059669',
    fontWeight: '700',
  },
  descriptionContainer: {
    marginBottom: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#374151',
    textAlign: 'left',
  },
  viewDetailsButton: {
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#5E936C',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  viewDetailsGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  viewDetailsText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // ========== FIX 3: ADDED LOAD MORE STYLES ==========
  loadMoreIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});