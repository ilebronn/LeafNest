import { useState, useCallback } from 'react';
import { auth } from '@config/firebase';
import {
  isGuestUser,
  incrementGuestScanCount,
  getGuestRemainingScans,
  markGuestScanAsUsed
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
  // ✅ SEPARATE STATES: Guest modal vs Premium gate
  const [showGuestBlockModal, setShowGuestBlockModal] = useState(false);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [usageLimits, setUsageLimits] = useState(null);
  const [isCheckingLimit, setIsCheckingLimit] = useState(false);

  /**
   * Check if user can perform a scan (PRE-SCAN CHECK)
   * Handles both guest and authenticated users
   * Only checks if limit is reached, does NOT decrement count
   * 
   * @returns {Promise<boolean>} - True if scan is allowed, false if limit reached
   */
  const checkScanLimit = useCallback(async () => {
    const user = auth.currentUser;

    if (!user) {
      console.warn('⚠️ No user found, allowing scan');
      return true;
    }

    setIsCheckingLimit(true);

    try {
      // ✅ Handle guest users - Show GUEST BLOCK MODAL
      if (isGuestUser(user)) {
        const remaining = await getGuestRemainingScans();
        
        if (remaining <= 0) {
          console.log('❌ Guest user scan limit reached - PERMANENTLY BLOCKED');
          setShowGuestBlockModal(true); // ✅ Guest-specific modal
          setIsCheckingLimit(false);
          return false;
        }

        console.log(`✅ Guest scan allowed (${remaining} remaining - LAST CHANCE)`);
        setIsCheckingLimit(false);
        return true;
      }

      // ✅ Handle authenticated users - Show PREMIUM GATE
      const limits = await getUsageLimits(user.uid);
      setUsageLimits(limits);

      if (limits.unlimited) {
        console.log('✅ Unlimited scans available');
        setIsCheckingLimit(false);
        return true;
      }

      if (limits.scansRemaining <= 0) {
        console.log('❌ Scan limit reached');
        setShowPremiumGate(true); // ✅ Premium gate for normal users
        setIsCheckingLimit(false);
        return false;
      }

      console.log(`✅ Scan allowed (${limits.scansRemaining} remaining)`);
      
      setIsCheckingLimit(false);
      return true;
    } catch (error) {
      console.error('❌ Error checking scan limit:', error);
      setIsCheckingLimit(false);
      return true;
    }
  }, []);

  /**
   * Decrement scan count for authenticated users (POST-SCAN)
   * Called after successful scan completion
   * 
   * @returns {Promise<boolean>} - True if successful
   */
  const decrementScanCountPostScan = useCallback(async () => {
    const user = auth.currentUser;

    if (!user || isGuestUser(user)) {
      return false;
    }

    try {
      await decrementScanCount(user.uid);
      const limits = await getUsageLimits(user.uid);
      setUsageLimits(limits);
      console.log(`✅ Scan count decremented (${limits.scansRemaining} remaining)`);
      return true;
    } catch (error) {
      console.error('❌ Error decrementing scan count:', error);
      return false;
    }
  }, []);

  /**
   * ✅ Handle post-scan logic for guest users
   * IMMEDIATELY locks the device permanently after first scan
   * Then shows upgrade prompt after a delay
   * 
   * @param {Function} navigation - Navigation object
   */
  const handleGuestPostScan = useCallback(async (navigation) => {
    const user = auth.currentUser;

    if (!isGuestUser(user)) {
      return;
    }

    try {
      console.log('🔒 Permanently locking device for guest scans...');
      await markGuestScanAsUsed();
      
      const remaining = await getGuestRemainingScans();
      console.log(`📊 Guest scans remaining after lock: ${remaining}`);

      setTimeout(() => {
        if (navigation && navigation.navigate) {
          const { Alert } = require('react-native');
          Alert.alert(
            "🎉 You've Used Your Free Scan!",
            "This device has now used its one-time free scan. Sign up now to unlock unlimited scans!",
            [
              { 
                text: "Maybe Later", 
                style: "cancel",
                onPress: () => {
                  console.log('⚠️ User declined signup - device remains locked');
                }
              },
              { 
                text: "Sign Up Now", 
                onPress: () => navigation.navigate('SignUp') 
              }
            ]
          );
        }
      }, 2000);
    } catch (error) {
      console.error('❌ Error in guest post-scan:', error);
    }
  }, []);

  /**
   * Refresh usage limits from server
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
   * ✅ Close guest block modal
   */
  const closeGuestBlockModal = useCallback(() => {
    setShowGuestBlockModal(false);
  }, []);

  /**
   * ✅ Close premium gate modal
   */
  const closePremiumGate = useCallback(() => {
    setShowPremiumGate(false);
  }, []);

  /**
   * ✅ Open guest block modal manually
   */
  const openGuestBlockModal = useCallback(() => {
    setShowGuestBlockModal(true);
  }, []);

  /**
   * ✅ Open premium gate modal manually
   */
  const openPremiumGate = useCallback(() => {
    setShowPremiumGate(true);
  }, []);

  /**
   * Handle upgrade button press
   * @param {Function} navigation - Navigation object
   */
  const handleUpgrade = useCallback((navigation) => {
    setShowPremiumGate(false);
    
    if (navigation && navigation.navigate) {
      navigation.navigate('PlanScreen');
    }
  }, []);

  /**
   * ✅ Handle sign up from guest block modal
   * @param {Function} navigation - Navigation object
   */
  const handleGuestSignUp = useCallback((navigation) => {
    setShowGuestBlockModal(false);
    
    if (navigation && navigation.navigate) {
      navigation.navigate('SignUp');
    }
  }, []);

  /**
   * Get formatted scan limit info for display
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
      return {
        hasLimit: true,
        scansRemaining: 0,
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
   */
  const isApproachingLimit = useCallback((threshold = 5) => {
    if (!usageLimits || usageLimits.unlimited) {
      return false;
    }

    return usageLimits.scansRemaining <= threshold && usageLimits.scansRemaining > 0;
  }, [usageLimits]);

  return {
    // ✅ SEPARATE STATES
    showGuestBlockModal,
    showPremiumGate,
    usageLimits,
    isCheckingLimit,

    // Actions
    checkScanLimit,
    decrementScanCountPostScan,
    handleGuestPostScan,
    refreshUsageLimits,
    
    // ✅ SEPARATE CLOSE FUNCTIONS
    closeGuestBlockModal,
    closePremiumGate,
    
    // ✅ SEPARATE OPEN FUNCTIONS
    openGuestBlockModal,
    openPremiumGate,
    
    // ✅ SEPARATE HANDLERS
    handleUpgrade,
    handleGuestSignUp,

    // Getters
    getScanLimitInfo,
    isApproachingLimit,

    // Setters
    setShowGuestBlockModal,
    setShowPremiumGate,
    setUsageLimits,
  };
};

export default useScanLimits;