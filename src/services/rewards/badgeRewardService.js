// services/rewards/badgeRewardService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, doc, setDoc, getDoc } from '@config/firebase';

const STORAGE_KEYS = {
  CLAIMED_BADGES: '@leafnest_claimed_badges_',
  ACTIVE_BADGE: '@leafnest_active_badge_',
};

const PRIVATE_REWARDS_DOC = (uid) => doc(db, 'users', uid, 'profile', 'rewards');
const PUBLIC_REWARDS_DOC = (uid) => doc(db, 'users', uid, 'profile', 'publicRewards');

const updatePublicRewards = async (userId, patch) => {
  try {
    if (!userId || userId === 'guest') return;
    await setDoc(
      PUBLIC_REWARDS_DOC(userId),
      {
        ...patch,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Failed to update public rewards (badge):', error?.message);
  }
};

// Define available badges tied to achievements
export const ACHIEVEMENT_BADGES = {
  beginner: {
    id: 'beginner',
    name: 'Seedling',
    icon: 'leaf',
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
    requirement: '10 scans',
    description: 'Started your plant journey',
  },
  explorer: {
    id: 'explorer',
    name: 'Explorer',
    icon: 'compass',
    color: '#2196F3',
    backgroundColor: '#E3F2FD',
    requirement: '50 scans',
    description: 'Discovered many species',
  },
  collector: {
    id: 'collector',
    name: 'Collector',
    icon: 'albums',
    color: '#9C27B0',
    backgroundColor: '#F3E5F5',
    requirement: '25 species',
    description: 'Built a diverse collection',
  },
  streak: {
    id: 'streak',
    name: 'Dedicated',
    icon: 'flame',
    color: '#FF5722',
    backgroundColor: '#FBE9E7',
    requirement: '7 in a week',
    description: 'Maintained scanning streak',
  },
};

/**
 * Get all claimed badges for a user
 */
export const getClaimedBadges = async (userId) => {
  try {
    const key = `${STORAGE_KEYS.CLAIMED_BADGES}${userId}`;
    const data = await AsyncStorage.getItem(key);
    const badges = data ? JSON.parse(data) : [];
    
    return {
      success: true,
      badges,
    };
  } catch (error) {
    console.error('Error getting claimed badges:', error);
    return {
      success: false,
      error: error.message,
      badges: [],
    };
  }
};

/**
 * Get the active badge for a user
 */
export const getActiveBadge = async (userId) => {
  try {
    const key = `${STORAGE_KEYS.ACTIVE_BADGE}${userId}`;
    const data = await AsyncStorage.getItem(key);
    
    if (data) {
      const badgeId = JSON.parse(data);
      const badge = ACHIEVEMENT_BADGES[badgeId];
      
      return {
        success: true,
        badge: badge || null,
      };
    }
    
    return {
      success: true,
      badge: null,
    };
  } catch (error) {
    console.error('Error getting active badge:', error);
    return {
      success: false,
      error: error.message,
      badge: null,
    };
  }
};

/**
 * Claim a badge (after unlocking achievement)
 */
export const claimBadge = async (userId, badgeId) => {
  try {
    if (!ACHIEVEMENT_BADGES[badgeId]) {
      return {
        success: false,
        error: 'Invalid badge ID',
      };
    }

    const key = `${STORAGE_KEYS.CLAIMED_BADGES}${userId}`;
    const data = await AsyncStorage.getItem(key);
    const claimedBadges = data ? JSON.parse(data) : [];
    
    // Check if already claimed
    if (claimedBadges.includes(badgeId)) {
      return {
        success: false,
        error: 'Badge already claimed',
      };
    }
    
    // Add to claimed badges
    claimedBadges.push(badgeId);
    await AsyncStorage.setItem(key, JSON.stringify(claimedBadges));

    try {
      await setDoc(
        PRIVATE_REWARDS_DOC(userId),
        {
          claimedBadges,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (syncError) {
      console.warn('Firestore badge sync failed (claim):', syncError?.message);
    }
    
    console.log(`✅ Badge claimed: ${badgeId} for user ${userId}`);
    
    return {
      success: true,
      badge: ACHIEVEMENT_BADGES[badgeId],
    };
  } catch (error) {
    console.error('Error claiming badge:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Set a badge as active (displayed on profile)
 */
export const setActiveBadge = async (userId, badgeId) => {
  try {
    // Verify badge is claimed
    const claimedResult = await getClaimedBadges(userId);
    if (!claimedResult.success || !claimedResult.badges.includes(badgeId)) {
      return {
        success: false,
        error: 'Badge not claimed yet',
      };
    }
    
    const key = `${STORAGE_KEYS.ACTIVE_BADGE}${userId}`;
    await AsyncStorage.setItem(key, JSON.stringify(badgeId));

    try {
      await setDoc(
        PRIVATE_REWARDS_DOC(userId),
        {
          activeBadge: badgeId,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (syncError) {
      console.warn('Firestore badge sync failed (active):', syncError?.message);
    }

    await updatePublicRewards(userId, { activeBadge: badgeId });
    
    console.log(`✅ Active badge set: ${badgeId} for user ${userId}`);
    
    return {
      success: true,
      badge: ACHIEVEMENT_BADGES[badgeId],
    };
  } catch (error) {
    console.error('Error setting active badge:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Remove active badge (set to none)
 */
export const removeActiveBadge = async (userId) => {
  try {
    const key = `${STORAGE_KEYS.ACTIVE_BADGE}${userId}`;
    await AsyncStorage.removeItem(key);

    try {
      await setDoc(
        PRIVATE_REWARDS_DOC(userId),
        {
          activeBadge: null,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (syncError) {
      console.warn('Firestore badge sync failed (remove):', syncError?.message);
    }

    await updatePublicRewards(userId, { activeBadge: null });
    
    console.log(`✅ Active badge removed for user ${userId}`);
    
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error removing active badge:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Sync badge rewards from Firestore into local storage
 */
export const syncBadgesFromFirestore = async (userId) => {
  try {
    if (!userId || userId === 'guest') {
      return { success: false };
    }

    const rewardsDoc = await getDoc(PRIVATE_REWARDS_DOC(userId));
    if (!rewardsDoc.exists()) {
      // No Firestore data yet: push local data up for cross-device sync
      const claimedKey = `${STORAGE_KEYS.CLAIMED_BADGES}${userId}`;
      const activeKey = `${STORAGE_KEYS.ACTIVE_BADGE}${userId}`;
      const localClaimedRaw = await AsyncStorage.getItem(claimedKey);
      const localActiveRaw = await AsyncStorage.getItem(activeKey);
      const localClaimedBadges = localClaimedRaw ? JSON.parse(localClaimedRaw) : [];
      const localActiveBadge = localActiveRaw ? JSON.parse(localActiveRaw) : null;

      if (localClaimedBadges.length > 0 || localActiveBadge) {
        await setDoc(
          PRIVATE_REWARDS_DOC(userId),
          {
            claimedBadges: localClaimedBadges,
            activeBadge: localActiveBadge,
            lastUpdated: new Date().toISOString(),
          },
          { merge: true }
        );

        await updatePublicRewards(userId, { activeBadge: localActiveBadge || null });
        console.log('Badge rewards synced from local storage');
        return { success: true, source: 'local' };
      }

      return { success: false, error: 'No rewards data found' };
    }

    const data = rewardsDoc.data() || {};

    if (Array.isArray(data.claimedBadges)) {
      const claimedKey = `${STORAGE_KEYS.CLAIMED_BADGES}${userId}`;
      await AsyncStorage.setItem(claimedKey, JSON.stringify(data.claimedBadges));
    }

    if (data.activeBadge !== undefined) {
      const activeKey = `${STORAGE_KEYS.ACTIVE_BADGE}${userId}`;
      if (data.activeBadge) {
        await AsyncStorage.setItem(activeKey, JSON.stringify(data.activeBadge));
      } else {
        await AsyncStorage.removeItem(activeKey);
      }

      await updatePublicRewards(userId, { activeBadge: data.activeBadge || null });
    }

    console.log('Badge rewards synced from Firestore');
    return { success: true };
  } catch (error) {
    console.error('Error syncing badges from Firestore:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if user can claim a badge based on achievement
 */
export const canClaimBadge = async (userId, badgeId, stats) => {
  try {
    // Check if already claimed
    const claimedResult = await getClaimedBadges(userId);
    if (claimedResult.badges.includes(badgeId)) {
      return { canClaim: false, reason: 'Already claimed' };
    }
    
    // Check achievement requirements
    const requirements = {
      beginner: stats.totalScans >= 10,
      explorer: stats.totalScans >= 50,
      collector: stats.uniqueSpecies >= 25,
      streak: stats.weekScans >= 7,
    };
    
    const canClaim = requirements[badgeId] || false;
    
    return {
      canClaim,
      reason: canClaim ? 'Requirements met' : 'Requirements not met',
    };
  } catch (error) {
    console.error('Error checking badge claim eligibility:', error);
    return {
      canClaim: false,
      reason: error.message,
    };
  }
};
