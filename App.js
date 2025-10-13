import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { Ionicons } from '@expo/vector-icons';
import './i18n';

// Import your screens
import LoginScreen from './screens/LoginScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import ScanScreen from './screens/ScanScreen';
import HistoryScreen from './screens/HistoryScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import NotificationScreen from './screens/NotificationScreen';
import TermsOfUseScreen from './screens/TermsOfUseScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import CookiesPolicyScreen from './screens/CookiesPolicyScreen';
import SettingsScreen from './screens/SettingsScreen';
import HelpScreen from './screens/HelpScreen';
import AboutScreen from './screens/AboutScreen';
import FAQScreen from './screens/FAQScreen';
import SendFeedbackScreen from './screens/SendFeedbackScreen';
import PlanScreen from './screens/PlanScreen';
import SpeciesLandingPage from './screens/SpeciesLandingPage';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom Tab Navigator
function MainTabs({ route }) {
  const isGuest = route?.params?.guest ?? true;
  const displayName = route?.params?.displayName ?? '';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#5E936C',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#eee',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'heart' : 'heart-outline';
          } else if (route.name === 'Plan') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        initialParams={{ guest: isGuest, displayName }}
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen}
        initialParams={{ guest: isGuest }}
      />
      <Tab.Screen 
        name="Favorites" 
        component={FavoritesScreen}
        initialParams={{ guest: isGuest }}
      />
      <Tab.Screen 
        name="Plan" 
        component={PlanScreen}
        initialParams={{ guest: isGuest }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // ✅ Listen to authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        console.log('✅ User is authenticated:', currentUser.email);
        setUser(currentUser);
      } else {
        console.log('❌ No user authenticated');
        setUser(null);
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5E936C" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={user ? 'MainTabs' : 'Login'}
      >
        {/* Auth Screens - Only show when user is NOT authenticated */}
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        ) : null}

        {/* Main App Screens */}
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabs}
          initialParams={{
            guest: !user,
            displayName: user?.displayName || user?.email || 'User'
          }}
        />
        
        {/* Other Screens */}
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ScanScreen" component={ScanScreen} />
        <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Help" component={HelpScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="FAQ" component={FAQScreen} />
        <Stack.Screen name="SendFeedback" component={SendFeedbackScreen} />
        <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="CookiesPolicy" component={CookiesPolicyScreen} />
        <Stack.Screen name="SpeciesLandingPage" component={SpeciesLandingPage} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});