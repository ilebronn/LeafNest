// src/hooks/useOfflineAccess.js
import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getUserSubscription } from '@services/subscription/subscriptionService';
import { auth } from '@config/firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * ✅ COMPREHENSIVE OFFLINE ACCESS HOOK
 * Manages offline access for premium users with real-time updates
 * 
 * @returns {Object} {
 *   isOffline: boolean - Device is offline
 *   isPremium: boolean - User has active premium subscription
 *   canAccessOffline: boolean - User can access offline features (offline + premium + authenticated)
 *   loading: boolean - Checking status
 *   userId: string|null - Current user ID
 *   refresh: function - Manually refresh status
 *   shouldBlockOfflineAccess: boolean - Should block with premium gate
 *   error: Error|null - Any error during status check
 * }
 */
export const useOfflineAccess = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState(null);

  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const currentUser = auth.currentUser;
      const uid = currentUser?.uid || null;
      setUserId(uid);

      // Guests cannot access offline features
      if (!uid) {
        setIsOffline(false);
        setIsPremium(false);
        setLoading(false);
        return;
      }

      // Check network status using NetInfo
      const netState = await NetInfo.fetch();
      const online = netState.isConnected && netState.isInternetReachable !== false;
      setIsOffline(!online);

      // Check premium subscription
      const subscription = await getUserSubscription(uid);
      const premiumStatus = subscription.isActive === true;
      setIsPremium(premiumStatus);

      console.log('🔍 Offline Access Status:', {
        userId: uid,
        isOffline: !online,
        isPremium: premiumStatus,
        canAccessOffline: !online && premiumStatus && uid !== null,
        timestamp: new Date().toISOString(),
      });

    } catch (err) {
      console.error('❌ Error checking offline access:', err);
      setError(err);
      setIsOffline(false);
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial status check
    checkStatus();

    // Listen to auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user?.uid !== userId) {
        checkStatus();
      }
    });

    // ✅ Listen to network changes using NetInfo directly
    const unsubscribeNetwork = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable !== false;
      const offline = !online;
      
      setIsOffline(offline);
      
      if (offline) {
        console.log('🌐 Network: OFFLINE - Checking premium status...');
        // Re-check premium status when going offline
        checkStatus();
      } else {
        console.log('🌐 Network: ONLINE');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeNetwork();
    };
  }, [checkStatus, userId]);

  // ✅ CRITICAL: User can access offline ONLY if:
  // 1. Device is offline
  // 2. User has active premium subscription
  // 3. User is authenticated (not guest)
  const canAccessOffline = isOffline && isPremium && userId !== null;

  // ✅ Should block access if offline but NOT premium
  const shouldBlockOfflineAccess = isOffline && !isPremium && userId !== null;

  // ✅ Check if user needs premium upgrade prompt
  const showPremiumPrompt = isOffline && !isPremium && userId !== null && !loading;

  return {
    isOffline,
    isPremium,
    canAccessOffline,
    shouldBlockOfflineAccess,
    showPremiumPrompt,
    loading,
    userId,
    error,
    refresh: checkStatus,
    // Helper methods for specific scenarios
    checkAccessForFeature: (featureRequiresOnline = false) => {
      if (featureRequiresOnline && isOffline) {
        return false;
      }
      return canAccessOffline;
    },
  };
};

export default useOfflineAccess;