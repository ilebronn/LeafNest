import { useCallback, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { auth } from '@config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getFavorites, removeFromFavorites } from '@services/firebase';
import * as FileSystem from 'expo-file-system/legacy';

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

// ✅ Helper to normalize confidence into a 0-100 percent scale
const normalizeConfidence = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const percent = n <= 1.5 ? n * 100 : n;
  const clamped = Math.min(Math.max(percent, 0), 100);
  return Math.round(clamped);
};

export default function useFavorites() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uid, setUid] = useState(auth.currentUser?.uid ?? null);

  // ✅ FIX: Support both remote and local image URIs
  const isRemoteImageUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('http://') || url.startsWith('https://');
  };

  const isLocalImageUri = (url) => {
    if (!url || typeof url !== 'string') return false;
    return (
      url.startsWith('file://') ||
      url.startsWith('content://') ||
      url.startsWith('ph://') ||
      url.startsWith('assets-library://') ||
      url.startsWith('asset:/') ||
      url.startsWith('data:')
    );
  };

  const getImageSources = (item) => {
    const candidates = [item.imageUrl, item.imageUri, item.image, item.photoUrl];
    const remoteUrl = candidates.find(isRemoteImageUrl) || null;
    const localUri = candidates.find(isLocalImageUri) || null;
    const bestUri = remoteUrl || localUri || null;
    return { remoteUrl, localUri, bestUri };
  };

  const fileExists = async (uri) => {
    if (!uri || typeof uri !== 'string') return false;
    if (!uri.startsWith('file://')) return true; // Cannot reliably verify non-file URIs
    try {
      const info = await FileSystem.getInfoAsync(uri);
      return info.exists;
    } catch (error) {
      console.warn('⚠️ Failed to verify local image:', uri, error?.message);
      return false;
    }
  };

  const getGenusKey = (name) => {
    if (!name || typeof name !== 'string') return null;
    const trimmed = name.trim();
    if (!trimmed) return null;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) return null;
    const genus = parts[0].toLowerCase();
    if (!genus || genus === 'unknown') return null;
    return genus;
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
          // ✅ FIX: Prefer remote URLs, but keep local URIs for offline display
          const { remoteUrl, localUri } = getImageSources(it);
          
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
            confidence: normalizeConfidence(it.confidence),
            // ✅ FIX: Store remote + local separately
            imageUrl: remoteUrl,
            imageUri: localUri || remoteUrl || null,
            type: it.type || 'favorite',
            createdAt: createdAtValue, // ✅ FIX: Already a number
            originalData: it.originalData || null,
            genusKey: it.genusKey || getGenusKey(it.scientificName || it.name) || null,
          };
        });
        const sanitized = await Promise.all(
          normalized.map(async (item) => {
            if (item.imageUrl) return item;
            if (item.imageUri && item.imageUri.startsWith('file://')) {
              const exists = await fileExists(item.imageUri);
              if (!exists) {
                console.warn('⚠️ Favorite image missing, using placeholder:', item.name);
                return { ...item, imageUri: null };
              }
            }
            return item;
          })
        );

        // ✅ FIX: Sort using numbers (no .toMillis needed)
        sanitized.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

        // ✅ De-dup favorites by stable identifier
        const seen = new Set();
        const deduped = [];
        for (const item of sanitized) {
          const key = item.taxonId
            ? `taxon_${item.taxonId}`
            : (item.scientificName || item.name || item.commonName || '').toLowerCase().trim();
          const groupKey = item.genusKey
            ? `${(item.iconicTaxon || '').toLowerCase()}:${item.genusKey}`
            : null;
          if (!key && !groupKey) continue;
          if (key && seen.has(key)) continue;
          if (groupKey && seen.has(groupKey)) continue;
          if (key) seen.add(key);
          if (groupKey) seen.add(groupKey);
          deduped.push(item);
        }
        
        // ✅ Log items with invalid images for debugging
        const itemsWithoutImages = sanitized.filter(item => !item.imageUrl && !item.imageUri);
        if (itemsWithoutImages.length > 0) {
          console.warn(`⚠️ ${itemsWithoutImages.length} favorites have no valid image URL:`, 
            itemsWithoutImages.map(i => i.name)
          );
        }
        
        setItems(deduped);
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
