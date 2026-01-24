// hooks/useDownloadLimits.js - NEW FILE
import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { auth } from '@config/firebase';
import { isGuestUser } from '@utils/guest';
import { 
  canDownload, 
  decrementDownloadCount,
  getUsageLimits 
} from '@services/subscription/subscriptionService';

/**
 * Custom hook for managing download limits
 * Handles both guest users and authenticated users with subscription limits
 * 
 * @returns {Object} - Download limit state and functions
 */
const useDownloadLimits = () => {
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [usageLimits, setUsageLimits] = useState(null);
  const [isCheckingLimit, setIsCheckingLimit] = useState(false);

  /**
   * Check if user can download (PRE-DOWNLOAD CHECK)
   * @returns {Promise<boolean>} - True if download is allowed
   */
  const checkDownloadLimit = useCallback(async () => {
    const user = auth.currentUser;

    if (!user) {
      console.warn('⚠️ No user found');
      return false;
    }

    setIsCheckingLimit(true);

    try {
      // ❌ Guest users cannot download
      if (isGuestUser(user)) {
        console.log('❌ Guest user - downloads not allowed');
        Alert.alert(
          '📥 Downloads Unavailable',
          'Please sign up for a free account to download images!',
          [{ text: 'OK' }]
        );
        setIsCheckingLimit(false);
        return false;
      }

      // ✅ Check download limits for authenticated users
      const result = await canDownload(user.uid);
      
      if (!result.success) {
        console.error('❌ Error checking download limit');
        setIsCheckingLimit(false);
        return false;
      }

      if (result.unlimited) {
        console.log('✅ Unlimited downloads (Premium user)');
        setIsCheckingLimit(false);
        return true;
      }

      if (!result.canDownload) {
        console.log('❌ Download limit reached');
        
        // Get full usage limits for display
        const limits = await getUsageLimits(user.uid);
        setUsageLimits(limits);
        setShowPremiumGate(true);
        setIsCheckingLimit(false);
        return false;
      }

      console.log(`✅ Download allowed (${result.downloadsRemaining} remaining)`);
      setIsCheckingLimit(false);
      return true;

    } catch (error) {
      console.error('❌ Error checking download limit:', error);
      setIsCheckingLimit(false);
      return false;
    }
  }, []);

  /**
   * Decrement download count after successful download
   * @returns {Promise<boolean>}
   */
  const decrementDownloadCountPostDownload = useCallback(async () => {
    const user = auth.currentUser;

    if (!user || isGuestUser(user)) {
      return false;
    }

    try {
      const result = await decrementDownloadCount(user.uid);
      
      if (result.success) {
        // Refresh usage limits
        const limits = await getUsageLimits(user.uid);
        setUsageLimits(limits);
        
        console.log(`✅ Download count decremented (${result.downloadsRemaining} remaining)`);
        
        // Show warning if approaching limit
        if (result.downloadsRemaining === 1) {
          Alert.alert(
            '⚠️ Low Downloads',
            `You have ${result.downloadsRemaining} download remaining. Resets in ${result.hoursUntilReset} hours.`,
            [{ text: 'OK' }]
          );
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error decrementing download count:', error);
      return false;
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
   * Handle upgrade button press
   */
  const handleUpgrade = useCallback((navigation) => {
    setShowPremiumGate(false);
    
    if (navigation && navigation.navigate) {
      navigation.navigate('PlanScreen');
    }
  }, []);

  /**
   * Get formatted download limit info
   */
  const getDownloadLimitInfo = useCallback(() => {
    const user = auth.currentUser;

    if (!user) {
      return {
        hasLimit: true,
        downloadsRemaining: 0,
        unlimited: false,
        message: 'Not logged in'
      };
    }

    if (isGuestUser(user)) {
      return {
        hasLimit: true,
        downloadsRemaining: 0,
        unlimited: false,
        message: 'Sign up to download'
      };
    }

    if (!usageLimits) {
      return {
        hasLimit: false,
        downloadsRemaining: 0,
        unlimited: false,
        message: 'Loading...'
      };
    }

    if (usageLimits.unlimited) {
      return {
        hasLimit: false,
        downloadsRemaining: Infinity,
        unlimited: true,
        message: 'Unlimited downloads'
      };
    }

    return {
      hasLimit: true,
      downloadsRemaining: usageLimits.downloadsRemaining || 0,
      unlimited: false,
      message: `${usageLimits.downloadsRemaining || 0} downloads remaining`
    };
  }, [usageLimits]);

  /**
   * Check if approaching download limit
   */
  const isApproachingDownloadLimit = useCallback((threshold = 2) => {
    if (!usageLimits || usageLimits.unlimited) {
      return false;
    }

    return usageLimits.downloadsRemaining <= threshold && usageLimits.downloadsRemaining > 0;
  }, [usageLimits]);

  return {
    // State
    showPremiumGate,
    usageLimits,
    isCheckingLimit,

    // Actions
    checkDownloadLimit,
    decrementDownloadCountPostDownload,
    refreshUsageLimits,
    closePremiumGate,
    openPremiumGate,
    handleUpgrade,

    // Getters
    getDownloadLimitInfo,
    isApproachingDownloadLimit,

    // Setters
    setShowPremiumGate,
    setUsageLimits,
  };
};

export default useDownloadLimits;
