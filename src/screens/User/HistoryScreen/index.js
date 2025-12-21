// HistoryScreen/index.
import React, { useCallback, useState, useEffect, useRef } from 'react';
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
  clearAllHistory, 
  getGlobalObservationCounts,
  toggleHistoryItemVisibility,
} from '@services/firebase';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [globalCounts, setGlobalCounts] = useState({});

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
        createdAt: it.timestamp?.toMillis() || it.createdAt || Date.now(),
        originalData: it.originalData || null,
        // ✅ FIX: Each scan has its own privacy status, defaults to false if not set
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
        
        setItems(normalized);

      const countsResult = await getGlobalObservationCounts(normalized);
if (countsResult.success) {
  setGlobalCounts(countsResult.counts);
        
        const updatedItems = normalized.map(item => {
    const docId = item.taxonId 
      ? `taxon_${item.taxonId}` 
      : (item.scientificName || item.name || '').toLowerCase().replace(/\s+/g, '_');
          
           return {
      ...item,
      globalObsCount: countsResult.counts[docId] || item.globalObsCount || 0
    };
  });
        
         setItems(updatedItems);
}
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

  const handleTogglePublic = async (item) => {
    if (!uid) return;

    try {
      const newStatus = !item.isPublic;
      const result = await toggleHistoryItemVisibility(uid, item.id, newStatus);
      
      if (result.success) {
        // Update local state in items list
        setItems(prevItems => 
          prevItems.map(i => 
            i.id === item.id ? { ...i, isPublic: newStatus } : i
          )
        );
        
        // Close the modal
        closeModal();
        
        // Show success message
        Alert.alert(
          'Success',
          `Scan is now ${newStatus ? 'public' : 'private'}`
        );
      } else {
        Alert.alert('Error', 'Failed to update visibility');
      }
    } catch (error) {
      console.error('Error toggling visibility:', error);
      Alert.alert('Error', 'Failed to update visibility');
    }
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
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedItems.size === 0 || !uid) return;

    Alert.alert(
      'Delete Selected',
      `Delete ${selectedItems.size} ${selectedItems.size === 1 ? 'record' : 'records'} from history?`,
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
              Alert.alert('Success', `${selectedItems.size} ${selectedItems.size === 1 ? 'record' : 'records'} deleted`);
            } catch (error) {
              console.error('Error deleting items:', error);
              Alert.alert('Error', 'Failed to delete selected records');
            }
          },
        },
      ]
    );
  };

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
      ]
    );
  };

  const deleteItem = async (item) => {
    if (!uid) return;
    
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
              const result = await deleteHistoryItem(uid, item.id);
              if (result.success) {
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
  };

  const getFilteredItems = () => {
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

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(query) ||
        item.commonName?.toLowerCase().includes(query) ||
        item.scientificName?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredItems = getFilteredItems();

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

              {/* VIEW FULL DETAILS BUTTON */}
              <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => {
                  closeModal();
                  navigation.navigate('SpeciesLandingPage', {
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
                  });
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
        <LinearGradient
          colors={['#ef4444', '#dc2626']}
          style={styles.deleteBackground}
        >
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => {
              resetSwipe();
              onDelete(item);
            }}
          >
            <Ionicons name="trash-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

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
            onLongPress={() => {
              if (!selectionMode) {
                toggleSelectionMode();
                toggleItemSelection(item.id);
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

            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <LinearGradient
                colors={['#E8F5E9', '#C8E6C9']}
                style={[styles.image, styles.imageFallback]}
              >
                <Ionicons name="image-outline" size={32} color="#5E936C" />
              </LinearGradient>
            )}
            
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
                  <TouchableOpacity onPress={toggleSelectionMode} style={styles.headerButton}>
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
                  {filteredItems.length} of {items.length} {items.length === 1 ? 'record' : 'records'}
                </Text>
              </View>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {items.length > 0 && !selectionMode && (
        <View style={styles.searchFilterContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
              onPress={() => setFilterType('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>
                All
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, filterType === 'plants' && styles.filterButtonActive]}
              onPress={() => setFilterType('plants')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="leaf" 
                size={16} 
                color={filterType === 'plants' ? '#fff' : '#5E936C'} 
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.filterButtonText, filterType === 'plants' && styles.filterButtonTextActive]}>
                Plants
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, filterType === 'animals' && styles.filterButtonActive]}
              onPress={() => setFilterType('animals')}
              activeOpacity={0.7}
            >
              <Ionicons 
                name="paw" 
                size={16} 
                color={filterType === 'animals' ? '#fff' : '#5E936C'} 
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.filterButtonText, filterType === 'animals' && styles.filterButtonTextActive]}>
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
              setSearchQuery('');
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
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={['#5E936C']} 
              tintColor="#5E936C"/>
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
            >
              <Ionicons name="trash-outline" size={22} color="#fff" />
              <Text style={styles.bottomBarText}>
                Delete {selectedItems.size} {selectedItems.size === 1 ? 'record' : 'records'}
              </Text>
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
    padding: 4,
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
    bottom: 0,
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
    paddingBottom: 32,
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
    bottom: 30,
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
});