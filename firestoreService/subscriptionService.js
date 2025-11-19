// services/subscriptionService.js - COMPLETE SUBSCRIPTION MANAGEMENT
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  db, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from '../firebase';

// Storage keys
const SUBSCRIPTION_KEY = (uid) => `subscription_${uid}`;
const USAGE_KEY = (uid) => `usage_${uid}`;

// ==================== SUBSCRIPTION TIER MANAGEMENT ====================

/**
 * Get user's current subscription status
 * @param {string} userId 
 * @returns {Object} { tier: 'free'|'premium', expiryDate: timestamp|null, isActive: boolean }
 */
export const getUserSubscription = async (userId) => {
  try {
    if (!userId) {
      return { 
        success: true, 
        tier: 'free', 
        expiryDate: null, 
        isActive: false,
        daysRemaining: 0 
      };
    }

    // Try Firestore first
    try {
      const subDoc = await getDoc(doc(db, 'users', userId, 'subscription', 'current'));
      
      if (subDoc.exists()) {
        const data = subDoc.data();
        const now = Date.now();
        const expiryDate = data.expiryDate?.toMillis() || null;
        const isActive = expiryDate && expiryDate > now;
        const daysRemaining = isActive 
          ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
          : 0;

        // Cache in AsyncStorage
        await AsyncStorage.setItem(SUBSCRIPTION_KEY(userId), JSON.stringify({
          tier: isActive ? 'premium' : 'free',
          expiryDate: expiryDate,
          isActive: isActive,
          paymentMethod: data.paymentMethod || null,
          transactionId: data.transactionId || null,
          daysRemaining: daysRemaining,
        }));

        return {
          success: true,
          tier: isActive ? 'premium' : 'free',
          expiryDate: expiryDate,
          isActive: isActive,
          paymentMethod: data.paymentMethod,
          transactionId: data.transactionId,
          daysRemaining: daysRemaining,
        };
      }
    } catch (firestoreError) {
      console.warn('Firestore fetch failed, using cache:', firestoreError);
    }

    // Fallback to AsyncStorage
    const cached = await AsyncStorage.getItem(SUBSCRIPTION_KEY(userId));
    if (cached) {
      const data = JSON.parse(cached);
      const now = Date.now();
      const isActive = data.expiryDate && data.expiryDate > now;
      const daysRemaining = isActive 
        ? Math.ceil((data.expiryDate - now) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        success: true,
        tier: isActive ? 'premium' : 'free',
        expiryDate: data.expiryDate,
        isActive: isActive,
        daysRemaining: daysRemaining,
      };
    }

    // Default to free tier
    return { 
      success: true, 
      tier: 'free', 
      expiryDate: null, 
      isActive: false,
      daysRemaining: 0,
    };
  } catch (error) {
    console.error('Error getting subscription:', error);
    return { 
      success: false, 
      tier: 'free', 
      expiryDate: null, 
      isActive: false,
      error: error.message,
      daysRemaining: 0,
    };
  }
};

/**
 * Activate premium subscription (after successful payment)
 * @param {string} userId 
 * @param {Object} subscriptionData - { paymentMethod, transactionId, amount }
 * @returns {Object}
 */
