//HistoryScreen.js
import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Image, RefreshControl, Alert, Dimensions,
  Animated, PanResponder, Modal, ScrollView, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getHistory, deleteHistoryItem, clearAllHistory } from '../firestoreService';

const { width } = Dimensions.get('window');

export default function HistoryScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState(null);

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
          type: it.type || 'history',
          createdAt: it.timestamp?.toMillis() || it.createdAt || Date.now(),
          originalData: it.originalData || null,
        }));
        
        normalized.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setItems(normalized);
      } else {
        console.warn('Failed to load history:', result.error);
        setItems([]);
      }
    } catch (e) {
      console.error('Error loading history:', e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [uid]);

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

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedItems(new Set());
  };

  const toggleItemSelection = (itemId) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId);
    } else {
      newSelection.add(itemId);
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedItems.size === 0 || !uid) return;

    Alert.alert(
      'Delete Selected',
      `Delete ${selectedItems.size} selected item(s) from history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = Array.from(selectedItems).map(itemId => 
                deleteHistoryItem(uid, itemId)
              );
              
              await Promise.all(deletePromises);
              await loadHistory();
              setSelectedItems(new Set());
              setSelectionMode(false);
              Alert.alert('Success', `${selectedItems.size} item(s) deleted from history`);
            } catch (error) {
              console.error('Error deleting items:', error);
              Alert.alert('Error', 'Failed to delete selected items');
            }
          },
        },
      ]
    );
  };

  const clearAllHistoryData = () => {
    if (items.length === 0 || !uid) return;
    
    Alert.alert('Clear History', 'Remove all history entries?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await clearAllHistory(uid);
            if (result.success) {
              setItems([]);
              setSelectionMode(false);
              setSelectedItems(new Set());
              Alert.alert('Success', 'All history cleared');
            } else {
              Alert.alert('Error', 'Failed to clear history');
            }
          } catch (error) {
            console.error('Error clearing history:', error);
            Alert.alert('Error', 'Failed to clear history');
          }
        },
      },
    ]);
  };

  const deleteItem = async (item) => {
    if (!uid) return;
    
    Alert.alert(
      'Delete Item',
      `Delete "${item.name}" from history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteHistoryItem(uid, item.id);
              if (result.success) {
                await loadHistory();
                Alert.alert('Success', 'Item deleted from history');
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

  const openItem = (item) => {
    if (selectionMode) {
      toggleItemSelection(item.id);
      return;
    }

    setSelectedSpecies(item);
    setDetailsModalVisible(true);
  };

  const closeModal = () => {
    setDetailsModalVisible(false);
    setSelectedSpecies(null);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

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
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              <View style={styles.modalImageContainer}>
                {selectedSpecies.imageUrl ? (
                  <Image 
                    source={{ uri: selectedSpecies.imageUrl }} 
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.modalImage, styles.modalImageFallback]}>
                    <Ionicons name="image-outline" size={60} color="#94A3B8" />
                  </View>
                )}
              </View>

              <Text style={styles.modalTitle}>
                {selectedSpecies.name || 'Unknown Species'}
              </Text>

              <View style={styles.detailsContainer}>
                {selectedSpecies.commonName && selectedSpecies.commonName !== selectedSpecies.name && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Common Name</Text>
                    <Text style={styles.detailValue}>{selectedSpecies.commonName}</Text>
                  </View>
                )}
                
                {selectedSpecies.scientificName && selectedSpecies.scientificName !== selectedSpecies.name && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Scientific Name</Text>
                    <Text style={[styles.detailValue, styles.italicText]}>
                      {selectedSpecies.scientificName}
                    </Text>
                  </View>
                )}
                
                {selectedSpecies.rank && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Taxonomic Rank</Text>
                    <Text style={styles.detailValue}>{selectedSpecies.rank}</Text>
                  </View>
                )}
                
                {selectedSpecies.iconicTaxon && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Iconic Taxon</Text>
                    <Text style={styles.detailValue}>{selectedSpecies.iconicTaxon}</Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Observations</Text>
                  <Text style={styles.detailValue}>
                    {selectedSpecies.iNatObsCount?.toLocaleString() || '0'}
                  </Text>
                </View>
                
                {selectedSpecies.conservation && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Conservation Status</Text>
                    <Text style={[styles.detailValue, styles.conservationText]}>
                      {selectedSpecies.conservation}
                    </Text>
                  </View>
                )}
                
                {selectedSpecies.taxonId && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>iNaturalist ID</Text>
                    <Text style={styles.detailValue}>{selectedSpecies.taxonId}</Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Added to History</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedSpecies.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              {selectedSpecies.about && (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionTitle}>Description</Text>
                  <Text style={styles.descriptionText}>
                    {selectedSpecies.about}
                  </Text>
                </View>
              )}
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const SwipeableCard = ({ item, isSelected, onPress, onDelete }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const [isRevealed, setIsRevealed] = useState(false);

    const panResponder = PanResponder.create({
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
    });

    const resetSwipe = () => {
      Animated.timing(translateX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
      setIsRevealed(false);
    };

    return (
      <View style={styles.swipeContainer}>
        <View style={styles.deleteBackground}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              resetSwipe();
              onDelete(item);
            }}
          >
            <Ionicons name="trash-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[
            styles.cardWrapper,
            { transform: [{ translateX }] }
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity 
            style={[styles.card, isSelected && styles.cardSelected]} 
            activeOpacity={0.7} 
            onPress={() => {
              if (isRevealed) {
                resetSwipe();
              } else {
                onPress();
              }
            }}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={[styles.image, styles.imageFallback]}>
                <Ionicons name="image-outline" size={28} color="#94A3B8" />
              </View>
            )}
            
            <View style={styles.infoContainer}>
              <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
              {item.scientificName && item.scientificName !== item.name && (
                <Text numberOfLines={1} style={styles.scientificName}>{item.scientificName}</Text>
              )}
              {item.rank && (
                <Text numberOfLines={1} style={styles.metadata}>Rank: {item.rank}</Text>
              )}
              
              <View style={styles.bottomRow}>
                <Text style={styles.timestamp}>{formatDate(item.createdAt)}</Text>
                <View style={styles.obsCount}>
                  <Ionicons name="eye" size={12} color="#666" />
                  <Text style={styles.obsText}>{item.iNatObsCount || 0}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.has(item.id);

    return (
      <SwipeableCard
        item={item}
        isSelected={isSelected}
        onPress={() => openItem(item)}
        onDelete={deleteItem}
      />
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topbar}>
          <Text style={styles.topbarTitle}>History</Text>
        </View>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#5E936C" />
          <Text style={{ marginTop: 10, color: '#666' }}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!uid) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topbar}>
          <Text style={styles.topbarTitle}>History</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.emptyWrap}>
            <Ionicons name="person-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Sign in to view history</Text>
            <Text style={styles.emptyText}>Your scan history will be saved when you sign in.</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        {selectionMode ? (
          <>
            <TouchableOpacity onPress={toggleSelectionMode} style={styles.cancelButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.selectionTitle}>
              {selectedItems.size} Selected
            </Text>
            <View style={styles.selectionActions}>
              <TouchableOpacity onPress={selectAll} style={styles.actionButton}>
                <Ionicons name="checkmark-done" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.topbarTitle}>History</Text>
          </>
        )}
      </View>
      
      <View style={styles.content}>        
        {items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="time-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No history yet</Text>
            <Text style={styles.emptyText}>Your species identification history will appear here.</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#5E936C']} tintColor="#5E936C" />}
          />
        )}
      </View>

      {items.length > 0 && !selectionMode && (
        <TouchableOpacity 
          style={styles.floatingSelectButton}
          onPress={toggleSelectionMode}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {selectionMode && selectedItems.size > 0 && (
        <TouchableOpacity 
          style={styles.floatingDeleteButton}
          onPress={deleteSelected}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <SpeciesDetailsModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  topbar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#5E936C',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  topbarTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
  },
  cancelButton: {
    padding: 8,
  },
  selectionTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    right: -21,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    paddingTop: 70,
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
    backgroundColor: '#ef4444',
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
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardSelected: {
    borderColor: '#22c55e',
    borderWidth: 2,
    backgroundColor: 'rgba(34,197,94,0.05)',
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  infoContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  scientificName: {
    color: '#6b7280',
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 2,
  },
  metadata: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    color: '#9ca3af',
    fontSize: 12,
  },
  obsCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  obsText: {
    color: '#666',
    fontSize: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 10,
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 4,
    color: '#334155',
    textAlign: 'center',
  },
  floatingSelectButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5E936C',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingDeleteButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
    width: 140,
    height: 140,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
  },
  modalImageFallback: {
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
    flex: 1,
    marginRight: 16,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    flex: 2,
    textAlign: 'right',
  },
  italicText: {
    fontStyle: 'italic',
    fontWeight: '500',
  },
  conservationText: {
    color: '#059669',
    fontWeight: '700',
  },
  descriptionContainer: {
    marginBottom: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
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
});