// services/rewards/borderRewardService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, doc, setDoc, getDoc } from '@config/firebase';

// Storage keys
const CLAIMED_BORDERS_KEY = (uid) => `claimed_borders_${uid}`;
const ACTIVE_BORDER_KEY = (uid) => `active_border_${uid}`;
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
    console.warn('Failed to update public rewards:', error?.message);
  }
};

// ==================== ENHANCED BORDER DEFINITIONS ====================

export const ACHIEVEMENT_BORDERS = {
  beginner: {
    id: 'beginner',
    name: 'Beginner Explorer',
    achievementId: 'beginner',
    type: 'image',
    image: require('@assets/images/borders/beginner-border.gif'),
    animated: false,
    width: 8,
    requirement: { type: 'totalScans', value: 10 },
  },
  explorer: {
    id: 'explorer',
    name: 'Expert Explorer',
    achievementId: 'explorer',
    type: 'image',
    image: require('@assets/images/borders/explorer-border.gif'),
    animated: false,
    width: 8,
    requirement: { type: 'totalScans', value: 50 },
  },
  collector: {
    id: 'collector',
    name: 'Species Collector',
    achievementId: 'collector',
    type: 'image',
    image: require('@assets/images/borders/collector-border.gif'),
    animated: false,
    width: 8,
    requirement: { type: 'uniqueSpecies', value: 25 },
  },
  streak: {
    id: 'streak',
    name: 'Weekly Warrior',
    achievementId: 'streak',
    type: 'image',
    image: require('@assets/images/borders/streak-border.gif'),
    animated: false,
    width: 9,
    requirement: { type: 'weekScans', value: 7 },
  },
  legendary: {
    id: 'legendary',
    name: 'Legendary Botanist',
    achievementId: 'legendary',
    type: 'image',
    image: require('@assets/images/borders/legendary-border.gif'),
    animated: false,
    width: 10,
    requirement: { type: 'totalScans', value: 100 },
  },
  rainbow: {
    id: 'rainbow',
    name: 'Rainbow Master',
    achievementId: 'rainbow',
    type: 'image',
    image: require('@assets/images/borders/rainbow-border.gif'),
    animated: false,
    width: 10,
    requirement: { type: 'uniqueSpecies', value: 50 },
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond Elite',
    achievementId: 'diamond',
    type: 'image',
    image: require('@assets/images/borders/diamond-border.gif'),
    animated: false,
    width: 9,
    requirement: { type: 'totalScans', value: 200 },
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Guardian',
    achievementId: 'emerald',
    type: 'image',
    image: require('@assets/images/borders/emerald-border.gif'),
    animated: false,
    width: 8,
    requirement: { type: 'uniqueSpecies', value: 75 },
  },
  phoenix: {
    id: 'phoenix',
    name: 'Phoenix Rising',
    achievementId: 'phoenix',
    type: 'image',
    image: require('@assets/images/borders/phoenix-border.gif'),
    animated: false,
    width: 11,
    requirement: { type: 'weekScans', value: 14 },
  },
  cosmic: {
    id: 'cosmic',
    name: 'Cosmic Explorer',
    achievementId: 'cosmic',
    type: 'image',
    image: require('@assets/images/borders/cosmic-border.gif'),
    animated: false,
    width: 10,
    requirement: { type: 'totalScans', value: 500 },
  },
  // Gradient example for future use
  gradientExample: {
    id: 'gradientExample',
    name: 'Gradient Border',
    achievementId: 'gradientExample',
    type: 'gradient',
    width: 7,
    animated: false,
    requirement: { type: 'totalScans', value: 1 },
  },
};

// ==================== CLAIM BORDER ====================

