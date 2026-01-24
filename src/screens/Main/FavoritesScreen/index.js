// FavoritesScreen/index.js
import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Alert, ActivityIndicator, Modal, ScrollView, Image, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import useFavorites from '@hooks/useFavorites';
import FavoriteCard from '@components/common/Card/FavoriteCard';
import { cacheFullDetails } from '@services/storage/offlineStorage';

// ✅ ADD IMPORTS
import { useOfflineAccess } from '@hooks/useOfflineAccess';
import PremiumGate from '@components/modals/PremiumGate';

export default function FavoritesScreen({ navigation }) {
  const { items, loading, refreshing, uid, loadFavorites, onRefresh, deleteSelected, clearAll } = useFavorites();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [modalImageError, setModalImageError] = useState(false);
  
  // ✅ ADD STATE for premium gate
  const [premiumGateVisible, setPremiumGateVisible] = useState(false);

  // ✅ ADD HOOK for offline access
  const { 
    isOffline, 
    isPremium, 
    canAccessOffline, 
    shouldBlockOfflineAccess 
  } = useOfflineAccess();

  useFocusEffect(useCallback(() => { loadFavorites(); }, [loadFavorites]));

  // ✅ FIX: Validate image URL - only use if it's a valid remote URL
  const isValidImageUrl = (url) => {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
  };

  // ✅ FIX: Get the best available image URL
  const getImageSource = (item) => {
    if (isValidImageUrl(item?.imageUrl)) {
      return item.imageUrl;
    }
    if (isValidImageUrl(item?.imageUri)) {
      return item.imageUri;
    }
    return null;
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

  const handleDeleteSelected = async () => {
    await deleteSelected(selectedItems);
    setSelectedItems(new Set());
    setSelectionMode(false);
  };

  // ✅ MODIFIED openItem function with offline premium check
  const openItem = (item) => {
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
    setModalImageError(false); // Reset error state when opening new modal
    setDetailsModalVisible(true);
  };

  const closeModal = () => {
    setDetailsModalVisible(false);
    setSelectedSpecies(null);
    setModalImageError(false);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.has(item.id);

    return (
      <FavoriteCard
        item={item}
        isSelected={isSelected}
        selectionMode={selectionMode}
        onPress={() => openItem(item)}
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            toggleItemSelection(item.id);
          }
        }}
      />
    );
  };

  const SpeciesDetailsModal = () => {
    if (!selectedSpecies || !detailsModalVisible) return null;

    const modalImageSource = getImageSource(selectedSpecies);
    const shouldShowModalImage = modalImageSource && !modalImageError;

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
                {shouldShowModalImage ? (
                  <Image 
                    source={{ uri: modalImageSource }} 
                    style={styles.modalImage}
                    resizeMode="cover"
                    onError={(error) => {
                      console.error('❌ Modal image failed to load:', modalImageSource);
                      console.error('Error:', error.nativeEvent.error);
                      setModalImageError(true);
                    }}
                    onLoad={() => {
                      console.log('✅ Modal image loaded:', modalImageSource);
                    }}
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

                {selectedSpecies.iNatObsCount > 0 && (
                  <View style={styles.detailRow}>
                    <Ionicons name="earth-outline" size={20} color="#059669" style={styles.detailIcon} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>iNaturalist Observations</Text>
                      <Text style={[styles.detailValue, styles.globalObsDetailText]}>
                        {selectedSpecies.iNatObsCount.toLocaleString()} {selectedSpecies.iNatObsCount === 1 ? 'observation' : 'observations'}
                      </Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Ionicons name="heart" size={20} color="#ef4444" style={styles.detailIcon} />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Added to Favorites</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedSpecies.createdAt || Date.now())}
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

                  closeModal();
                  
                  // ✅ OFFLINE CACHING: Cache full details for offline access
                  if (uid && selectedSpecies) {
                    try {
                      const itemId = selectedSpecies.taxonId || selectedSpecies.scientificName || selectedSpecies.name;
                      
                      const fullData = {
                        ...selectedSpecies,
                        originalData: selectedSpecies.originalData,
                        cachedFrom: 'favorites',
                        cachedAt: Date.now(),
                      };
                      
                      await cacheFullDetails(uid, itemId, fullData);
                      console.log('✅ Cached details from Favorites for offline access');
                    } catch (error) {
                      console.error('❌ Failed to cache details:', error);
                    }
                  }
                  
                  const validImageSource = getImageSource(selectedSpecies);
                  navigation.navigate('SpeciesLandingPage', {
                  photoUri: validImageSource || selectedSpecies.imageUri || selectedSpecies.imageUrl,
                  speciesData: selectedSpecies.originalData || {
                  scientificName: selectedSpecies.scientificName,
                  canonicalName: selectedSpecies.scientificName,
                  rank: selectedSpecies.rank,
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
                  default_photo: validImageSource ? {
                  medium_url: validImageSource
                    } : null,
                  },
                  iNatObsCount: selectedSpecies.iNatObsCount || 0,
                  confidence: selectedSpecies.confidence || null, // ✅ ADD THIS LINE
                  offlineCacheId: selectedSpecies.taxonId || selectedSpecies.scientificName || selectedSpecies.name,
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

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#5E936C', '#4A7A5A']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Favorites</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E936C" />
          <Text style={styles.loadingText}>Loading favorites...</Text>
        </View>
      </View>
    );
  }

  if (!uid) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#5E936C', '#4A7A5A']} style={styles.header}>
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Favorites</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconWrapper}>
            <LinearGradient colors={['#5E936C', '#3E704C']} style={styles.emptyIconGradient}>
              <Ionicons name="person-outline" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>Sign in Required</Text>
          <Text style={styles.emptyText}>
            Create an account or sign in to save and view your favorite species.
          </Text>
          <TouchableOpacity style={styles.signInButton} onPress={() => navigation.navigate('Profile')}>
            <LinearGradient colors={['#5E936C', '#3E704C']} style={styles.signInGradient}>
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
      <LinearGradient colors={['#5E936C', '#4A7A5A']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerContent}>
            {selectionMode ? (
              <>
                <TouchableOpacity onPress={toggleSelectionMode} style={styles.headerButton}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.selectionTitle}>{selectedItems.size} Selected</Text>
                <TouchableOpacity onPress={selectAll} style={styles.headerButton}>
                  <Ionicons 
                    name={selectedItems.size === items.length ? "checkbox" : "checkbox-outline"} 
                    size={24} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ width: 40 }} />
                <Text style={styles.headerTitle}>Favorites</Text>
                {items.length > 0 ? (
                  <TouchableOpacity onPress={toggleSelectionMode} style={styles.headerButton}>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 40 }} />
                )}
              </>
            )}
          </View>
          
          {!selectionMode && items.length > 0 && (
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Ionicons name="heart" size={16} color="rgba(255,255,255,0.9)" />
                <Text style={styles.statText}>{items.length} species</Text>
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

      {items.length === 0 ? (
        <View style={styles.emptyStateContainer}>
          <View style={styles.emptyIconWrapper}>
            <LinearGradient colors={['#5E936C', '#3E704C']} style={styles.emptyIconGradient}>
              <Ionicons name="heart-outline" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.emptyTitle}>No Favorites Yet</Text>
          <Text style={styles.emptyText}>
            Start exploring and tap the heart icon to save your favorite plants and animals here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
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
          <LinearGradient colors={['#dc2626', '#b91c1c']} style={styles.bottomBarGradient}>
            <TouchableOpacity style={styles.bottomBarButton} onPress={handleDeleteSelected} activeOpacity={0.8}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
              <Text style={styles.bottomBarText}>
                Delete {selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {!selectionMode && items.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={clearAll} activeOpacity={0.8}>
          <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.fabGradient}>
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
        message="Offline access to your Favorites is a premium feature. Subscribe to view your favorite species when you're offline."
        feature="offline_favorites"
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
  listContent: {
    paddingTop: 20,
    paddingBottom: 100,
  },
  columnWrapper: {
    gap: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
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