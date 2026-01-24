// permissionHandler.js - Handle notification permissions
import * as Notifications from 'expo-notifications';
import { Platform, Alert, Linking } from 'react-native';

/**
 * Request notification permissions
 */
export const requestNotificationPermissions = async () => {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    let finalStatus = existingStatus;
    
    // If permission not granted, request it
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      Alert.alert(
        'Notifications Disabled',
        'Enable notifications in your device settings to receive updates about likes, comments, achievements, and weekly reports.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
      return false;
    }
    
    console.log('✅ Notification permissions granted');
    return true;
  } catch (error) {
    console.error('❌ Error requesting permissions:', error);
    return false;
  }
};

/**
 * Check if notifications are enabled
 */
export const checkNotificationPermissions = async () => {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('❌ Error checking permissions:', error);
    return false;
  }
};

/**
 * Get detailed permission status
 */
export const getNotificationPermissionStatus = async () => {
  try {
    const settings = await Notifications.getPermissionsAsync();
    
    return {
      granted: settings.status === 'granted',
      canAskAgain: settings.canAskAgain,
      ios: {
        allowsAlert: settings.ios?.allowsAlert,
        allowsBadge: settings.ios?.allowsBadge,
        allowsSound: settings.ios?.allowsSound,
        allowsCriticalAlerts: settings.ios?.allowsCriticalAlerts,
      },
      android: {
        importance: settings.android?.importance,
      },
    };
  } catch (error) {
    console.error('❌ Error getting permission status:', error);
    return null;
  }
};

/**
 * Show permission request dialog with explanation
 */
export const showPermissionRequestDialog = (onAccept, onDecline) => {
  Alert.alert(
    '🔔 Enable Notifications',
    'Stay updated with:\n\n' +
    '• Likes and comments on your posts\n' +
    '• Achievement unlocks\n' +
    '• Weekly scanning reports\n' +
    '• Daily tips and tricks\n\n' +
    'You can change this later in settings.',
    [
      {
        text: 'Not Now',
        style: 'cancel',
        onPress: onDecline,
      },
      {
        text: 'Enable',
        onPress: async () => {
          const granted = await requestNotificationPermissions();
          if (granted && onAccept) {
            onAccept();
          } else if (!granted && onDecline) {
            onDecline();
          }
        },
      },
    ]
  );
};

/**
 * Prompt user to enable notifications if disabled
 */
export const promptEnableNotifications = () => {
  Alert.alert(
    'Enable Notifications?',
    'Get notified about interactions, achievements, and weekly reports.',
    [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Enable',
        onPress: async () => {
          const granted = await requestNotificationPermissions();
          if (granted) {
            Alert.alert('Success', 'Notifications enabled!');
          }
        },
      },
    ]
  );
};

/**
 * Check and request permissions if needed
 */
export const ensureNotificationPermissions = async () => {
  const hasPermission = await checkNotificationPermissions();
  
  if (!hasPermission) {
    return await requestNotificationPermissions();
  }
  
  return true;
};

export default {
  requestNotificationPermissions,
  checkNotificationPermissions,
  getNotificationPermissionStatus,
  showPermissionRequestDialog,
  promptEnableNotifications,
  ensureNotificationPermissions,
};