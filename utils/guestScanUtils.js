// utils/guestScanUtils.js
// CREATE THIS NEW FILE IN YOUR utils FOLDER

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const GUEST_SCAN_COUNT_KEY = '@guest_scan_count';
const GUEST_SCAN_TIMESTAMP_KEY = '@guest_scan_timestamp';

/**
 * Check if user is a guest
 * @param {object} user - Firebase auth user object
 * @returns {boolean}
 */
export const isGuestUser = (user) => {
  if (!user) return true;
  return user.email === 'guest@leafnest.app' || user.isAnonymous;
};

/**
 * Get guest scan count
 * @returns {Promise<number>}
 */
export const getGuestScanCount = async () => {
  try {
    const count = await AsyncStorage.getItem(GUEST_SCAN_COUNT_KEY);
    return count ? parseInt(count, 10) : 0;
  } catch (error) {
    console.error('Error getting guest scan count:', error);
    return 0;
  }
};

/**
 * Increment guest scan count
 * @returns {Promise<number>} New scan count
 */
export const incrementGuestScanCount = async () => {
  try {
    const currentCount = await getGuestScanCount();
    const newCount = currentCount + 1;
    await AsyncStorage.setItem(GUEST_SCAN_COUNT_KEY, newCount.toString());
    await AsyncStorage.setItem(GUEST_SCAN_TIMESTAMP_KEY, Date.now().toString());
    console.log(`✅ Guest scan count incremented to: ${newCount}`);
    return newCount;
  } catch (error) {
    console.error('Error incrementing guest scan count:', error);
    return 0;
  }
};

/**
 * Check if guest has reached scan limit
 * @returns {Promise<boolean>}
 */
export const hasGuestReachedLimit = async () => {
  const count = await getGuestScanCount();
  return count >= 1;
};

/**
 * Get remaining scans for guest
 * @returns {Promise<number>}
 */
export const getGuestRemainingScans = async () => {
  const count = await getGuestScanCount();
  return Math.max(0, 1 - count);
};

/**
 * Reset guest scan count (called after user signs up/in)
 * @returns {Promise<void>}
 */
export const resetGuestScanCount = async () => {
  try {
    await AsyncStorage.removeItem(GUEST_SCAN_COUNT_KEY);
    await AsyncStorage.removeItem(GUEST_SCAN_TIMESTAMP_KEY);
    console.log('✅ Guest scan count reset');
  } catch (error) {
    console.error('Error resetting guest scan count:', error);
  }
};

/**
 * Get guest scan info for display
 * @returns {Promise<object>}
 */
export const getGuestScanInfo = async () => {
  const count = await getGuestScanCount();
  const remaining = await getGuestRemainingScans();
  const hasReachedLimit = count >= 1;
  
  return {
    count,
    remaining,
    limit: 1,
    hasReachedLimit,
  };
};

// ==================== OPTIONAL COMPONENT ====================
// Use this component in HomeScreen to show guest scan limit banner

export const GuestScanBanner = ({ navigation, user }) => {
  const [scanInfo, setScanInfo] = useState(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    checkGuestStatus();
  }, [user]);

  const checkGuestStatus = async () => {
    const guestStatus = isGuestUser(user);
    setIsGuest(guestStatus);
    
    if (guestStatus) {
      const info = await getGuestScanInfo();
      setScanInfo(info);
    }
  };

  if (!isGuest || !scanInfo) return null;

  return (
    <View style={bannerStyles.container}>
      <View style={bannerStyles.iconContainer}>
        <Ionicons name="scan-outline" size={24} color="#5E936C" />
      </View>
      <View style={bannerStyles.textContainer}>
        <Text style={bannerStyles.title}>
          {scanInfo.hasReachedLimit 
            ? "Free Scan Used" 
            : `${scanInfo.remaining} Free Scan Remaining`}
        </Text>
        <Text style={bannerStyles.subtitle}>
          {scanInfo.hasReachedLimit
            ? "Sign up for unlimited scans!"
            : "Sign up to unlock unlimited scans"}
        </Text>
      </View>
      <TouchableOpacity 
        style={bannerStyles.button}
        onPress={() => navigation.navigate('SignUp')}
      >
        <Text style={bannerStyles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
};

const bannerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f4',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#5E936C',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2e1b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
  button: {
    backgroundColor: '#5E936C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});