// utils/offlineStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const KEYS = {
  HISTORY: (uid) => `history_${uid}`,
  FAVORITES: (uid) => `favorites_${uid}`,
  LAST_SYNC: (uid) => `last_sync_${uid}`,
};

// ==================== HISTORY ====================

export const saveHistoryOffline = async (uid, items) => {
  try {
    const key = KEYS.HISTORY(uid);
    await AsyncStorage.setItem(key, JSON.stringify(items));
    return { success: true };
  } catch (error) {
    console.error('Error saving history offline:', error);
    return { success: false, error: error.message };
  }
};

export const getHistoryOffline = async (uid) => {
  try {
    const key = KEYS.HISTORY(uid);
    const data = await AsyncStorage.getItem(key);
    return { 
      success: true, 
      data: data ? JSON.parse(data) : [] 
    };
  } catch (error) {
    console.error('Error getting history offline:', error);
    return { success: false, data: [] };
  }
};

export const addHistoryItemOffline = async (uid, item) => {
  try {
    const { data: existingItems } = await getHistoryOffline(uid);
    const newItems = [item, ...existingItems];
    await saveHistoryOffline(uid, newItems);
    return { success: true };
  } catch (error) {
    console.error('Error adding history item offline:', error);
    return { success: false, error: error.message };
  }
};

export const deleteHistoryItemOffline = async (uid, itemId) => {
  try {
    const { data: existingItems } = await getHistoryOffline(uid);
    const filtered = existingItems.filter(item => item.id !== itemId);
    await saveHistoryOffline(uid, filtered);
    return { success: true };
  } catch (error) {
    console.error('Error deleting history item offline:', error);
    return { success: false, error: error.message };
  }
};

export const clearHistoryOffline = async (uid) => {
  try {
    const key = KEYS.HISTORY(uid);
    await AsyncStorage.removeItem(key);
    return { success: true };
  } catch (error) {
    console.error('Error clearing history offline:', error);
    return { success: false, error: error.message };
  }
};

// ==================== FAVORITES ====================

export const saveFavoritesOffline = async (uid, items) => {
  try {
    const key = KEYS.FAVORITES(uid);
    await AsyncStorage.setItem(key, JSON.stringify(items));
    return { success: true };
  } catch (error) {
    console.error('Error saving favorites offline:', error);
    return { success: false, error: error.message };
  }
};

export const getFavoritesOffline = async (uid) => {
  try {
    const key = KEYS.FAVORITES(uid);
    const data = await AsyncStorage.getItem(key);
    return { 
      success: true, 
      data: data ? JSON.parse(data) : [] 
    };
  } catch (error) {
    console.error('Error getting favorites offline:', error);
    return { success: false, data: [] };
  }
};

export const addFavoriteOffline = async (uid, item) => {
  try {
    const { data: existingItems } = await getFavoritesOffline(uid);
    const newItems = [item, ...existingItems];
    await saveFavoritesOffline(uid, newItems);
    return { success: true };
  } catch (error) {
    console.error('Error adding favorite offline:', error);
    return { success: false, error: error.message };
  }
};

export const deleteFavoriteOffline = async (uid, itemId) => {
  try {
    const { data: existingItems } = await getFavoritesOffline(uid);
    const filtered = existingItems.filter(item => item.id !== itemId);
    await saveFavoritesOffline(uid, filtered);
    return { success: true };
  } catch (error) {
    console.error('Error deleting favorite offline:', error);
    return { success: false, error: error.message };
  }
};

export const clearFavoritesOffline = async (uid) => {
  try {
    const key = KEYS.FAVORITES(uid);
    await AsyncStorage.removeItem(key);
    return { success: true };
  } catch (error) {
    console.error('Error clearing favorites offline:', error);
    return { success: false, error: error.message };
  }
};

// ==================== SYNC TRACKING ====================

export const updateLastSyncTime = async (uid, type) => {
  try {
    const key = `${KEYS.LAST_SYNC(uid)}_${type}`;
    await AsyncStorage.setItem(key, new Date().toISOString());
    return { success: true };
  } catch (error) {
    console.error('Error updating last sync time:', error);
    return { success: false };
  }
};

export const getLastSyncTime = async (uid, type) => {
  try {
    const key = `${KEYS.LAST_SYNC(uid)}_${type}`;
    const time = await AsyncStorage.getItem(key);
    return time;
  } catch (error) {
    console.error('Error getting last sync time:', error);
    return null;
  }
};

