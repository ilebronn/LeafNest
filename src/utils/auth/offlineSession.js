import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_SESSION_KEY = '@offline_session_v1';

export const saveOfflineSession = async ({ uid, email, displayName, isVerified }) => {
  if (!uid || !isVerified) return false;
  try {
    const payload = {
      uid,
      email: email || null,
      displayName: displayName || null,
      isVerified: true,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    console.warn('Error saving offline session:', error);
    return false;
  }
};

export const loadOfflineSession = async () => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.uid || parsed?.isVerified !== true) return null;
    return parsed;
  } catch (error) {
    console.warn('Error loading offline session:', error);
    return null;
  }
};

export const clearOfflineSession = async () => {
  try {
    await AsyncStorage.removeItem(OFFLINE_SESSION_KEY);
    return true;
  } catch (error) {
    console.warn('Error clearing offline session:', error);
    return false;
  }
};

export const OFFLINE_SESSION_STORAGE_KEY = OFFLINE_SESSION_KEY;
