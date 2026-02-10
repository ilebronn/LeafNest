// utils/guestScanUtils.js
// PERMANENT GUEST SCAN LIMIT - ONE SCAN PER DEVICE FOREVER

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ⚠️ CRITICAL: These keys store DEVICE-LEVEL permanent scan restriction
// These should NEVER be cleared on logout, only on successful signup
const GUEST_SCAN_USED_KEY = '@guest_scan_used_PERMANENT_DEVICE';
const GUEST_FIRST_SCAN_TIMESTAMP_KEY = '@guest_first_scan_timestamp_PERMANENT_DEVICE';

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
 * ⚠️ PERMANENT CHECK: Has this device EVER used a guest scan?
 * This returns true if the device has scanned even once in guest mode
 * and will remain true forever (unless user successfully signs up)
 * 
 * @returns {Promise<boolean>}
 */
export const hasGuestEverScanned = async () => {
  try {
    const scanUsed = await AsyncStorage.getItem(GUEST_SCAN_USED_KEY);
    const hasScanned = scanUsed === 'true';
    
    if (hasScanned) {
      console.log('🚫 Device has already used guest scan - PERMANENTLY BLOCKED');
    }
    
    return hasScanned;
  } catch (error) {
    console.error('Error checking permanent guest scan status:', error);
    return false;
  }
};

/**
 * ⚠️ PERMANENT LOCK: Mark this device as having used its guest scan
 * This is irreversible and blocks all future guest scans on this device
 * 
 * @returns {Promise<void>}
 */
export const markGuestScanAsUsed = async () => {
  try {
    await AsyncStorage.setItem(GUEST_SCAN_USED_KEY, 'true');
    await AsyncStorage.setItem(GUEST_FIRST_SCAN_TIMESTAMP_KEY, Date.now().toString());
    console.log('🔒 Guest scan PERMANENTLY LOCKED for this device');
  } catch (error) {
    console.error('Error marking guest scan as used:', error);
  }
};

/**
 * Check if guest has reached scan limit (ALWAYS returns true after first scan)
 * @returns {Promise<boolean>}
 */
export const hasGuestReachedLimit = async () => {
  return await hasGuestEverScanned();
};

/**
 * Get remaining scans for guest (0 if already scanned, 1 if not)
 * @returns {Promise<number>}
 */
export const getGuestRemainingScans = async () => {
  const hasScanned = await hasGuestEverScanned();
  return hasScanned ? 0 : 1;
};

/**
 * Get guest scan count (for backwards compatibility)
 * Returns 1 if scanned, 0 if not
 * @returns {Promise<number>}
 */
export const getGuestScanCount = async () => {
  const hasScanned = await hasGuestEverScanned();
  return hasScanned ? 1 : 0;
};

/**
 * ⚠️ DEPRECATED: This no longer increments - it LOCKS the device permanently
 * After calling this once, the device can NEVER scan in guest mode again
 * 
 * @returns {Promise<number>}
 */
export const incrementGuestScanCount = async () => {
  await markGuestScanAsUsed();
  return 1;
};

/**
 * ✅ FIXED: Preserve device lock state before login
 * This does NOTHING - device lock is permanent and doesn't need preservation
 * The GUEST_SCAN_USED_KEY persists automatically across login/logout
 * 
 * @returns {Promise<void>}
 */
export const preserveDeviceLockBeforeLogin = async () => {
  try {
    const isLocked = await hasGuestEverScanned();
    if (isLocked) {
      console.log('💾 Device lock already exists - no preservation needed (permanent device lock)');
    } else {
      console.log('✅ Device not locked - user can scan as guest after logout');
    }
  } catch (error) {
    console.error('Error checking device lock:', error);
  }
};

/**
 * ✅ FIXED: Restore device lock after logout
 * This does NOTHING - device lock is permanent and automatically persists
 * The GUEST_SCAN_USED_KEY is never cleared on logout
 * 
 * @returns {Promise<void>}
 */
