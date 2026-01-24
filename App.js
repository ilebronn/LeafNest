import * as React from 'react';
import { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, StatusBar, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@config/firebase';
import * as NavigationBar from 'expo-navigation-bar';
import { CameraCaptureScreen } from '@screens/Main';
import { LogBox } from 'react-native';
import { BlurView } from 'expo-blur';

// Add all ignored warnings HERE - before any other code
LogBox.ignoreLogs([
  'auth/invalid-credential',
  'expo-notifications: Android Push notifications',
  'expo-notifications functionality is not fully supported',
  'Push notifications only work on physical devices',
  'reading dataString is deprecated',  // Add this
  'shouldShowAlert is deprecated',     // Add this
]);
// Import i18n configuration
import './src/i18n';

// Import contexts
import { LanguageProvider } from '@contexts';
import { NotificationProvider } from '@contexts/NotificationContext';

// Import notification handler
import { useNotificationHandler } from '@services/notifications/notificationHandler';

// Import linking configuration
import linking from '@navigation/linking';

// Import Custom Splash Screen
import SplashScreen from '@screens/SplashScreen';

// Import Tour Manager
import TourManager from '@components/common/TourManager';
import { tourStorage } from '@utils/tour/tourStorage';

// Import Screens
import { LoginScreen } from '@screens/Auth';
import { SignInScreen } from '@screens/Auth';
import { SignUpScreen } from '@screens/Auth';
import { ForgotPasswordScreen } from '@screens/Auth';
import { HomeScreen } from '@screens/Main';
import { SettingsScreen } from '@screens/User';
import { HistoryScreen } from '@screens/User';
import { NotificationScreen } from '@screens/User';
import { ManageNotificationsScreen } from '@screens/User';
import { ProfileScreen } from '@screens/User';
import { AboutScreen } from '@screens/Info';
import { PrivacyPolicyScreen } from '@screens/Info';
import { FavoritesScreen } from '@screens/Main';
import { ScanScreen } from '@screens/Main';
import { ScanStatsScreen } from '@screens/Stats';
import { TermsOfUseScreen } from '@screens/Info';
import { CookiesPolicyScreen } from '@screens/Info';
import { FAQScreen } from '@screens/Info';
import { SendFeedbackScreen } from '@screens/Info';
import { HelpScreen } from '@screens/Info';
import { PlanScreen } from '@screens/Plant';
import { ManualPaymentScreen } from '@screens/Payment';
import { SpeciesLandingPage } from '@screens/Plant';
import { SpeciesGalleryScreen } from '@screens/Plant';
import { PostDetailScreen } from '@screens/Plant';

// 🆕 Import Verification Screen
import VerificationScreen from '@screens/Auth/VerificationScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ route }) {
  const { guest, displayName } = route?.params || { guest: true, displayName: 'Guest' };
  const { t } = useTranslation();

  // Tour Manager State
  const [showTour, setShowTour] = useState(false);
  const [tourChecked, setTourChecked] = useState(false);

  // Refs for tour targets
  const homeTabRef = useRef(null);
  const favoritesTabRef = useRef(null);
  const historyTabRef = useRef(null);
  const profileTabRef = useRef(null);
  const scanButtonRef = useRef(null);
  const notificationButtonRef = useRef(null); // ✅ ADD THIS

  // Check if user has seen tour on mount
  useEffect(() => {
    const checkTourStatus = async () => {
      const hasCompleted = await tourStorage.hasCompletedTour();
      if (!hasCompleted && !guest) {
        // Only show tour for authenticated users
        setShowTour(true);
      }
      setTourChecked(true);
    };

    checkTourStatus();
  }, [guest]);

  // Handle tour completion
  const handleTourComplete = async () => {
    await tourStorage.markTourCompleted();
    setShowTour(false);
  };

  // Create target refs object for TourManager
  const targetRefs = {
    'home-tab': homeTabRef,
    'favorites-tab': favoritesTabRef,
    'history-tab': historyTabRef,
    'profile-tab': profileTabRef,
    'scan-button': scanButtonRef,
    'notification-button': notificationButtonRef,
  };

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            height: 70,
            borderRadius: 25,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderTopWidth: 0,
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.2)',
            paddingBottom: 10,
            paddingTop: 10,
            shadowColor: '#000',
            shadowOpacity: 0.25,
            shadowRadius: 25,
            shadowOffset: { width: 0, height: 15 },
            elevation: 15,
            overflow: 'hidden',
          },
          tabBarBackground: () => (
            <BlurView
              intensity={100}
              tint="light"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 25,
                overflow: 'hidden',
                backgroundColor: 'rgba(255, 255, 255, 0.4)',
              }}
            />
          ),
          tabBarIcon: ({ focused }) => {
            const iconSize = 30;
            let name = 'home-outline';
            let ref = null;

            if (route.name === 'Home') {
              name = 'home-outline';
              ref = homeTabRef;
            }
            if (route.name === 'Favorites') {
              name = 'heart-outline';
              ref = favoritesTabRef;
            }
            if (route.name === 'History') {
              name = 'time-outline';
              ref = historyTabRef;
            }
            if (route.name === 'Profile') {
              name = 'person-circle-outline';
              ref = profileTabRef;
            }

            return (
              <View
                ref={ref} // Attach ref for tour highlighting
                collapsable={false} // Important for Android
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 50,
                  height: 50,
                  borderRadius: 20,
                  backgroundColor: focused ? 'rgba(94, 147, 108, 0.3)' : 'transparent',
                }}
              >
                <Ionicons
                  name={name}
                  size={iconSize}
                  color={focused ? '#000000' : '#000000'}
                  style={focused ? { transform: [{ scale: 1.1 }] } : null}
                />
              </View>
            );
          },
          tabBarActiveTintColor: '#5E936C',
          tabBarInactiveTintColor: '#666',
          tabBarLabelStyle: { display: 'none' },
          tabBarItemStyle: {
            paddingVertical: 5,
          },
        })}
      >
        <Tab.Screen name="Home" options={{ tabBarLabel: "" }}>
          {props => (
            <HomeScreen
              {...props}
              route={{ ...props.route, params: { guest, displayName, scanButtonRef, notificationButtonRef  } }}
            />
          )}
        </Tab.Screen>
        <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ tabBarLabel: "" }} />
        <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarLabel: "" }} />
        <Tab.Screen name="Profile" options={{ tabBarLabel: "" }}>
          {props => (
            <ProfileScreen
              {...props}
              route={{ ...props.route, params: { guest, displayName } }}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>

      {/* Tour Manager Overlay */}
      {tourChecked && (
        <TourManager
          visible={showTour}
          onComplete={handleTourComplete}
          targetRefs={targetRefs}
        />
      )}
    </>
  );
}

