import { useCallback, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { auth } from '@config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getFavorites, removeFromFavorites } from '@services/firebase';

export default function useFavorites() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);

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

  useEffect(() => {
    loadFavorites();
  }, [uid, loadFavorites]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const deleteItems = async (itemIds) => {
    if (!uid || itemIds.length === 0) return false;

    try {
      const deletePromises = itemIds.map(itemId => 
        removeFromFavorites(uid, itemId)
      );
      
      await Promise.all(deletePromises);
      await loadFavorites();
      return true;
    } catch (error) {
      console.error('Error removing items:', error);
      return false;
    }
  };

  const deleteSelected = async (selectedItems) => {
    const count = selectedItems.size;
    if (count === 0) return;

    Alert.alert(
      'Delete Selected',
      `Remove ${count} ${count === 1 ? 'item' : 'items'} from favorites?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteItems(Array.from(selectedItems));
            if (success) {
              Alert.alert('Success', `${count} ${count === 1 ? 'item' : 'items'} removed`);
            } else {
              Alert.alert('Error', 'Failed to remove selected items');
            }
          },
        },
      ]
    );
  };

  const clearAll = async () => {
    if (items.length === 0) return;
    
    Alert.alert(
      'Clear All Favorites', 
      'Are you sure you want to remove all favorites? This action cannot be undone.', 
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteItems(items.map(item => item.id));
            if (success) {
              Alert.alert('Success', 'All favorites cleared');
            } else {
              Alert.alert('Error', 'Failed to clear favorites');
            }
          },
        },
      ]
    );
  };

  return {
    items,
    loading,
    refreshing,
    uid,
    loadFavorites,
    onRefresh,
    deleteSelected,
    clearAll,
  };
}