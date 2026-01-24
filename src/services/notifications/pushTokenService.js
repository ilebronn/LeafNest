// pushTokenService.js - Register device for push notifications
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@config/firebase';

/**
 * Register device for push notifications and store token
 */
export const registerForPushNotifications = async () => {
  try {
    // Check if running on physical device
    if (!Device.isDevice) {
      console.warn('⚠️ Push notifications only work on physical devices');
      return { success: false, error: 'Not a physical device' };
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Push notification permission denied');
      return { success: false, error: 'Permission denied' };
    }

    console.log('✅ Permission granted for push notifications');

    // Get push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.error('❌ EAS project ID not found');
      return { success: false, error: 'Missing EAS project ID' };
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    const pushToken = tokenData.data;
    console.log('✅ Push token obtained:', pushToken);

    // Save to Firestore
    const currentUser = auth.currentUser;
    if (currentUser) {
      await savePushToken(currentUser.uid, pushToken);
    }

    return { success: true, token: pushToken };
  } catch (error) {
    console.error('❌ Error registering for push notifications:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save push token to Firestore
 */
export const savePushToken = async (userId, pushToken) => {
  try {
    if (!userId || !pushToken) {
      return { success: false, error: 'Missing userId or pushToken' };
    }

    const tokenRef = doc(db, 'users', userId, 'settings', 'pushToken');
    
    await setDoc(tokenRef, {
      token: pushToken,
      platform: Platform.OS,
      deviceName: Device.deviceName || 'Unknown Device',
      deviceModel: Device.modelName || 'Unknown Model',
      updatedAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    }, { merge: true });

    console.log('✅ Push token saved to Firestore');
    return { success: true };
  } catch (error) {
    console.error('❌ Error saving push token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's push token from Firestore
 */
export const getUserPushToken = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'Missing userId' };
    }

    const tokenRef = doc(db, 'users', userId, 'settings', 'pushToken');
    const tokenDoc = await getDoc(tokenRef);

    if (tokenDoc.exists()) {
      return { success: true, token: tokenDoc.data().token };
    }

    return { success: false, error: 'No token found' };
  } catch (error) {
    console.error('❌ Error getting push token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove push token from Firestore (when user logs out)
 */
export const removePushToken = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'Missing userId' };
    }

    const tokenRef = doc(db, 'users', userId, 'settings', 'pushToken');
    await deleteDoc(tokenRef);

    console.log('✅ Push token removed from Firestore');
    return { success: true };
  } catch (error) {
    console.error('❌ Error removing push token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update token's last active timestamp
 */
export const updateTokenActivity = async (userId) => {
  try {
    if (!userId) return;

    const tokenRef = doc(db, 'users', userId, 'settings', 'pushToken');
    const tokenDoc = await getDoc(tokenRef);

    if (tokenDoc.exists()) {
      await setDoc(tokenRef, {
        lastActive: new Date().toISOString(),
      }, { merge: true });
    }
  } catch (error) {
    console.error('❌ Error updating token activity:', error);
  }
};

export default {
  registerForPushNotifications,
  savePushToken,
  getUserPushToken,
  removePushToken,
  updateTokenActivity,
};