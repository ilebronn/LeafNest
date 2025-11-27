import { useState, useCallback } from 'react';
import { auth } from '@config/firebase';
import {
  isGuestUser,
  incrementGuestScanCount,
  getGuestRemainingScans
} from '@utils/guest';
import { 
  decrementScanCount, 
  getUsageLimits 
} from '@services/subscription/subscriptionService';

/**
 * Custom hook for managing scan limits and premium gate
 * Handles both guest users and authenticated users with subscription limits
 * 
 * @returns {Object} - Scan limit state and functions
 */
const useScanLimits = () => {
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [usageLimits, setUsageLimits] = useState(null);
  const [isCheckingLimit, setIsCheckingLimit] = useState(false);

  /**
   * Check if user can perform a scan
   * Handles both guest and authenticated users
   * 
   * @returns {Promise<boolean>} - True if scan is allowed, false if limit reached
   */
  const checkScanLimit = useCallback(async () => {
    const user = auth.currentUser;

    // If no user, allow scan (shouldn't happen, but fail-safe)
    if (!user) {
      console.warn('⚠️ No user found, allowing scan');
      return true;
    }

    setIsCheckingLimit(true);

    try {
      // Handle guest users
      if (isGuestUser(user)) {
        const remaining = await getGuestRemainingScans();
        
        if (remaining <= 0) {
          console.log('❌ Guest user scan limit reached');
          setShowPremiumGate(true);
          setIsCheckingLimit(false);
          return false;
        }

        console.log(`✅ Guest scan allowed (${remaining} remaining)`);
        setIsCheckingLimit(false);
        return true;
      }

      // Handle authenticated users
      const limits = await getUsageLimits(user.uid);
      setUsageLimits(limits);

      // Check if user has unlimited scans
      if (limits.unlimited) {
        console.log('✅ Unlimited scans available');
        setIsCheckingLimit(false);
        return true;
      }

      // Check if user has scans remaining
      if (limits.scansRemaining <= 0) {
        console.log('❌ Scan limit reached');
        setShowPremiumGate(true);
        setIsCheckingLimit(false);
        return false;
      }

      // Decrement scan count
      await decrementScanCount(user.uid);
      console.log(`✅ Scan allowed (${limits.scansRemaining - 1} remaining)`);
      
      setIsCheckingLimit(false);
      return true;
    } catch (error) {
      console.error('❌ Error checking scan limit:', error);
      // Fail-safe: allow scan if check fails
      setIsCheckingLimit(false);
      return true;
    }
  }, []);

  /**
   * Handle post-scan logic for guest users
   * Increments guest scan count and shows upgrade prompt if needed
   * 
   * @param {Function} navigation - Navigation object
   */
  const handleGuestPostScan = useCallback(async (navigation) => {
    const user = auth.currentUser;

    if (!isGuestUser(user)) {
      return; // Not a guest user
    }

    try {
      await incrementGuestScanCount();
      const remaining = await getGuestRemainingScans();

      console.log(`📊 Guest scans remaining: ${remaining}`);

      if (remaining === 0) {
        // Show upgrade prompt after a delay
        setTimeout(() => {
          if (navigation && navigation.navigate) {
            // Use Alert instead of direct navigation for better UX
            const { Alert } = require('react-native');
            Alert.alert(
              "🎉 You've Reached Your Free Scan Limit",
              "Want unlimited scans? Sign up now to unlock premium features!",
              [
                { text: "Maybe Later", style: "cancel" },
                { 
                  text: "Sign Up Now", 
                  onPress: () => navigation.navigate('SignUp') 
                }
              ]
            );
          }
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error in guest post-scan:', error);
    }
  }, []);

  /**
   * Refresh usage limits from server
   * Useful after a scan or subscription change
   */
  const refreshUsageLimits = useCallback(async () => {
    const user = auth.currentUser;

    if (!user || isGuestUser(user)) {
      return;
    }

    try {
      const limits = await getUsageLimits(user.uid);
      setUsageLimits(limits);
      console.log('🔄 Usage limits refreshed:', limits);
    } catch (error) {
      console.error('❌ Error refreshing usage limits:', error);
    }
  }, []);

  /**
   * Close premium gate modal
   */
  const closePremiumGate = useCallback(() => {
    setShowPremiumGate(false);
  }, []);

  /**
   * Open premium gate modal manually
   */
  const openPremiumGate = useCallback(() => {
    setShowPremiumGate(true);
  }, []);

  /**
   * Handle upgrade button press in premium gate
   * @param {Function} navigation - Navigation object
   */
  const handleUpgrade = useCallback((navigation) => {
    setShowPremiumGate(false);
    
    if (navigation && navigation.navigate) {
      navigation.navigate('PlanScreen');
    }
  }, []);

  /**
   * Get formatted scan limit info for display
   * @returns {Object} - { hasLimit, scansRemaining, unlimited, message }
   */
  const getScanLimitInfo = useCallback(() => {
    const user = auth.currentUser;

    if (!user) {
      return {
        hasLimit: false,
        scansRemaining: 0,
        unlimited: false,
        message: 'Not logged in'
      };
    }

    if (isGuestUser(user)) {
      // This would need to be async in real usage
      return {
        hasLimit: true,
        scansRemaining: 0, // Should fetch from getGuestRemainingScans
        unlimited: false,
        message: 'Guest user - limited scans'
      };
    }

    if (!usageLimits) {
      return {
        hasLimit: false,
        scansRemaining: 0,
        unlimited: false,
        message: 'Loading...'
      };
    }

    if (usageLimits.unlimited) {
      return {
        hasLimit: false,
        scansRemaining: Infinity,
        unlimited: true,
        message: 'Unlimited scans'
      };
    }

    return {
      hasLimit: true,
      scansRemaining: usageLimits.scansRemaining || 0,
      unlimited: false,
      message: `${usageLimits.scansRemaining || 0} scans remaining`
    };
  }, [usageLimits]);

  /**
   * Check if user is approaching scan limit
   * @param {number} threshold - Threshold to check (default: 5)
   * @returns {boolean} - True if approaching limit
   */
  const isApproachingLimit = useCallback((threshold = 5) => {
    if (!usageLimits || usageLimits.unlimited) {
      return false;
    }

    return usageLimits.scansRemaining <= threshold && usageLimits.scansRemaining > 0;
  }, [usageLimits]);

  return {
    // State
    showPremiumGate,
    usageLimits,
    isCheckingLimit,

    // Actions
    checkScanLimit,
    handleGuestPostScan,
    refreshUsageLimits,
    closePremiumGate,
    openPremiumGate,
    handleUpgrade,

    // Getters
    getScanLimitInfo,
    isApproachingLimit,

    // Setters (for manual control if needed)
    setShowPremiumGate,
    setUsageLimits,
  };
};

export default useScanLimits;