function AppContent() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  // Initialize notification handler
  useNotificationHandler();

  useEffect(() => {
    // Configure navigation bar for Android
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (showCustomSplash) {
    return <SplashScreen onFinish={() => setShowCustomSplash(false)} />;
  }

  if (initializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#bff6dc' }}>
        <ActivityIndicator size="large" color="#5E936C" />
      </View>
    );
  }

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <React.Fragment>
            <Stack.Screen 
              name="MainTabs" 
              component={MainTabs}
              initialParams={{
                guest: false,
                displayName: user.displayName || user.email
              }}
            />
            <Stack.Screen name="Login" component={LoginScreen} />
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
          </React.Fragment>
        )}
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        
        {/* 🆕 Add Verification Screen */}
        <Stack.Screen 
          name="VerificationScreen" 
          component={VerificationScreen}
          options={{ 
            headerShown: false,
            gestureEnabled: false, // Prevent swipe back
          }}
        />
        
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
        <Stack.Screen name="ManageNotifications" component={ManageNotificationsScreen} />
        <Stack.Screen 
          name="PostDetailScreen" 
          component={PostDetailScreen}
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="CameraCaptureScreen"
          component={CameraCaptureScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="ScanScreen"
          component={CameraCaptureScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen 
          name="ScanStats" 
          component={ScanStatsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="PlanScreen" component={PlanScreen} />
        <Stack.Screen 
          name="ManualPayment" 
          component={ManualPaymentScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="SpeciesLandingPage" component={SpeciesLandingPage} />
        <Stack.Screen
          name="SpeciesGalleryScreen"
          component={SpeciesGalleryScreen}
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen name="AboutScreen" component={AboutScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
        <Stack.Screen name="CookiesPolicy" component={CookiesPolicyScreen} />
        <Stack.Screen name="FAQScreen" component={FAQScreen} />
        <Stack.Screen name="SendFeedbackScreen" component={SendFeedbackScreen} />
        <Stack.Screen name="HelpScreen" component={HelpScreen} />
      </Stack.Navigator>
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <NotificationProvider>
        <NavigationContainer linking={linking}>
          <AppContent />
        </NavigationContainer>
      </NotificationProvider>
    </LanguageProvider>
  );
}