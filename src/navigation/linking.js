// linking.js - Deep linking configuration for notifications
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';

export const linking = {
  prefixes: ['leafnest://', 'https://leafnest.app'],
  config: {
    screens: {
      // Main navigation
      MainTabs: {
        path: '',
        screens: {
          Home: 'home',
          Favorites: 'favorites',
          History: 'history',
          Profile: 'profile',
        },
      },
      
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
      
      // Auth
      SignIn: 'signin',
      SignUp: 'signup',
      ForgotPassword: 'forgot-password',
      
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
      // Check if app was opened by a deep link
      const url = await Linking.getInitialURL();
      
      if (url != null) {
        return url;
      }
      
      // Check if app was opened by a notification
      const response = await Notifications.getLastNotificationResponseAsync();
      
      if (response?.notification) {
        const data = response.notification.request.content.data;
        
        // Build URL based on notification data
        if (data.postId) {
          return `leafnest://post/${data.postId}`;
        }
        
        if (data.type === 'achievement' || data.type === 'weekly_report') {
          return 'leafnest://stats';
        }
        
        return 'leafnest://notifications';
      }
      
      return null;
    } catch (error) {
      console.error('Error getting initial URL:', error);
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
        listener(url);
      });
      
      // Listen to notifications
      const notificationSubscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
          const data = response.notification.request.content.data;
          
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
      console.error('Error subscribing to linking:', error);
      return () => {};
    }
  },
};

export default linking;