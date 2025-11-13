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