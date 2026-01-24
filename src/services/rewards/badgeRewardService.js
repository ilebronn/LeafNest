// services/rewards/badgeRewardService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  CLAIMED_BADGES: '@leafnest_claimed_badges_',
  ACTIVE_BADGE: '@leafnest_active_badge_',
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