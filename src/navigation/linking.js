// linking.js - Deep linking configuration for notifications
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';

export const linking = {
  prefixes: ['leafnest://', 'https://leafnest.app'],
  config: {
    screens: {
      // ✅ FIX: Remove empty path from MainTabs
      // Let App.js handle initial navigation based on auth state
      MainTabs: {
        path: 'home', // ← Changed from '' to 'home'
        screens: {
          Home: 'home',
          Favorites: 'favorites',
          History: 'history',
          Profile: 'profile',
        },
      },
      
      // Auth screens - these should be accessible without deep links
      Login: 'login',
      SignIn: 'signin',
      SignUp: 'signup',
      ForgotPassword: 'forgot-password',
      
      // Notification screens
      NotificationScreen: 'notifications',
      ManageNotifications: 'notifications/manage',
      
      // Post/Plant screens
      PostDetailScreen: {
        path: 'post/:postId',
        parse: {
          postId: (postId) => postId,
        },
      },
      
      PlanScreen: {
        path: 'plant/:plantId',
        parse: {
          plantId: (plantId) => plantId,
        },
      },
      
      SpeciesGalleryScreen: {
        path: 'species/:speciesId/gallery',
        parse: {
          speciesId: (speciesId) => speciesId,
        },
      },
      
      SpeciesLandingPage: {
        path: 'species/:speciesId',
        parse: {
          speciesId: (speciesId) => speciesId,
        },
      },
      
      // Stats screen
      ScanStats: {
        path: 'stats/:userId?',
        parse: {
          userId: (userId) => userId || null,
        },
      },
      
      // Camera/Scan
      CameraCaptureScreen: 'scan',
      ScanScreen: 'camera',
      
      // Settings
      Settings: 'settings',
      
      // Payment
      ManualPayment: 'payment/manual',
      
      // Info
      AboutScreen: 'about',
      HelpScreen: 'help',
      FAQScreen: 'faq',
      PrivacyPolicy: 'privacy',
      TermsOfUse: 'terms',
      CookiesPolicy: 'cookies',
      SendFeedbackScreen: 'feedback',
    },
  },
  
  /**
   * Handle initial URL when app is opened via deep link
   */
  async getInitialURL() {
    try {
      // ✅ FIX 1: Check if app was opened by a deep link FIRST
      const url = await Linking.getInitialURL();
      
      if (url != null) {
        console.log('🔗 App opened with deep link:', url);
        return url;
      }
      
      // ✅ FIX 2: Check if app was opened by tapping a notification
      const response = await Notifications.getLastNotificationResponseAsync();
      
      // ✅ FIX 3: Only navigate if there's actual notification data
      if (response?.notification?.request?.content?.data) {
        const data = response.notification.request.content.data;
        
        console.log('🔔 App opened from notification:', data);
        
        // Build URL based on notification data
        if (data.postId) {
          return `leafnest://post/${data.postId}`;
        }
        
        if (data.type === 'achievement' || data.type === 'weekly_report') {
          return 'leafnest://stats';
        }
        
        // Only navigate to notifications if it's a real notification tap
        if (data.type) {
          return 'leafnest://notifications';
        }
      }
      
      // ✅ FIX 4: Return null for fresh app starts
      // This lets App.js handle navigation based on auth state
      console.log('✨ Fresh app start - no deep link or notification');
      return null;
      
    } catch (error) {
      console.error('❌ Error getting initial URL:', error);
      return null;
    }
  },
  
  /**
   * Subscribe to URL changes (for when app is already open)
   */
  subscribe(listener) {
    try {
      // Listen to incoming deep links
      const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
        console.log('🔗 Deep link received while app open:', url);
        listener(url);
      });
      
      // ✅ FIX 5: Only navigate on notification tap, not on permission grant
      const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data;
          
          // ✅ Only navigate if there's actual data in the notification
          if (!data || !data.type) {
            console.log('⚠️ Notification response without data - ignoring');
            return;
          }
          
          console.log('🔔 Notification tapped:', data);
          
          let url = 'leafnest://notifications';
          
          if (data.postId) {
            url = `leafnest://post/${data.postId}`;
          } else if (data.type === 'achievement' || data.type === 'weekly_report') {
            url = 'leafnest://stats';
          }
          
          listener(url);
        }
      );
      
      return () => {
        linkingSubscription.remove();
        notificationSubscription.remove();
      };
    } catch (error) {
      console.error('❌ Error subscribing to linking:', error);
      return () => {};
    }
  },
};

export default linking;