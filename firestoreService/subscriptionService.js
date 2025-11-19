// services/subscriptionService.js - FIXED TO READ FROM CORRECT LOCATION
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
 * ✅ FIXED: Now checks the subscription subcollection properly
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

    // ✅ FIX: Get all documents from the subscription subcollection
    try {
      const subscriptionRef = collection(db, 'users', userId, 'subscription');
      const subscriptionSnapshot = await getDocs(subscriptionRef);
      
      if (!subscriptionSnapshot.empty) {
        // Get the first subscription document (should only be one)
        const subDoc = subscriptionSnapshot.docs[0];
        const data = subDoc.data();
        
        console.log('📄 Found subscription data:', data);
        
        const now = Date.now();
        
        // ✅ Handle both Firestore Timestamp and Date objects
        let expiryDate;
        if (data.endDate?.toMillis) {
          expiryDate = data.endDate.toMillis();
        } else if (data.endDate?.getTime) {
          expiryDate = data.endDate.getTime();
        } else if (typeof data.endDate === 'number') {
          expiryDate = data.endDate;
        } else if (typeof data.endDate === 'string') {
          expiryDate = new Date(data.endDate).getTime();
        } else {
          expiryDate = null;
        }
        
        const isActive = data.status === 'active' && 
                        data.isPremium === true && 
                        expiryDate && 
                        expiryDate > now;
        
        const daysRemaining = isActive && expiryDate
          ? Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
          : 0;

        console.log('✅ Subscription status:', {
          isPremium: data.isPremium,
          status: data.status,
          isActive,
          daysRemaining,
          expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null
        });

        // Cache in AsyncStorage
        await AsyncStorage.setItem(SUBSCRIPTION_KEY(userId), JSON.stringify({
          tier: isActive ? 'premium' : 'free',
          expiryDate: expiryDate,
          isActive: isActive,
          premiumType: data.premiumType || null,
          daysRemaining: daysRemaining,
        }));

        return {
          success: true,
          tier: isActive ? 'premium' : 'free',
          expiryDate: expiryDate,
          isActive: isActive,
          premiumType: data.premiumType,
          daysRemaining: daysRemaining,
        };
      }
    } catch (firestoreError) {
      console.warn('⚠️ Firestore fetch failed, using cache:', firestoreError);
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
    console.error('❌ Error getting subscription:', error);
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
 */
export const activatePremiumSubscription = async (userId, subscriptionData) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const now = Date.now();
    const expiryDate = now + (30 * 24 * 60 * 60 * 1000); // 30 days from now

    const subData = {
      isPremium: true,
      premiumType: subscriptionData.premiumType || 'monthly',
      startDate: new Date(now),
      endDate: new Date(expiryDate),
      status: 'active',
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    };

    // ✅ Save to subscription subcollection
    try {
      const subscriptionRef = collection(db, 'users', userId, 'subscription');
      await setDoc(doc(subscriptionRef, 'premium_sub'), subData);
      console.log('✅ Premium subscription activated in Firestore');
    } catch (firestoreError) {
      console.warn('⚠️ Firestore save failed:', firestoreError);
    }

    // Save to AsyncStorage
    await AsyncStorage.setItem(SUBSCRIPTION_KEY(userId), JSON.stringify({
      tier: 'premium',
      expiryDate: expiryDate,
      isActive: true,
      premiumType: subData.premiumType,
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
        const subscriptionRef = collection(db, 'users', userId, 'subscription');
        const snapshot = await getDocs(subscriptionRef);
        
        if (!snapshot.empty) {
          const subDoc = snapshot.docs[0];
          await updateDoc(subDoc.ref, {
            status: 'expired',
            isPremium: false,
            lastUpdated: serverTimestamp(),
          });
        }
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
 */
export const cancelSubscription = async (userId) => {
  try {
    if (!userId) return { success: false, error: 'User ID required' };

    // Update Firestore
    try {
      const subscriptionRef = collection(db, 'users', userId, 'subscription');
      const snapshot = await getDocs(subscriptionRef);
      
      if (!snapshot.empty) {
        const subDoc = snapshot.docs[0];
        await updateDoc(subDoc.ref, {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
          lastUpdated: serverTimestamp(),
        });
        console.log('✅ Subscription cancelled in Firestore');
      }
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
      
      if (data.lastResetTime < twelveHoursAgo) {
        const resetData = {
          scansRemaining: 5,
          downloadsRemaining: 5,
          lastResetTime: now,
        };
        
        await AsyncStorage.setItem(USAGE_KEY(userId), JSON.stringify(resetData));
        
        return {
          success: true,
          tier: 'free',
          ...resetData,
          hoursUntilReset: 12,
        };
      }
      
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

export const resetUsageLimits = async (userId) => {
  try {
    if (!userId) return { success: false, error: 'User ID required' };

    await AsyncStorage.setItem(USAGE_KEY(userId), JSON.stringify({
      scansRemaining: 5,
      downloadsRemaining: 5,
      lastResetTime: Date.now(),
    }));

    return { success: true };
  } catch (error) {
    console.error('❌ Error resetting usage limits:', error);
    return { success: false, error: error.message };
  }
};

export const getSubscriptionStats = async () => {
  try {
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let totalUsers = 0;
    let premiumUsers = 0;
    let freeUsers = 0;

    for (const userDoc of usersSnapshot.docs) {
      totalUsers++;
      
      const subscriptionRef = collection(db, 'users', userDoc.id, 'subscription');
      const subSnapshot = await getDocs(subscriptionRef);
      
      if (!subSnapshot.empty) {
        const data = subSnapshot.docs[0].data();
        const now = Date.now();
        
        let expiryDate;
        if (data.endDate?.toMillis) {
          expiryDate = data.endDate.toMillis();
        } else if (data.endDate instanceof Date) {
          expiryDate = data.endDate.getTime();
        }
        
        const isActive = data.status === 'active' && 
                        data.isPremium === true && 
                        expiryDate && 
                        expiryDate > now;
        
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