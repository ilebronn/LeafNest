// NotificationContext.js - Global notification state management
import React, { createContext, useState, useEffect, useContext } from 'react';
import { AppState } from 'react-native';
import { auth } from '@config/firebase';
import { getUnreadNotificationCount } from '@services/notifications/notificationService';
import { registerForPushNotifications, removePushToken } from '@services/notifications/pushTokenService';
import { setBadgeCount } from '@services/notifications/notificationHandler';
import { requestNotificationPermissions } from '@utils/notifications/permissionHandler';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushToken, setPushToken] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize on mount
  useEffect(() => {
    initializeNotifications();
    
    // Listen to app state changes to refresh count
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    return () => {
      subscription?.remove();
    };
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        initializeNotifications();
      } else {
        handleLogout();
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * Initialize notifications on app start
   */
  const initializeNotifications = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Request permissions
        const granted = await requestNotificationPermissions();
        setPermissionGranted(granted);

        if (granted) {
          // Register for push notifications
          const result = await registerForPushNotifications();
          if (result.success) {
            setPushToken(result.token);
            console.log('✅ Push token registered:', result.token);
          }
        }

        // Load unread count
        await loadUnreadCount(currentUser.uid);
      }
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load unread notification count
   */
  const loadUnreadCount = async (userId) => {
    try {
      const result = await getUnreadNotificationCount(userId);
      if (result.success) {
        const count = result.count || 0;
        setUnreadCount(count);
        
        // Update badge count
        await setBadgeCount(count);
      }
    } catch (error) {
      console.error('❌ Error loading unread count:', error);
    }
  };

  /**
   * Refresh unread count
   */
  const refreshUnreadCount = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await loadUnreadCount(currentUser.uid);
    }
  };

  /**
   * Increment unread count (when new notification arrives)
   */
  const incrementUnreadCount = async () => {
    const newCount = unreadCount + 1;
    setUnreadCount(newCount);
    await setBadgeCount(newCount);
  };

  /**
   * Decrement unread count (when notification is read)
   */
  const decrementUnreadCount = async () => {
    const newCount = Math.max(0, unreadCount - 1);
    setUnreadCount(newCount);
    await setBadgeCount(newCount);
  };

  /**
   * Reset unread count to zero
   */
  const resetUnreadCount = async () => {
    setUnreadCount(0);
    await setBadgeCount(0);
  };

  /**
   * Handle app state changes
   */
  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active') {
      // Refresh when app comes to foreground
      refreshUnreadCount();
    }
  };

  /**
   * Handle user logout
   */
  const handleLogout = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser && pushToken) {
        await removePushToken(currentUser.uid);
      }
      
      setUnreadCount(0);
      setPushToken(null);
      setPermissionGranted(false);
      await setBadgeCount(0);
    } catch (error) {
      console.error('❌ Error during logout cleanup:', error);
    }
  };

  /**
   * Re-register for push notifications (e.g., after permission change)
   */
  const reRegisterPushNotifications = async () => {
    const result = await registerForPushNotifications();
    if (result.success) {
      setPushToken(result.token);
      setPermissionGranted(true);
      return true;
    }
    return false;
  };

  const value = {
    // State
    unreadCount,
    pushToken,
    permissionGranted,
    loading,
    
    // Actions
    refreshUnreadCount,
    incrementUnreadCount,
    decrementUnreadCount,
    resetUnreadCount,
    reRegisterPushNotifications,
    initializeNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook to use notification context
 */
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  
  return context;
};

export default NotificationContext;