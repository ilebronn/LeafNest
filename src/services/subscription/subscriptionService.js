// services/subscriptionService.js - COMPLETE RESUBSCRIPTION FIX
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
  deleteDoc,
} from '@config/firebase';

// Storage keys
const SUBSCRIPTION_KEY = (uid) => `subscription_${uid}`;
const USAGE_KEY = (uid) => `usage_${uid}`;

// ✅ FIXED: Always use consistent document ID
const SUBSCRIPTION_DOC_ID = 'current_subscription';

// ==================== SUBSCRIPTION TIER MANAGEMENT ====================

/**
 * Get user's current subscription status
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

    try {
      // ✅ FIXED: Use consistent document ID
      const subscriptionRef = doc(db, 'users', userId, 'subscription', SUBSCRIPTION_DOC_ID);
      const subscriptionDoc = await getDoc(subscriptionRef);
      
      if (subscriptionDoc.exists()) {
        const data = subscriptionDoc.data();
        
        const now = Date.now();
        
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
 * ✅ COMPLETE FIX: Activate premium subscription
 * ALLOWS RESUBSCRIPTION even if user had previous subscription
 */
export const activatePremiumSubscription = async (userId, subscriptionData = {}) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    console.log('🔄 Activating premium subscription for user:', userId);

    const now = Date.now();
    const expiryDate = now + (30 * 24 * 60 * 60 * 1000); // 30 days from now

    // ✅ CRITICAL: First, delete ALL old subscription documents
    try {
      const subscriptionCollectionRef = collection(db, 'users', userId, 'subscription');
      const oldDocsSnapshot = await getDocs(subscriptionCollectionRef);
      
      console.log(`🗑️ Found ${oldDocsSnapshot.size} old subscription documents`);
      
      // Delete all old documents
      const deletePromises = oldDocsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log('✅ Deleted all old subscription documents');
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean old docs:', cleanupError);
      // Continue anyway
    }

    // ✅ Create fresh subscription data
    const subData = {
      isPremium: true,
      premiumType: subscriptionData.premiumType || 'monthly',
      startDate: new Date(now),
      endDate: new Date(expiryDate),
      status: 'active',
      paymentMethod: subscriptionData.paymentMethod || 'manual',
      transactionId: subscriptionData.transactionId || null,
      amount: subscriptionData.amount || 99,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      activatedAt: serverTimestamp(),
    };

    // ✅ CRITICAL: Create new subscription document
    const subscriptionRef = doc(db, 'users', userId, 'subscription', SUBSCRIPTION_DOC_ID);
    await setDoc(subscriptionRef, subData, { merge: false });
    
    console.log('✅ Premium subscription document created in Firestore');

    // ✅ Update AsyncStorage
    await AsyncStorage.setItem(SUBSCRIPTION_KEY(userId), JSON.stringify({
      tier: 'premium',
      expiryDate: expiryDate,
      isActive: true,
      premiumType: subData.premiumType,
      daysRemaining: 30,
    }));

    // ✅ Reset usage limits for new subscription
    await resetUsageLimits(userId);

    console.log('✅ Premium subscription activated successfully');
    console.log('📅 Expiry date:', new Date(expiryDate).toLocaleDateString());
    
    return { 
      success: true, 
      tier: 'premium',
      expiryDate: expiryDate,
      daysRemaining: 30,
      message: 'Premium subscription activated! Enjoy unlimited scans and downloads.',
    };
  } catch (error) {
    console.error('❌ Error activating subscription:', error);
    console.error('Error details:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * ✅ FIXED: Approve payment and activate premium (MOVED HERE TO AVOID CIRCULAR DEPENDENCY)
 */
export const approvePayment = async (submissionId) => {
  try {
    console.log('🔍 Approving payment submission:', submissionId);
    
    const submissionRef = doc(db, 'paymentSubmissions', submissionId);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      return { success: false, error: 'Submission not found' };
    }

    const data = submissionDoc.data();
    const userId = data.userId;

    console.log('👤 Approving payment for user:', userId);

    // ✅ Update submission status FIRST
    await updateDoc(submissionRef, {
      status: 'approved',
      approvedAt: serverTimestamp(),
    });

    console.log('✅ Payment submission marked as approved');

    // ✅ Activate premium subscription directly (NO IMPORT NEEDED)
    const subscriptionData = {
      premiumType: 'monthly',
      paymentMethod: 'gcash_manual',
      transactionId: submissionId,
      amount: data.amount || 99,
    };

    console.log('🔄 Calling activatePremiumSubscription...');
    const activationResult = await activatePremiumSubscription(userId, subscriptionData);

    if (!activationResult.success) {
      console.error('❌ Failed to activate subscription:', activationResult.error);
      return { 
        success: false, 
        error: `Payment approved but activation failed: ${activationResult.error}` 
      };
    }

    console.log('✅ Premium subscription activated successfully');

    return { 
      success: true, 
      message: 'Payment approved and premium activated',
      userId: userId,
      expiryDate: activationResult.expiryDate,
    };
  } catch (error) {
    console.error('❌ Error approving payment:', error);
    console.error('Error stack:', error.stack);
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
      
      try {
        const subscriptionRef = doc(db, 'users', userId, 'subscription', SUBSCRIPTION_DOC_ID);
        await updateDoc(subscriptionRef, {
          status: 'expired',
          isPremium: false,
          lastUpdated: serverTimestamp(),
        });
      } catch (error) {
        console.warn('⚠️ Failed to update Firestore:', error);
      }

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
 * Cancel premium subscription
 */
export const cancelSubscription = async (userId) => {
  try {
    if (!userId) return { success: false, error: 'User ID required' };

    try {
      const subscriptionRef = doc(db, 'users', userId, 'subscription', SUBSCRIPTION_DOC_ID);
      await updateDoc(subscriptionRef, {
        status: 'cancelled',
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

export const getUsageLimits = async (userId) => {
  try {
    if (!userId) {
      return {
        success: true,
        scansRemaining: 5,
        downloadsRemaining: 5,
        lastResetTime: Date.now(),
        hoursUntilReset: 12,
      };
    }

    const subscription = await getUserSubscription(userId);
    
    if (subscription.tier === 'premium' && subscription.isActive) {
      return {
        success: true,
        tier: 'premium',
        scansRemaining: Infinity,
        downloadsRemaining: Infinity,
        unlimited: true,
      };
    }

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
        
        console.log('🔄 Usage limits auto-reset (12 hours passed)');
        
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

    console.log(`✅ Scan count: ${newCount} remaining`);

    return {
      success: true,
      scansRemaining: newCount,
      downloadsRemaining: usage.downloadsRemaining,
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

    console.log(`✅ Download count: ${newCount} remaining`);

    return {
      success: true,
      scansRemaining: usage.scansRemaining,
      downloadsRemaining: newCount,
      hoursUntilReset: usage.hoursUntilReset,
    };
  } catch (error) {
    console.error('❌ Error decrementing download count:', error);
    return { success: false, error: error.message };
  }
};

export const canDownload = async (userId) => {
  try {
    const usage = await getUsageLimits(userId);
    
    if (usage.unlimited) {
      return { 
        success: true, 
        canDownload: true, 
        unlimited: true 
      };
    }

    return {
      success: true,
      canDownload: usage.downloadsRemaining > 0,
      downloadsRemaining: usage.downloadsRemaining,
      hoursUntilReset: usage.hoursUntilReset,
    };
  } catch (error) {
    console.error('❌ Error checking download limit:', error);
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

    console.log('🔄 Usage limits manually reset');
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
      
      const subscriptionRef = doc(db, 'users', userDoc.id, 'subscription', SUBSCRIPTION_DOC_ID);
      const subDoc = await getDoc(subscriptionRef);
      
      if (subDoc.exists()) {
        const data = subDoc.data();
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