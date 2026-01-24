import { useCallback, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { auth } from '@config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getFavorites, removeFromFavorites } from '@services/firebase';

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

export default function useFavorites() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);

  // ✅ FIX: Validate image URL - only use if it's a valid remote URL
  const isValidImageUrl = (url) => {
    if (!url) return false;
    // Check if it's a valid HTTP/HTTPS URL (not a local file:// URI)
    return url.startsWith('http://') || url.startsWith('https://');
  };

  // ✅ FIX: Get valid image URL from item data
  const getValidImageUrl = (item) => {
    // Try imageUrl first
    if (isValidImageUrl(item.imageUrl)) {
      return item.imageUrl;
    }
    
    // Try imageUri as fallback
    if (isValidImageUrl(item.imageUri)) {
      return item.imageUri;
    }
    
    // Try other possible image fields
    if (isValidImageUrl(item.image)) {
      return item.image;
    }
    
    if (isValidImageUrl(item.photoUrl)) {
      return item.photoUrl;
    }
    
    // No valid URL found
    return null;
  };

  const loadFavorites = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const result = await getFavorites(uid);
      
      if (result.success) {
        const normalized = result.data.map((it, idx) => {
          // ✅ FIX: Get valid image URL, filtering out file:// URIs
          const validImageUrl = getValidImageUrl(it);
          
          // ✅ FIX: Use getTimestampValue instead of .toMillis()
          const createdAtValue = getTimestampValue(it.addedAt || it.createdAt);
          
          return {
            id: it.id || `favorite:${it.plantName || it.name || 'item'}:${idx}`,
            name: it.plantName || it.name || it.commonName || it.scientificName || 'Unknown',
            scientificName: it.scientificName || null,
            commonName: it.commonName || null,
            rank: it.rank || null,
            iconicTaxon: it.iconicTaxon || null,
            taxonId: it.taxonId || null,
            conservation: it.conservation || null,
            about: it.about || it.description || null,
            iNatObsCount: it.iNatObsCount || 0,
            // ✅ FIX: Only store valid remote URLs
            imageUrl: validImageUrl,
            imageUri: validImageUrl, // Keep both for compatibility
            type: it.type || 'favorite',
            createdAt: createdAtValue, // ✅ FIX: Already a number
            originalData: it.originalData || null,
          };
        });
        
        // ✅ FIX: Sort using numbers (no .toMillis needed)
        normalized.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        
        // ✅ Log items with invalid images for debugging
        const itemsWithoutImages = normalized.filter(item => !item.imageUrl);
        if (itemsWithoutImages.length > 0) {
          console.warn(`⚠️ ${itemsWithoutImages.length} favorites have no valid image URL:`, 
            itemsWithoutImages.map(i => i.name)
          );
        }
        
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