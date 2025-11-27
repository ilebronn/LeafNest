import * as React from 'react';
import { useEffect, useState } from 'react';
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
LogBox.ignoreLogs([
  'auth/invalid-credential'
]);
// Import i18n configuration
import './src/i18n';

// Import context
import { LanguageProvider } from '@contexts';

// Import Custom Splash Screen
import SplashScreen from '@screens/SplashScreen';

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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ route }) {
  const { guest, displayName } = route?.params || { guest: true, displayName: 'Guest' };
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          height: 65,
          borderTopWidth: 0,
          borderRadius: 20,
          paddingHorizontal: 5,
          paddingBottom: 10,
          shadowOpacity: 0.1,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: -2 },
          elevation: 5,
        },
        tabBarIcon: ({ focused }) => {
          const iconSize = 28;
          let name = 'home-outline';
          if (route.name === 'Home') name = 'home-outline';
          if (route.name === 'Favorites') name = 'heart-outline';
          if (route.name === 'History') name = 'time-outline';
          if (route.name === 'Profile') name = 'person-outline';

          return (
            <Ionicons
              name={name}
              size={iconSize}
              color={focused ? '#5E936C' : '#B0B0B0'}
              style={focused ? { transform: [{ scale: 1.2 }] } : null}
            />
          );
        },
        tabBarActiveTintColor: '#5E936C',
        tabBarInactiveTintColor: '#B0B0B0',
        tabBarLabelStyle: { display: 'none' },
      })}
    >
      <Tab.Screen name="Home" options={{ tabBarLabel: "" }}>
        {props => (
          <HomeScreen
            {...props}
            route={{ ...props.route, params: { guest, displayName } }}
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
  );
}

export default function App() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Configure navigation bar for Android
    if (Platform.OS === 'android') {
      //NavigationBar.setPositionAsync('absolute');
      NavigationBar.setVisibilityAsync('hidden');
      //NavigationBar.setBehaviorAsync('overlay-swipe');
      //NavigationBar.setBackgroundColorAsync('#00000000');
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
    <LanguageProvider>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <NavigationContainer>
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
      </NavigationContainer>
    </LanguageProvider>
  );
}