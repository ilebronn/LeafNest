// firestoreService/notificationService.js - WITH ACHIEVEMENT SYSTEM
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  deleteDoc,
  getDoc,
  limit,
  setDoc
} from 'firebase/firestore';
import { db, auth } from '@config/firebase';

// ==================== NOTIFICATION TYPES ====================
export const NOTIFICATION_TYPES = {
  LIKE: 'like',
  COMMENT: 'comment',
  DOWNLOAD: 'download',
  FOLLOW: 'follow',
  ACHIEVEMENT: 'achievement',
  WEEKLY_REPORT: 'weekly_report',
  TIP: 'tip',
  SYSTEM: 'system',
};

// ==================== ACHIEVEMENT DEFINITIONS ====================
const ACHIEVEMENTS = {
  BEGINNER: {
    id: 'beginner',
    title: 'Beginner Scanner',
    description: 'Complete your first 10 scans',
    icon: 'star',
    color: '#FFD700',
    requirement: { type: 'totalScans', value: 10 },
  },
  EXPLORER: {
    id: 'explorer',
    title: 'Nature Explorer',
    description: 'Complete 50 scans',
    icon: 'trophy',
    color: '#FFD700',
    requirement: { type: 'totalScans', value: 50 },
  },
  MASTER: {
    id: 'master',
    title: 'Master Scanner',
    description: 'Complete 100 scans',
    icon: 'ribbon',
    color: '#FFD700',
    requirement: { type: 'totalScans', value: 100 },
  },
  COLLECTOR: {
    id: 'collector',
    title: 'Species Collector',
    description: 'Discover 25 unique species',
    icon: 'sparkles',
    color: '#9C27B0',
    requirement: { type: 'uniqueSpecies', value: 25 },
  },
  NATURALIST: {
    id: 'naturalist',
    title: 'True Naturalist',
    description: 'Discover 50 unique species',
    icon: 'flower',
    color: '#9C27B0',
    requirement: { type: 'uniqueSpecies', value: 50 },
  },
  STREAK_7: {
    id: 'streak_7',
    title: 'Weekly Warrior',
    description: 'Scan 7 times in one week',
    icon: 'flame',
    color: '#FF4500',
    requirement: { type: 'weekScans', value: 7 },
  },
  STREAK_30: {
    id: 'streak_30',
    title: 'Monthly Master',
    description: 'Scan 30 times in one month',
    icon: 'flame',
    color: '#FF6B6B',
    requirement: { type: 'monthScans', value: 30 },
  },
  DAILY_STREAK_7: {
    id: 'daily_streak_7',
    title: 'Week Streak',
    description: 'Scan every day for a week',
    icon: 'calendar',
    color: '#2196F3',
    requirement: { type: 'dailyStreak', value: 7 },
  },
};

// ==================== CHECK NOTIFICATION SETTINGS ====================
const isNotificationEnabled = async (userId, notificationType) => {
  try {
    const userSettingsRef = doc(db, 'users', userId, 'settings', 'notifications');
    const userSettingsDoc = await getDoc(userSettingsRef);
    
    if (!userSettingsDoc.exists()) {
      return true; // Default: enabled
    }

    const settings = userSettingsDoc.data();

    switch (notificationType) {
      case NOTIFICATION_TYPES.LIKE:
        return settings.pushNotifications !== false && settings.likes !== false;
      
      case NOTIFICATION_TYPES.COMMENT:
        return settings.pushNotifications !== false && settings.comments !== false;
      
      case NOTIFICATION_TYPES.DOWNLOAD:
        return settings.pushNotifications !== false && settings.downloads !== false;
      
      case NOTIFICATION_TYPES.ACHIEVEMENT:
        return settings.achievements !== false;
      
      case NOTIFICATION_TYPES.WEEKLY_REPORT:
        return settings.weeklyReport !== false;
      
      case NOTIFICATION_TYPES.TIP:
        return settings.tips !== false;
      
      case NOTIFICATION_TYPES.SYSTEM:
        return settings.systemUpdates !== false;
      
      default:
        return settings.pushNotifications !== false;
    }
  } catch (error) {
    console.error('❌ Error checking notification settings:', error);
    return true;
  }
};

// ==================== ACHIEVEMENT SYSTEM ====================

/**
 * Get user's unlocked achievements from Firestore
 */