export const claimBorder = async (userId, borderId) => {
  try {
    if (!userId || userId === 'guest') {
      return { success: false, error: 'Guest users cannot claim borders' };
    }

    const border = ACHIEVEMENT_BORDERS[borderId];
    if (!border) {
      return { success: false, error: 'Invalid border ID' };
    }

    // Get claimed borders
    const claimedKey = CLAIMED_BORDERS_KEY(userId);
    const existing = await AsyncStorage.getItem(claimedKey);
    const claimedBorders = existing ? JSON.parse(existing) : [];

    // Check if already claimed
    if (claimedBorders.includes(borderId)) {
      return { success: false, error: 'Border already claimed' };
    }

    // Add to claimed list
    claimedBorders.push(borderId);
    await AsyncStorage.setItem(claimedKey, JSON.stringify(claimedBorders));

    // Sync to Firestore in background
    try {
      const borderDataRef = doc(db, 'users', userId, 'profile', 'borders');
      await setDoc(
        borderDataRef,
        {
          claimedBorders: claimedBorders,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('⚠️ Firestore sync failed (non-critical):', error);
    }

    console.log(`✅ Border claimed: ${borderId}`);
    return { success: true, borderId };
  } catch (error) {
    console.error('❌ Error claiming border:', error);
    return { success: false, error: error.message };
  }
};

// ==================== SET ACTIVE BORDER ====================

export const setActiveBorder = async (userId, borderId) => {
  try {
    if (!userId || userId === 'guest') {
      return { success: false, error: 'Guest users cannot set active borders' };
    }

    // Verify border is claimed
    const claimedKey = CLAIMED_BORDERS_KEY(userId);
    const existing = await AsyncStorage.getItem(claimedKey);
    const claimedBorders = existing ? JSON.parse(existing) : [];

    if (borderId && !claimedBorders.includes(borderId)) {
      return { success: false, error: 'Border not claimed' };
    }

    // Set active border (null = remove border)
    const activeKey = ACTIVE_BORDER_KEY(userId);
    if (borderId) {
      await AsyncStorage.setItem(activeKey, borderId);
    } else {
      await AsyncStorage.removeItem(activeKey);
    }

    // Sync to Firestore in background
    try {
      const borderDataRef = doc(db, 'users', userId, 'profile', 'borders');
      await setDoc(
        borderDataRef,
        {
          activeBorder: borderId || null,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn('⚠️ Firestore sync failed (non-critical):', error);
    }

    console.log(`✅ Active border set: ${borderId || 'none'}`);
    return { success: true, borderId };
  } catch (error) {
    console.error('❌ Error setting active border:', error);
    return { success: false, error: error.message };
  }
};

// ==================== GET CLAIMED BORDERS ====================

export const getClaimedBorders = async (userId) => {
  try {
    if (!userId || userId === 'guest') {
      return { success: true, borders: [] };
    }

    const claimedKey = CLAIMED_BORDERS_KEY(userId);
    const existing = await AsyncStorage.getItem(claimedKey);
    const claimedBorders = existing ? JSON.parse(existing) : [];

    return { success: true, borders: claimedBorders };
  } catch (error) {
    console.error('❌ Error getting claimed borders:', error);
    return { success: false, borders: [] };
  }
};

// ==================== GET ACTIVE BORDER ====================

export const getActiveBorder = async (userId) => {
  try {
    if (!userId || userId === 'guest') {
      return { success: true, border: null };
    }

    const activeKey = ACTIVE_BORDER_KEY(userId);
    const activeBorderId = await AsyncStorage.getItem(activeKey);

    if (!activeBorderId) {
      return { success: true, border: null };
    }

    const border = ACHIEVEMENT_BORDERS[activeBorderId];
    return { success: true, border };
  } catch (error) {
    console.error('❌ Error getting active border:', error);
    return { success: false, border: null };
  }
};

// ==================== SYNC FROM FIRESTORE ====================

export const syncBordersFromFirestore = async (userId) => {
  try {
    if (!userId || userId === 'guest') {
      return { success: false };
    }

    const borderDataRef = doc(db, 'users', userId, 'profile', 'borders');
    const borderDoc = await getDoc(borderDataRef);

    if (borderDoc.exists()) {
      const data = borderDoc.data();

      // Sync claimed borders
      if (data.claimedBorders) {
        const claimedKey = CLAIMED_BORDERS_KEY(userId);
        await AsyncStorage.setItem(
          claimedKey,
          JSON.stringify(data.claimedBorders)
        );
      }

      // Sync active border
      if (data.activeBorder !== undefined) {
        const activeKey = ACTIVE_BORDER_KEY(userId);
        if (data.activeBorder) {
          await AsyncStorage.setItem(activeKey, data.activeBorder);
        } else {
          await AsyncStorage.removeItem(activeKey);
        }

        await updatePublicRewards(userId, { activeBorder: data.activeBorder || null });
      }

      console.log('✅ Borders synced from Firestore');
      return { success: true };
    }

    // No Firestore data yet: push local data up so other devices can see it
    const claimedKey = CLAIMED_BORDERS_KEY(userId);
    const activeKey = ACTIVE_BORDER_KEY(userId);
    const localClaimedRaw = await AsyncStorage.getItem(claimedKey);
    const localActiveRaw = await AsyncStorage.getItem(activeKey);
    const localClaimedBorders = localClaimedRaw ? JSON.parse(localClaimedRaw) : [];
    const localActiveBorder = localActiveRaw || null;

    if (localClaimedBorders.length > 0 || localActiveBorder) {
      await setDoc(
        borderDataRef,
        {
          claimedBorders: localClaimedBorders,
          activeBorder: localActiveBorder,
          lastUpdated: new Date().toISOString(),
        },
        { merge: true }
      );

      await updatePublicRewards(userId, { activeBorder: localActiveBorder || null });
      console.log('Borders synced from local storage');
      return { success: true, source: 'local' };
    }

    return { success: false, error: 'No border data found' };
  } catch (error) {
    console.error('❌ Error syncing borders:', error);
    return { success: false, error: error.message };
  }
};

// ==================== CHECK IF BORDER UNLOCKED ====================

export const isBorderUnlocked = (borderId, stats) => {
  const border = ACHIEVEMENT_BORDERS[borderId];
  if (!border || !stats) return false;

  const { type, value } = border.requirement;
  const current = stats[type] || 0;

  return current >= value;
};

// ==================== GET BORDER PROGRESS ====================

export const getBorderProgress = (borderId, stats) => {
  const border = ACHIEVEMENT_BORDERS[borderId];
  if (!border || !stats) return { current: 0, target: 0, percentage: 0 };

  const { type, value } = border.requirement;
  const current = Math.min(stats[type] || 0, value);
  const percentage = Math.min((current / value) * 100, 100);

  return { current, target: value, percentage };
};

// ==================== GET ALL BORDERS WITH STATUS ====================

export const getAllBordersWithStatus = async (userId, stats) => {
  try {
    const { success: claimedSuccess, borders: claimedBorders } = await getClaimedBorders(userId);
    const { success: activeSuccess, border: activeBorder } = await getActiveBorder(userId);
    
    if (!claimedSuccess || !activeSuccess) {
      return { success: false, borders: [] };
    }

    const bordersWithStatus = Object.keys(ACHIEVEMENT_BORDERS).map(borderId => {
      const border = ACHIEVEMENT_BORDERS[borderId];
      const isClaimed = claimedBorders.includes(borderId);
      const isActive = activeBorder?.id === borderId;
      const isUnlocked = isClaimed || isBorderUnlocked(borderId, stats);
      
      return {
        ...border,
        isClaimed,
        isActive,
        isUnlocked,
        progress: getBorderProgress(borderId, stats)
      };
    });

    return { success: true, borders: bordersWithStatus };
  } catch (error) {
    console.error('❌ Error getting borders with status:', error);
    return { success: false, borders: [] };
  }
};

// ==================== CHECK FOR NEWLY UNLOCKED BORDERS ====================

export const checkForNewlyUnlockedBorders = async (userId, stats) => {
  try {
    if (!userId || userId === 'guest') {
      return { success: true, newlyUnlocked: [] };
    }

    const { success, borders: claimedBorders } = await getClaimedBorders(userId);
    if (!success) return { success: false, newlyUnlocked: [] };

    const newlyUnlocked = [];
    
    // Check each border that hasn't been claimed yet
    for (const borderId in ACHIEVEMENT_BORDERS) {
      if (!claimedBorders.includes(borderId)) {
        const isUnlocked = isBorderUnlocked(borderId, stats);
        if (isUnlocked) {
          newlyUnlocked.push(borderId);
        }
      }
    }

    return { success: true, newlyUnlocked };
  } catch (error) {
    console.error('❌ Error checking for newly unlocked borders:', error);
    return { success: false, newlyUnlocked: [] };
  }
};