export const restoreDeviceLockAfterLogout = async () => {
  try {
    const isLocked = await hasGuestEverScanned();
    
    if (isLocked) {
      console.log('🔒 Device lock still active after logout (permanent)');
    } else {
      console.log('✅ Device not locked - guest can scan after logout');
    }
    
    // DO NOTHING - the lock persists automatically
  } catch (error) {
    console.error('Error checking device lock:', error);
  }
};

/**
 * ✅ CRITICAL: Reset guest scan count - ONLY called after successful signup
 * This unlocks the device when user successfully creates an account
 * This is the ONLY way to remove the device lock
 * 
 * @returns {Promise<void>}
 */
export const resetGuestScanCount = async () => {
  try {
    await AsyncStorage.removeItem(GUEST_SCAN_USED_KEY);
    await AsyncStorage.removeItem(GUEST_FIRST_SCAN_TIMESTAMP_KEY);
    console.log('✅ Guest scan lock REMOVED (user successfully signed up)');
  } catch (error) {
    console.error('Error resetting guest scan status:', error);
  }
};

/**
 * Get guest scan info for display
 * @returns {Promise<object>}
 */
export const getGuestScanInfo = async () => {
  const hasScanned = await hasGuestEverScanned();
  const remaining = hasScanned ? 0 : 1;
  
  return {
    count: hasScanned ? 1 : 0,
    remaining,
    limit: 1,
    hasReachedLimit: hasScanned,
    isPermanentlyLocked: hasScanned,
  };
};

/**
 * Get the timestamp of when the guest scan was first used
 * Useful for showing "You used your free scan on [date]"
 * @returns {Promise<Date|null>}
 */
export const getGuestScanTimestamp = async () => {
  try {
    const timestamp = await AsyncStorage.getItem(GUEST_FIRST_SCAN_TIMESTAMP_KEY);
    return timestamp ? new Date(parseInt(timestamp)) : null;
  } catch (error) {
    console.error('Error getting guest scan timestamp:', error);
    return null;
  }
};

// ==================== OPTIONAL COMPONENT ====================

export const GuestScanBanner = ({ navigation, user }) => {
  const [scanInfo, setScanInfo] = useState(null);
  const [isGuest, setIsGuest] = useState(false);
  const [scanDate, setScanDate] = useState(null);

  useEffect(() => {
    checkGuestStatus();
  }, [user]);

  const checkGuestStatus = async () => {
    const guestStatus = isGuestUser(user);
    setIsGuest(guestStatus);
    
    if (guestStatus) {
      const info = await getGuestScanInfo();
      setScanInfo(info);
      
      if (info.isPermanentlyLocked) {
        const timestamp = await getGuestScanTimestamp();
        setScanDate(timestamp);
      }
    }
  };

  if (!isGuest || !scanInfo) return null;

  return (
    <View style={bannerStyles.container}>
      <View style={bannerStyles.iconContainer}>
        <Ionicons 
          name={scanInfo.isPermanentlyLocked ? "lock-closed" : "scan-outline"} 
          size={24} 
          color={scanInfo.isPermanentlyLocked ? "#d32f2f" : "#5E936C"} 
        />
      </View>
      <View style={bannerStyles.textContainer}>
        <Text style={bannerStyles.title}>
          {scanInfo.isPermanentlyLocked 
            ? "Free Scan Used" 
            : "1 Free Scan Available"}
        </Text>
        <Text style={bannerStyles.subtitle}>
          {scanInfo.isPermanentlyLocked
            ? scanDate 
              ? `Used on ${scanDate.toLocaleDateString()}`
              : "Sign up for unlimited scans!"
            : "Sign up to unlock unlimited scans"}
        </Text>
      </View>
      <TouchableOpacity 
        style={[
          bannerStyles.button,
          scanInfo.isPermanentlyLocked && bannerStyles.buttonLocked
        ]}
        onPress={() => navigation.navigate('SignUp')}
      >
        <Text style={bannerStyles.buttonText}>
          {scanInfo.isPermanentlyLocked ? "Sign Up" : "Unlock"}
        </Text>
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
  buttonLocked: {
    backgroundColor: '#d32f2f',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});