const getUserAchievements = async (userId) => {
  try {
    const achievementsRef = doc(db, 'users', userId, 'progress', 'achievements');
    const achievementsDoc = await getDoc(achievementsRef);
    
    if (achievementsDoc.exists()) {
      return achievementsDoc.data().unlocked || [];
    }
    return [];
  } catch (error) {
    console.error('❌ Error getting achievements:', error);
    return [];
  }
};

/**
 * Mark achievement as unlocked in Firestore
 */
const markAchievementUnlocked = async (userId, achievementId) => {
  try {
    const achievementsRef = doc(db, 'users', userId, 'progress', 'achievements');
    const achievementsDoc = await getDoc(achievementsRef);
    
    const unlocked = achievementsDoc.exists() 
      ? (achievementsDoc.data().unlocked || [])
      : [];
    
    if (!unlocked.includes(achievementId)) {
      unlocked.push(achievementId);
      
      await setDoc(achievementsRef, {
        unlocked,
        lastUpdated: serverTimestamp(),
      });
      
      return true;
    }
    
    return false; // Already unlocked
  } catch (error) {
    console.error('❌ Error marking achievement:', error);
    return false;
  }
};

/**
 * Check if user qualifies for any new achievements
 * Call this after each scan is recorded
 */
export const checkAndAwardAchievements = async (userId, stats) => {
  try {
    if (!userId || userId === 'guest') {
      return { success: false, message: 'Guest users cannot earn achievements' };
    }

    // Check if achievements are enabled
    const isEnabled = await isNotificationEnabled(userId, NOTIFICATION_TYPES.ACHIEVEMENT);
    if (!isEnabled) {
      console.log('⚠️ Achievement notifications are disabled');
      return { success: true, skipped: true };
    }

    // Get already unlocked achievements
    const unlockedAchievements = await getUserAchievements(userId);
    const newlyUnlocked = [];

    // Check each achievement
    for (const achievement of Object.values(ACHIEVEMENTS)) {
      // Skip if already unlocked
      if (unlockedAchievements.includes(achievement.id)) {
        continue;
      }

      // Check if requirement is met
      const { type, value } = achievement.requirement;
      const userValue = stats[type] || 0;

      if (userValue >= value) {
        // Achievement unlocked! Mark it and create notification
        const wasMarked = await markAchievementUnlocked(userId, achievement.id);
        
        if (wasMarked) {
          await createAchievementNotification(
            userId,
            achievement.title,
            achievement.description,
            achievement.icon,
            achievement.color
          );
          
          newlyUnlocked.push(achievement.id);
          console.log(`🏆 Achievement unlocked: ${achievement.title}`);
        }
      }
    }

    return { 
      success: true, 
      newlyUnlocked,
      count: newlyUnlocked.length 
    };
  } catch (error) {
    console.error('❌ Error checking achievements:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Create an achievement notification
 */
export const createAchievementNotification = async (
  userId, 
  achievementTitle, 
  achievementMessage,
  achievementIcon = 'trophy',
  achievementColor = '#FFD700'
) => {
  try {
    const isEnabled = await isNotificationEnabled(userId, NOTIFICATION_TYPES.ACHIEVEMENT);
    if (!isEnabled) {
      console.log('⚠️ Achievement notifications are disabled');
      return { success: true, skipped: true };
    }

    const notificationsRef = collection(db, 'notifications');
    
    const notificationData = {
      type: NOTIFICATION_TYPES.ACHIEVEMENT,
      recipientId: userId,
      senderId: 'system',
      senderUsername: 'LeafNest',
      message: `🏆 ${achievementTitle}`,
      achievementTitle: achievementTitle,
      achievementDescription: achievementMessage,
      achievementIcon: achievementIcon,
      achievementColor: achievementColor,
      timestamp: serverTimestamp(),
      read: false,
    };

    await addDoc(notificationsRef, notificationData);
    console.log('✅ Achievement notification created');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating achievement notification:', error);
    return { success: false, error: error.message };
  }
};

// ==================== WEEKLY REPORT NOTIFICATION ====================

/**
 * Create weekly report notification
 * Call this via scheduled job (e.g., every Monday)
 */
export const createWeeklyReportNotification = async (userId, reportData) => {
  try {
    const isEnabled = await isNotificationEnabled(userId, NOTIFICATION_TYPES.WEEKLY_REPORT);
    if (!isEnabled) {
      console.log('⚠️ Weekly report notifications are disabled');
      return { success: true, skipped: true };
    }

    const notificationsRef = collection(db, 'notifications');
    
    const { totalScans, newSpecies, topSpecies, comparedToLastWeek } = reportData;
    
    const message = `Your weekly summary: ${totalScans} scans, ${newSpecies} new species discovered!`;
    
    const notificationData = {
      type: NOTIFICATION_TYPES.WEEKLY_REPORT,
      recipientId: userId,
      senderId: 'system',
      senderUsername: 'LeafNest',
      message: message,
      reportData: {
        totalScans,
        newSpecies,
        topSpecies,
        comparedToLastWeek,
      },
      timestamp: serverTimestamp(),
      read: false,
    };

    await addDoc(notificationsRef, notificationData);
    console.log('✅ Weekly report notification created');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating weekly report notification:', error);
    return { success: false, error: error.message };
  }
};

// ==================== TIPS & TRICKS NOTIFICATION ====================

/**
 * Create tip notification
 */
export const createTipNotification = async (userId, tipTitle, tipContent) => {
  try {
    const isEnabled = await isNotificationEnabled(userId, NOTIFICATION_TYPES.TIP);
    if (!isEnabled) {
      console.log('⚠️ Tip notifications are disabled');
      return { success: true, skipped: true };
    }

    const notificationsRef = collection(db, 'notifications');
    
    const notificationData = {
      type: NOTIFICATION_TYPES.TIP,
      recipientId: userId,
      senderId: 'system',
      senderUsername: 'LeafNest',
      message: tipTitle,
      tipContent: tipContent,
      timestamp: serverTimestamp(),
      read: false,
    };

    await addDoc(notificationsRef, notificationData);
    console.log('✅ Tip notification created');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating tip notification:', error);
    return { success: false, error: error.message };
  }
};

// ==================== SYSTEM UPDATE NOTIFICATION ====================

/**
 * Create system update notification
 */
export const createSystemNotification = async (userId, message, title = null, updateDetails = null) => {
  try {
    const isEnabled = await isNotificationEnabled(userId, NOTIFICATION_TYPES.SYSTEM);
    if (!isEnabled) {
      console.log('⚠️ System notifications are disabled');
      return { success: true, skipped: true };
    }

    const notificationsRef = collection(db, 'notifications');
    
    const notificationData = {
      type: NOTIFICATION_TYPES.SYSTEM,
      recipientId: userId,
      senderId: 'system',
      senderUsername: 'LeafNest',
      message: message,
      systemTitle: title,
      updateDetails: updateDetails,
      timestamp: serverTimestamp(),
      read: false,
    };

    await addDoc(notificationsRef, notificationData);
    console.log('✅ System notification created');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating system notification:', error);
    return { success: false, error: error.message };
  }
};

// ==================== EXISTING NOTIFICATION FUNCTIONS ====================
// (Keep all your existing createLikeNotification, createCommentNotification, etc.)

export const createLikeNotification = async (postId, postOwnerId, likerUserId, likerUsername, postData) => {
  try {
    if (postOwnerId === likerUserId) return { success: true, skipped: true };

    const isEnabled = await isNotificationEnabled(postOwnerId, NOTIFICATION_TYPES.LIKE);
    if (!isEnabled) return { success: true, skipped: true };

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientId', '==', postOwnerId),
      where('postId', '==', postId),
      where('senderId', '==', likerUserId),
      where('type', '==', NOTIFICATION_TYPES.LIKE),
      limit(1)
    );
    
    const existingNotifs = await getDocs(q);
    if (!existingNotifs.empty) {
      const existingDoc = existingNotifs.docs[0];
      await updateDoc(doc(db, 'notifications', existingDoc.id), {
        timestamp: serverTimestamp(),
        read: false,
      });
      return { success: true, updated: true };
    }

    const notificationData = {
      type: NOTIFICATION_TYPES.LIKE,
      recipientId: postOwnerId,
      senderId: likerUserId,
      senderUsername: likerUsername,
      postId: postId,
      postImageUrl: postData.imageUrl || null,
      postName: postData.name || postData.scientificName || 'your post',
      message: `${likerUsername} liked your post`,
      timestamp: serverTimestamp(),
      read: false,
    };

    await addDoc(notificationsRef, notificationData);
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating like notification:', error);
    return { success: false, error: error.message };
  }
};

export const createCommentNotification = async (postId, postOwnerId, commenterUserId, commenterUsername, commentText, postData) => {
  try {
    if (postOwnerId === commenterUserId) return { success: true, skipped: true };

    const isEnabled = await isNotificationEnabled(postOwnerId, NOTIFICATION_TYPES.COMMENT);
    if (!isEnabled) return { success: true, skipped: true };

    const notificationsRef = collection(db, 'notifications');
    
    const notificationData = {
      type: NOTIFICATION_TYPES.COMMENT,
      recipientId: postOwnerId,
      senderId: commenterUserId,
      senderUsername: commenterUsername,
      postId: postId,
      postImageUrl: postData.imageUrl || null,
      postName: postData.name || postData.scientificName || 'your post',
      commentText: commentText.substring(0, 100),
      message: `${commenterUsername} commented on your post`,
      timestamp: serverTimestamp(),
      read: false,
    };

    await addDoc(notificationsRef, notificationData);
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating comment notification:', error);
    return { success: false, error: error.message };
  }
};

export const createDownloadNotification = async (postId, postOwnerId, downloaderUserId, downloaderUsername, postData) => {
  try {
    if (postOwnerId === downloaderUserId) return { success: true, skipped: true };

    const isEnabled = await isNotificationEnabled(postOwnerId, NOTIFICATION_TYPES.DOWNLOAD);
    if (!isEnabled) return { success: true, skipped: true };

    const notificationsRef = collection(db, 'notifications');
    
    const notificationData = {
      type: NOTIFICATION_TYPES.DOWNLOAD,
      recipientId: postOwnerId,
      senderId: downloaderUserId,
      senderUsername: downloaderUsername,
      postId: postId,
      postImageUrl: postData.imageUrl || null,
      postName: postData.name || postData.scientificName || 'your post',
      message: `${downloaderUsername} downloaded your post`,
      timestamp: serverTimestamp(),
      read: false,
    };

    await addDoc(notificationsRef, notificationData);
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating download notification:', error);
    return { success: false, error: error.message };
  }
};

// ==================== GET/MARK/DELETE NOTIFICATIONS ====================
// (Keep all your existing functions)

export const getUserNotifications = async (userId, limitCount = 50) => {
  try {
    if (!userId) return { success: false, data: [], error: 'User ID required' };

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const notifications = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        ...data,
        createdAt: data.timestamp?.toMillis() || Date.now(),
      });
    });

    return { success: true, data: notifications };
  } catch (error) {
    console.error('❌ Error getting notifications:', error);
    return { success: false, data: [], error: error.message };
  }
};

