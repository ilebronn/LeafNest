import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Import i18n configuration
import './i18n';

// Import context
import { LanguageProvider } from './contexts/LanguageContext';

// Import Custom Splash Screen
import CustomSplashScreen from './screens/SplashScreen';

// Import Screens
import LoginScreen from './screens/LoginScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import ForgotPasswordScreen from './screens/ForgotPasswordScreen';
import HomeScreen from './screens/HomeScreen';
import SettingsScreen from './screens/SettingsScreen';
import HistoryScreen from './screens/HistoryScreen';
import NotificationScreen from './screens/NotificationScreen';
import ManageNotificationsScreen from './screens/ManageNotificationsScreen';
import ProfileScreen from './screens/ProfileScreen';
import AboutScreen from './screens/AboutScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import CameraCaptureScreen from './screens/ScanScreen';
import ScanStatsScreen from './screens/ScanStatsScreen';
import TermsOfUseScreen from './screens/TermsOfUseScreen';
import CookiesPolicyScreen from './screens/CookiesPolicyScreen';
import FAQScreen from './screens/FAQScreen';
import SendFeedbackScreen from './screens/SendFeedbackScreen';
import HelpScreen from './screens/HelpScreen';
import PlanScreen from './screens/PlanScreen';
import SpeciesLandingPage from './screens/SpeciesLandingPage';

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
          if (route.name === 'Settings') name = 'settings-outline';

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
      <Tab.Screen name="Settings" options={{ tabBarLabel: "" }}>
        {props => <SettingsScreen {...props} route={{ ...props.route, params: { guest } }} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setInitializing(false);
    });

    return unsubscribe;
  }, []);

  if (showCustomSplash) {
    return <CustomSplashScreen onFinish={() => setShowCustomSplash(false)} />;
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
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
          <Stack.Screen name="ManageNotifications" component={ManageNotificationsScreen} />
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
          <Stack.Screen name="SpeciesLandingPage" component={SpeciesLandingPage} />
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