import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@config/firebase';

const USERNAME_KEY = '@username';
const OFFLINE_SESSION_KEY = '@offline_session_v1';
const VERIFICATION_STATUS_PREFIX = '@verification_status_';

export const getCurrentUsername = async () => {
  try {
    // First, try to get from Firebase Auth
    const user = auth.currentUser;
    if (user && user.displayName) {
      // Cache it in AsyncStorage for offline access
      await AsyncStorage.setItem(USERNAME_KEY, user.displayName);
      return user.displayName;
    }
    
    // Fallback to AsyncStorage if Firebase doesn't have it
    const cachedUsername = await AsyncStorage.getItem(USERNAME_KEY);
    if (cachedUsername) {
      return cachedUsername;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting username:', error);
    return null;
  }
};

export const setUsername = async (username) => {
  try {
    await AsyncStorage.setItem(USERNAME_KEY, username);
  } catch (error) {
    console.error('Error setting username:', error);
  }
};

export const clearUsername = async () => {
  try {
    await AsyncStorage.removeItem(USERNAME_KEY);
  } catch (error) {
    console.error('Error clearing username:', error);
  }
};

export const validateUsername = (username) => {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (username.trim().length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (username.trim().length > 20) {
    return { isValid: false, error: 'Username must be 20 characters or less' };
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  return { isValid: true, error: null };
};

export const updateUsernameInFirebase = async (newUsername) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await user.updateProfile({ displayName: newUsername });
      await setUsername(newUsername);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating username in Firebase:', error);
    return false;
  }
};

// ✅ Migration helper - Enhanced to handle user switching scenarios
export const migrateLegacyFavoritesIfNeeded = async (uid) => {
  if (!uid) return;
  const MIGRATION_FLAG = `favorites_migrated_${uid}`;
  try {
    const already = await AsyncStorage.getItem(MIGRATION_FLAG);
    if (already) return;

    // Check for legacy favorites and migrate if found
    const legacyRaw = await AsyncStorage.getItem('favorites');
    if (!legacyRaw) {
      await AsyncStorage.setItem(MIGRATION_FLAG, '1');
      return;
    }

    const legacy = JSON.parse(legacyRaw) || [];
    const userKey = getFavoritesKey(uid);
    const userRaw = await AsyncStorage.getItem(userKey);
    const userList = userRaw ? JSON.parse(userRaw) : [];

    // Merge without duplicates
    const map = new Map(userList.map(x => [`${x.type}:${x.name}`, x]));
    for (const x of legacy) {
      const k = `${x.type}:${x.name}`;
      if (!map.has(k)) map.set(k, x);
    }
    const merged = Array.from(map.values());
    await AsyncStorage.setItem(userKey, JSON.stringify(merged));

    await AsyncStorage.setItem(MIGRATION_FLAG, '1');
    await AsyncStorage.removeItem('favorites'); // cleanup
  } catch (e) {
    console.warn('favorites migration failed:', e);
  }
};

/**
 * ✅ FIXED: Clear user data but PRESERVE device lock and favorites
 * This is called on login/logout to clean up user-specific data
 * 
 * CRITICAL: Never clear these keys:
 * - @guest_scan_used_PERMANENT_DEVICE (device lock)
 * - @guest_first_scan_timestamp_PERMANENT_DEVICE (when device was locked)
 * - favorites_user_* (user favorites)
 */
export const clearAllUserData = async () => {
  try {
    // Clear username from AsyncStorage
    await clearUsername();
    
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    
    // ✅ CRITICAL: Filter out keys to clear, but PRESERVE:
    // 1. Guest scan device lock (PERMANENT)
    // 2. User favorites
    const userKeys = keys.filter(key => {
      // ✅ NEVER clear guest scan keys - these are PERMANENT device locks
      if (key === '@guest_scan_used_PERMANENT_DEVICE') return false;
      if (key === '@guest_first_scan_timestamp_PERMANENT_DEVICE') return false;
      
      // ✅ Preserve user favorites
      if (key.startsWith('favorites_user_')) return false;
      
      // ✅ Clear offline session + verification cache
      if (key === OFFLINE_SESSION_KEY) return true;
      if (key.startsWith(VERIFICATION_STATUS_PREFIX)) return true;
      
      // Clear everything else that looks like user data
      return (
        key.includes('user') || 
        key.includes('profile') || 
        key.includes('username') ||
        key.includes('@username')
      );
    });
    
    if (userKeys.length > 0) {
      await AsyncStorage.multiRemove(userKeys);
      console.log('✅ User data cleared, device lock preserved');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error clearing user data:', error);
    return false;
  }
};

// Helper function for getting favorites key
export const getFavoritesKey = (uid) => (uid ? `favorites_user_${uid}` : 'favorites_guest');
