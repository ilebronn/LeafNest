// notificationHandler.js - Handle incoming push notifications
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Platform } from 'react-native';

/**
 * Configure how notifications are displayed
 * This runs when app receives a notification
 */
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    console.log('📬 Notification received:', notification);
    
    return {
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

/**
 * Configure notification channel for Android
 */
export const setupNotificationChannel = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5E936C',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    await Notifications.setNotificationChannelAsync('likes', {
      name: 'Likes & Interactions',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF3B30',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('achievements', {
      name: 'Achievements',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFD700',
      sound: 'default',
    });

    console.log('✅ Android notification channels configured');
  }
};

/**
 * Hook to handle notification events
 */
export const useNotificationHandler = () => {
  const navigation = useNavigation();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Setup notification channels
    setupNotificationChannel();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('📬 Notification received (foreground):', notification);
        const data = notification.request.content.data;
        console.log('Notification data:', data);
      }
    );

    // Listen for user tapping on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('👆 Notification tapped:', response);
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data, navigation);
      }
    );

    // ✅ FIXED: Cleanup listeners on unmount
    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove(); // ✅ CHANGED FROM removeNotificationSubscription
      }
      if (responseListener.current) {
        responseListener.current.remove(); // ✅ CHANGED FROM removeNotificationSubscription
      }
    };
  }, [navigation]);
};

/**
 * Handle navigation based on notification type
 */
const handleNotificationNavigation = (data, navigation) => {
  try {
    console.log('📱 Navigating based on notification data:', data);

    // Navigate to post detail if postId exists
    if (data.postId) {
      navigation.navigate('PostDetailScreen', { postId: data.postId });
      return;
    }

    // Navigate based on notification type
    switch (data.type) {
      case 'like':
      case 'comment':
      case 'download':
        if (data.postId) {
          navigation.navigate('PostDetailScreen', { postId: data.postId });
        } else {
          navigation.navigate('NotificationScreen');
        }
        break;

      case 'achievement':
        navigation.navigate('ScanStats');
        break;

      case 'weekly_report':
        navigation.navigate('ScanStats');
        break;

      case 'tip':
        navigation.navigate('NotificationScreen');
        break;

      case 'system':
        navigation.navigate('NotificationScreen');
        break;

      case 'follow':
        if (data.userId) {
          navigation.navigate('Profile', { userId: data.userId });
        } else {
          navigation.navigate('NotificationScreen');
        }
        break;

      default:
        navigation.navigate('NotificationScreen');
        break;
    }
  } catch (error) {
    console.error('❌ Error navigating from notification:', error);
    navigation.navigate('NotificationScreen');
  }
};

/**
 * Schedule a local notification (for testing or offline notifications)
 */
export const scheduleLocalNotification = async (title, body, data = {}, seconds = 1) => {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
        data: data,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
      },
      trigger: {
        seconds: seconds,
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