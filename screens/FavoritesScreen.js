//FavoritesScreen.js
import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Image, RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFavorites, removeFromFavorites } from '../firestoreService';

export default function FavoritesScreen({ navigation }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState(new Set());

  const loadFavorites = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const result = await getFavorites(uid);
      
      if (result.success) {
        const normalized = result.data.map((it, idx) => ({
          id: it.id || `favorite:${it.plantName || it.name || 'item'}:${idx}`,
          name: it.plantName || it.name || it.commonName || it.scientificName || 'Unknown',
          scientificName: it.scientificName || null,
          commonName: it.commonName || null,
          rank: it.rank || null,
          iconicTaxon: it.iconicTaxon || null,
          taxonId: it.taxonId || null,
          imageUrl: it.imageUrl || null,
          type: it.type || 'favorite',
          createdAt: it.addedAt?.toMillis() || it.createdAt || Date.now(),
        }));
        
        normalized.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setItems(normalized);
      } else {
        console.warn('Failed to load favorites:', result.error);
        setItems([]);
      }
    } catch (e) {
      console.error('Error loading favorites:', e);
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

  useFocusEffect(useCallback(() => { loadFavorites(); }, [loadFavorites]));
  useEffect(() => { loadFavorites(); }, [uid, loadFavorites]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
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
      `Delete ${selectedItems.size} selected item(s) from favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = Array.from(selectedItems).map(itemId => 
                removeFromFavorites(uid, itemId)
              );
              
              await Promise.all(deletePromises);
              await loadFavorites();
              setSelectedItems(new Set());
              setSelectionMode(false);
              Alert.alert('Success', `${selectedItems.size} item(s) removed from favorites`);
            } catch (error) {
              console.error('Error removing items:', error);
              Alert.alert('Error', 'Failed to remove selected items');
            }
          },
        },
      ]
    );
  };

  const clearAll = async () => {
    if (items.length === 0 || !uid) return;
    
    Alert.alert(
      t('favorites.clearFavorites') || 'Clear Favorites', 
      t('favorites.removeAllFavorites') || 'Remove all favorites?', 
      [
        { text: t('favorites.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('favorites.removeAll') || 'Remove All',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = items.map(item => 
                removeFromFavorites(uid, item.id)
              );
              
              await Promise.all(deletePromises);
              setItems([]);
              setSelectionMode(false);
              setSelectedItems(new Set());
              Alert.alert('Success', 'All favorites cleared');
            } catch (error) {
              console.error('Error clearing favorites:', error);
              Alert.alert(
                t('favorites.error') || 'Error', 
                t('favorites.failedToClear') || 'Failed to clear favorites'
              );
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

    Alert.alert(
      'Favorite Details',
      `Name: ${item.name}\n` +
      `${item.scientificName ? `Scientific Name: ${item.scientificName}\n` : ''}` +
      `${item.rank ? `Rank: ${item.rank}\n` : ''}` +
      `${item.iconicTaxon ? `Iconic Taxon: ${item.iconicTaxon}\n` : ''}` +
      `${item.taxonId ? `iNat Taxon ID: ${item.taxonId}` : ''}`,
      [{ text: 'OK' }]
    );
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedItems.has(item.id);

    return (
      <TouchableOpacity 
        style={[styles.card, isSelected && styles.cardSelected]} 
        activeOpacity={0.9} 
        onPress={() => openItem(item)}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <Ionicons name="image-outline" size={28} color="#94A3B8" />
          </View>
        )}
        <Text numberOfLines={1} style={styles.name}>{item.name}</Text>
        {item.scientificName && item.scientificName !== item.name && (
          <Text numberOfLines={1} style={styles.scientificName}>{item.scientificName}</Text>
        )}
        {item.rank && (
          <Text numberOfLines={1} style={styles.metadata}>Rank: {item.rank}</Text>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topbar}>
          <Text style={styles.topbarTitle}>Favorites</Text>
        </View>
        <View style={[styles.content, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#5E936C" />
          <Text style={{ marginTop: 10, color: '#666' }}>Loading favorites...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!uid) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topbar}>
          <Text style={styles.topbarTitle}>Favorites</Text>
        </View>
        <View style={styles.content}>
          <View style={styles.emptyWrap}>
            <Ionicons name="person-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Sign in to view favorites</Text>
            <Text style={styles.emptyText}>Your favorites will be saved when you sign in.</Text>
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
            <Text style={styles.topbarTitle}>Favorites</Text>
            <View style={styles.topbarActions}>
              {items.length > 0 && (
                <TouchableOpacity onPress={toggleSelectionMode} style={styles.selectButton}>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}
      </View>
      
      <View style={styles.content}>        
        {items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="heart-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyText}>Add some from Plants, Animals, or Species identification.</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
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

      {items.length > 0 && !selectionMode && (
        <TouchableOpacity 
          style={styles.floatingDeleteButton}
          onPress={clearAll}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {selectionMode && selectedItems.size > 0 && (
        <TouchableOpacity 
          style={styles.floatingDeleteSelectedButton}
          onPress={deleteSelected}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      )}
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
    right: -5,
  },
  cancelButton: {
    padding: 8,
  },
  selectionTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    right: -5,
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
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    padding: 10,
    marginBottom: 12,
    position: 'relative',
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
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  imageFallback: { alignItems: 'center', justifyContent: 'center' },
  name: {
    marginTop: 8,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  scientificName: {
    marginTop: 2,
    color: '#6b7280',
    fontSize: 12,
    fontStyle: 'italic',
  },
  metadata: {
    marginTop: 2,
    color: '#9ca3af',
    fontSize: 11,
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
    bottom: 100,
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
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingDeleteSelectedButton: {
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
});