export const getUnreadNotificationCount = async (userId) => {
  try {
    // ✅ FIXED: Return early if no user
    if (!userId) {
      console.log('ℹ️ No user logged in, skipping unread count');
      return { success: true, count: 0 };  // Changed from success: false
    }

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientId', '==', userId),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);
    return { success: true, count: querySnapshot.size };
  } catch (error) {
    console.error('❌ Error getting unread count:', error);
    return { success: true, count: 0 };  // ✅ Also changed this to success: true
  }
};

export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    return { success: false, error: error.message };
  }
};

export const markAllNotificationsAsRead = async (userId) => {
  try {
    if (!userId) return { success: false, error: 'User ID required' };

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('recipientId', '==', userId),
      where('read', '==', false)
    );

    const querySnapshot = await getDocs(q);
    const updatePromises = querySnapshot.docs.map(doc =>
      updateDoc(doc.ref, {
        read: true,
        readAt: serverTimestamp(),
      })
    );

    await Promise.all(updatePromises);
    return { success: true, count: querySnapshot.size };
  } catch (error) {
    console.error('❌ Error marking all as read:', error);
    return { success: false, error: error.message };
  }
};

export const deleteNotification = async (notificationId) => {
  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    return { success: false, error: error.message };
  }
};

export const deleteAllNotifications = async (userId) => {
  try {
    if (!userId) return { success: false, error: 'User ID required' };

    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('recipientId', '==', userId));

    const querySnapshot = await getDocs(q);
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return { success: true, count: querySnapshot.size };
  } catch (error) {
    console.error('❌ Error deleting all notifications:', error);
    return { success: false, error: error.message };
  }
};

export default {
  createLikeNotification,
  createCommentNotification,
  createDownloadNotification,
  createAchievementNotification,
  createWeeklyReportNotification,
  createTipNotification,
  createSystemNotification,
  checkAndAwardAchievements,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  NOTIFICATION_TYPES,
  ACHIEVEMENTS,
};