// ==================== FULL DETAILS CACHING (PREMIUM OFFLINE FEATURE) ====================

const FULL_DETAILS_PREFIX = 'full_details_';
const CACHE_EXPIRY_DAYS = 30;

/**
 * Cache full species details for offline access (Premium feature)
 * @param {string} uid - User ID
 * @param {string} itemId - Species identifier (taxonId or scientificName)
 * @param {Object} detailsData - Full species details object
 */
export const cacheFullDetails = async (uid, itemId, detailsData) => {
  try {
    const key = `${FULL_DETAILS_PREFIX}${uid}_${itemId}`;
    const cacheData = {
      data: detailsData,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    console.log('✅ Cached full details:', itemId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error caching full details:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get cached full species details
 * @param {string} uid - User ID
 * @param {string} itemId - Species identifier
 * @returns {Object|null} Cached data or null if not found/expired
 */
export const getCachedFullDetails = async (uid, itemId) => {
  try {
    const key = `${FULL_DETAILS_PREFIX}${uid}_${itemId}`;
    const cached = await AsyncStorage.getItem(key);
    
    if (!cached) {
      console.log('⚠️ No cached details found for:', itemId);
      return null;
    }
    
    const { data, cachedAt } = JSON.parse(cached);
    
    // Check if cache is expired (30 days)
    const daysSinceCached = (Date.now() - cachedAt) / (1000 * 60 * 60 * 24);
    if (daysSinceCached > CACHE_EXPIRY_DAYS) {
      console.log('⚠️ Cached details expired for:', itemId);
      await AsyncStorage.removeItem(key);
      return null;
    }
    
    console.log('✅ Retrieved cached details:', itemId);
    return data;
  } catch (error) {
    console.error('❌ Error retrieving cached details:', error);
    return null;
  }
};

/**
 * Check if full details are cached
 * @param {string} uid - User ID
 * @param {string} itemId - Species identifier
 * @returns {Promise<boolean>}
 */
export const hasCachedFullDetails = async (uid, itemId) => {
  const cached = await getCachedFullDetails(uid, itemId);
  return cached !== null;
};

/**
 * Clear all cached full details for a user (useful for logout)
 * @param {string} uid - User ID
 */
export const clearAllCachedDetails = async (uid) => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const userCacheKeys = allKeys.filter(key => 
      key.startsWith(`${FULL_DETAILS_PREFIX}${uid}_`)
    );
    await AsyncStorage.multiRemove(userCacheKeys);
    console.log(`✅ Cleared ${userCacheKeys.length} cached details`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error clearing cached details:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all cached item IDs for a user (for cache management UI)
 * @param {string} uid - User ID
 * @returns {Promise<Array<string>>} Array of cached item IDs
 */
export const getAllCachedItemIds = async (uid) => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const userCacheKeys = allKeys.filter(key => 
      key.startsWith(`${FULL_DETAILS_PREFIX}${uid}_`)
    );
    return userCacheKeys.map(key => key.replace(`${FULL_DETAILS_PREFIX}${uid}_`, ''));
  } catch (error) {
    console.error('❌ Error getting cached item IDs:', error);
    return [];
  }
};

/**
 * Remove specific cached details for a user
 * @param {string} uid - User ID
 * @param {string} itemId - Species identifier
 */
export const removeCachedDetails = async (uid, itemId) => {
  try {
    const key = `${FULL_DETAILS_PREFIX}${uid}_${itemId}`;
    await AsyncStorage.removeItem(key);
    console.log('✅ Removed cached details for:', itemId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error removing cached details:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get cache info including size and expiration status for a specific item
 * @param {string} uid - User ID
 * @param {string} itemId - Species identifier
 * @returns {Promise<Object|null>} Cache info or null
 */
export const getCacheInfo = async (uid, itemId) => {
  try {
    const key = `${FULL_DETAILS_PREFIX}${uid}_${itemId}`;
    const cached = await AsyncStorage.getItem(key);
    
    if (!cached) return null;
    
    const { cachedAt } = JSON.parse(cached);
    const daysSinceCached = (Date.now() - cachedAt) / (1000 * 60 * 60 * 24);
    const expiresInDays = CACHE_EXPIRY_DAYS - daysSinceCached;
    
    return {
      cachedAt: new Date(cachedAt),
      expiresInDays: Math.max(0, expiresInDays).toFixed(1),
      isExpired: expiresInDays <= 0,
    };
  } catch (error) {
    console.error('❌ Error getting cache info:', error);
    return null;
  }
};