export const activatePremiumSubscription = async (userId, subscriptionData) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const now = Date.now();
    const expiryDate = now + (30 * 24 * 60 * 60 * 1000); // 30 days from now

    const subData = {
      tier: 'premium',
      expiryDate: new Date(expiryDate),
      startDate: new Date(now),
      paymentMethod: subscriptionData.paymentMethod || 'gcash',
      transactionId: subscriptionData.transactionId,
      amount: subscriptionData.amount || 0,
      status: 'active',
      autoRenew: false,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    };

    // Save to Firestore
    try {
      await setDoc(
        doc(db, 'users', userId, 'subscription', 'current'),
        subData
      );
      console.log('✅ Premium subscription activated in Firestore');
    } catch (firestoreError) {
      console.warn('⚠️ Firestore save failed:', firestoreError);
    }

    // Save to AsyncStorage
    await AsyncStorage.setItem(SUBSCRIPTION_KEY(userId), JSON.stringify({
      tier: 'premium',
      expiryDate: expiryDate,
      isActive: true,
      paymentMethod: subData.paymentMethod,
      transactionId: subData.transactionId,
      daysRemaining: 30,
    }));

    // Reset usage limits (premium = unlimited)
    await resetUsageLimits(userId);

    console.log('✅ Premium subscription activated successfully');
    return { 
      success: true, 
      tier: 'premium',
      expiryDate: expiryDate,
      daysRemaining: 30,
    };
  } catch (error) {
    console.error('❌ Error activating subscription:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if subscription is expired and update status
 * @param {string} userId 
 * @returns {Object}
 */
export const checkAndUpdateSubscription = async (userId) => {
  try {
    if (!userId) return { success: false, error: 'User ID required' };

    const subscription = await getUserSubscription(userId);
    
    if (!subscription.success) {
      return subscription;
    }

    const now = Date.now();
    const isExpired = subscription.expiryDate && subscription.expiryDate < now;

    if (isExpired && subscription.tier === 'premium') {
      console.log('⏰ Subscription expired, reverting to free tier');
      
      // Update Firestore
      try {
        await updateDoc(doc(db, 'users', userId, 'subscription', 'current'), {
          status: 'expired',
          tier: 'free',
          lastUpdated: serverTimestamp(),
        });
      } catch (error) {
        console.warn('⚠️ Failed to update Firestore:', error);
      }

      // Update AsyncStorage
      await AsyncStorage.setItem(SUBSCRIPTION_KEY(userId), JSON.stringify({
        tier: 'free',
        expiryDate: subscription.expiryDate,
        isActive: false,
        daysRemaining: 0,
      }));

      return {
        success: true,
        tier: 'free',
        isActive: false,
        wasExpired: true,
        daysRemaining: 0,
      };
    }

    return {
      success: true,
      tier: subscription.tier,
      isActive: subscription.isActive,
      expiryDate: subscription.expiryDate,
      daysRemaining: subscription.daysRemaining,
    };
  } catch (error) {
    console.error('❌ Error checking subscription:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cancel premium subscription (will expire at end of period)
 * @param {string} userId 
 * @returns {Object}
 */
export const cancelSubscription = async (userId) => {
  try {
    if (!userId) return { success: false, error: 'User ID required' };

    // Update Firestore
    try {
      await updateDoc(doc(db, 'users', userId, 'subscription', 'current'), {
        status: 'cancelled',
        autoRenew: false,
        cancelledAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
      });
      console.log('✅ Subscription cancelled in Firestore');
    } catch (error) {
      console.warn('⚠️ Failed to update Firestore:', error);
    }

    return { success: true, message: 'Subscription will expire at end of period' };
  } catch (error) {
    console.error('❌ Error cancelling subscription:', error);
    return { success: false, error: error.message };
  }
};

// ==================== USAGE LIMITS ====================

/**
 * Get user's current usage limits
 * @param {string} userId 
 * @returns {Object}
 */
export const getUsageLimits = async (userId) => {
  try {
    if (!userId) {
      return {
        success: true,
        scansRemaining: 5,
        downloadsRemaining: 5,
        lastResetTime: Date.now(),
      };
    }

    // Check subscription first
    const subscription = await getUserSubscription(userId);
    
    // Premium users have unlimited
    if (subscription.tier === 'premium' && subscription.isActive) {
      return {
        success: true,
        tier: 'premium',
        scansRemaining: Infinity,
        downloadsRemaining: Infinity,
        unlimited: true,
      };
    }

    // Get usage from AsyncStorage
    const cached = await AsyncStorage.getItem(USAGE_KEY(userId));
    const now = Date.now();
    
    if (cached) {
      const data = JSON.parse(cached);
      const twelveHoursAgo = now - (12 * 60 * 60 * 1000);
      
      // Check if 12 hours have passed since last reset
      if (data.lastResetTime < twelveHoursAgo) {
        // Reset limits
        const resetData = {
          scansRemaining: 5,
          downloadsRemaining: 5,
          lastResetTime: now,
        };
        
        await AsyncStorage.setItem(USAGE_KEY(userId), JSON.stringify(resetData));
        console.log('🔄 Usage limits reset (12 hours passed)');
        
        return {
          success: true,
          tier: 'free',
          ...resetData,
          hoursUntilReset: 12,
        };
      }
      
      // Calculate hours until reset
      const timeUntilReset = (12 * 60 * 60 * 1000) - (now - data.lastResetTime);
      const hoursUntilReset = Math.ceil(timeUntilReset / (60 * 60 * 1000));
      
      return {
        success: true,
        tier: 'free',
        scansRemaining: data.scansRemaining,
        downloadsRemaining: data.downloadsRemaining,
        lastResetTime: data.lastResetTime,
        hoursUntilReset: hoursUntilReset,
      };
    }

    // Initialize usage limits
    const initialData = {
      scansRemaining: 5,
      downloadsRemaining: 5,
      lastResetTime: now,
    };
    
    await AsyncStorage.setItem(USAGE_KEY(userId), JSON.stringify(initialData));
    
    return {
      success: true,
      tier: 'free',
      ...initialData,
      hoursUntilReset: 12,
    };
  } catch (error) {
    console.error('❌ Error getting usage limits:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Decrement scan count (call before scanning)
 * @param {string} userId 
 * @returns {Object}
 */
export const decrementScanCount = async (userId) => {
  try {
    if (!userId) return { success: false, error: 'User ID required' };

    const usage = await getUsageLimits(userId);
    
    if (usage.unlimited) {
      return { success: true, unlimited: true };
    }

    if (usage.scansRemaining <= 0) {
      return { 
        success: false, 
        error: 'No scans remaining',
        hoursUntilReset: usage.hoursUntilReset,
      };
    }

    const newCount = usage.scansRemaining - 1;
    
    await AsyncStorage.setItem(USAGE_KEY(userId), JSON.stringify({
      scansRemaining: newCount,
      downloadsRemaining: usage.downloadsRemaining,
      lastResetTime: usage.lastResetTime,
    }));

    console.log(`✅ Scan count: ${newCount}/5 remaining`);

    return {
      success: true,
      scansRemaining: newCount,
      hoursUntilReset: usage.hoursUntilReset,
    };
  } catch (error) {
    console.error('❌ Error decrementing scan count:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Decrement download count (call before downloading)
 * @param {string} userId 
 * @returns {Object}
 */
export const decrementDownloadCount = async (userId) => {
  try {
    if (!userId) return { success: false, error: 'User ID required' };

    const usage = await getUsageLimits(userId);
    
    if (usage.unlimited) {
      return { success: true, unlimited: true };
    }

    if (usage.downloadsRemaining <= 0) {
      return { 
        success: false, 
        error: 'No downloads remaining',
        hoursUntilReset: usage.hoursUntilReset,
      };
    }

    const newCount = usage.downloadsRemaining - 1;
    
    await AsyncStorage.setItem(USAGE_KEY(userId), JSON.stringify({
      scansRemaining: usage.scansRemaining,
      downloadsRemaining: newCount,
      lastResetTime: usage.lastResetTime,
    }));

    console.log(`✅ Download count: ${newCount}/5 remaining`);

    return {
      success: true,
      downloadsRemaining: newCount,
      hoursUntilReset: usage.hoursUntilReset,
    };
  } catch (error) {
    console.error('❌ Error decrementing download count:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reset usage limits (called when activating premium)
 * @param {string} userId 
 * @returns {Object}
 */
export const resetUsageLimits = async (userId) => {
  try {
    if (!userId) return { success: false, error: 'User ID required' };

    await AsyncStorage.setItem(USAGE_KEY(userId), JSON.stringify({
      scansRemaining: 5,
      downloadsRemaining: 5,
      lastResetTime: Date.now(),
    }));

    console.log('🔄 Usage limits reset');
    return { success: true };
  } catch (error) {
    console.error('❌ Error resetting usage limits:', error);
    return { success: false, error: error.message };
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get subscription statistics (for admin/analytics)
 * @returns {Object}
 */
export const getSubscriptionStats = async () => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let totalUsers = 0;
    let premiumUsers = 0;
    let freeUsers = 0;

    for (const userDoc of usersSnapshot.docs) {
      totalUsers++;
      
      const subDoc = await getDoc(doc(db, 'users', userDoc.id, 'subscription', 'current'));
      
      if (subDoc.exists()) {
        const data = subDoc.data();
        const expiryDate = data.expiryDate?.toMillis() || null;
        const isActive = expiryDate && expiryDate > Date.now();
        
        if (isActive) {
          premiumUsers++;
        } else {
          freeUsers++;
        }
      } else {
        freeUsers++;
      }
    }

    return {
      success: true,
      totalUsers,
      premiumUsers,
      freeUsers,
      conversionRate: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(2) : 0,
    };
  } catch (error) {
    console.error('❌ Error getting subscription stats:', error);
    return { success: false, error: error.message };
  }
};