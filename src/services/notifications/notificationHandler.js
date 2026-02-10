// notificationHandler.js - Handle incoming push notifications
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

/**
 * Configure how notifications are displayed
 * This runs when app receives a notification
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📬 Notification received:', notification);
    
    return {
      // Expo SDK 54 prefers banner/list flags; keep alert for compatibility
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    };
  },
});

/**
 * Configure notification channel for Android
 * ✅ CRITICAL: This must be called BEFORE any notifications are received
 */
export const setupNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    try {
      // Default channel - HIGH priority for banners
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.MAX, // ✅ MAX for heads-up
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#5E936C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        enableLights: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC, // ✅ Show on lockscreen
      });

      // Likes & Interactions channel
      await Notifications.setNotificationChannelAsync('likes', {
        name: 'Likes & Interactions',
        importance: Notifications.AndroidImportance.HIGH, // ✅ HIGH for banner
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF3B30',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        enableLights: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // Achievements channel - MAX priority for celebrations
      await Notifications.setNotificationChannelAsync('achievements', {
        name: 'Achievements',
        importance: Notifications.AndroidImportance.MAX, // ✅ MAX for heads-up
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFD700',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        enableLights: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // Comments channel
      await Notifications.setNotificationChannelAsync('comments', {
        name: 'Comments',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007AFF',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        enableLights: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      console.log('✅ Android notification channels configured with MAX priority');
    } catch (error) {
      console.error('❌ Error setting up notification channels:', error);
    }
  }
};

/**
 * Hook to handle notification events
 */
export const useNotificationHandler = () => {
  const notificationListener = useRef();

  useEffect(() => {
    // ✅ Setup notification channels IMMEDIATELY
    setupNotificationChannel();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📬 Notification received (foreground):', notification);
        const data = notification.request.content.data;
        console.log('Notification data:', data);
      }
    );

    // Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
    };
  }, []);
};

/**
 * Schedule a local notification (for testing or offline notifications)
 * ✅ FIXED: Added proper Android channel and priority
 */
export const scheduleLocalNotification = async (title, body, data = {}, seconds = 1) => {
  try {
    const channelId = getChannelId(data.type);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: data,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX, // ✅ MAX priority
        vibrate: [0, 250, 250, 250],
        categoryIdentifier: channelId, // ✅ Use proper channel
      },
      trigger: {
        seconds: seconds,
        channelId: channelId, // ✅ Specify channel for Android
      },
    });

    console.log('✅ Local notification scheduled:', notificationId);
    return { success: true, notificationId };
  } catch (error) {
    console.error('❌ Error scheduling local notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get notification channel ID based on type
 */
const getChannelId = (type) => {
  const channels = {
    like: 'likes',
    comment: 'comments',
    download: 'likes',
    achievement: 'achievements',
    weekly_report: 'default',
    tip: 'default',
    system: 'default',
  };

  return channels[type] || 'default';
};

/**
 * Cancel all scheduled notifications
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('✅ All scheduled notifications cancelled');
    return { success: true };
  } catch (error) {
    console.error('❌ Error cancelling notifications:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get badge count
 */
export const getBadgeCount = async () => {
  try {
    const count = await Notifications.getBadgeCountAsync();
    return { success: true, count };
  } catch (error) {
    console.error('❌ Error getting badge count:', error);
    return { success: false, count: 0 };
  }
};

/**
 * Set badge count
 */
export const setBadgeCount = async (count) => {
  try {
    await Notifications.setBadgeCountAsync(count);
    console.log(`✅ Badge count set to: ${count}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error setting badge count:', error);
    return { success: false, error: error.message };
  }
};

export default {
  useNotificationHandler,
  setupNotificationChannel,
  scheduleLocalNotification,
  cancelAllNotifications,
  getBadgeCount,
  setBadgeCount,
};
