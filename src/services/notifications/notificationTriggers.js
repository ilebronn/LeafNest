// notificationTriggers.js - Trigger push notifications from client
import { getUserPushToken } from './pushTokenService';

/**
 * Send push notification via Expo Push API
 */
export const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    // Get user's push token
    const tokenResult = await getUserPushToken(userId);
    
    if (!tokenResult.success || !tokenResult.token) {
      console.warn('⚠️ No push token found for user:', userId);
      return { success: false, error: 'No push token' };
    }

    const message = {
      to: tokenResult.token,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      badge: 1,
      priority: 'high',
      channelId: 'default',
    };

    console.log('📤 Sending push notification:', message);

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (result.data && result.data.status === 'ok') {
      console.log('✅ Push notification sent successfully:', result);
      return { success: true, result };
    } else {
      console.error('❌ Push notification failed:', result);
      return { success: false, error: result.errors || 'Unknown error' };
    }
  } catch (error) {
    console.error('❌ Error sending push notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send batch push notifications
 */
export const sendBatchPushNotifications = async (notifications) => {
  try {
    const messages = [];

    for (const notif of notifications) {
      const tokenResult = await getUserPushToken(notif.userId);
      
      if (tokenResult.success && tokenResult.token) {
        messages.push({
          to: tokenResult.token,
          sound: 'default',
          title: notif.title,
          body: notif.body,
          data: notif.data || {},
          badge: 1,
          priority: 'high',
        });
      }
    }

    if (messages.length === 0) {
      return { success: false, error: 'No valid push tokens' };
    }

    console.log(`📤 Sending ${messages.length} batch notifications`);

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('✅ Batch notifications sent:', result);
    
    return { success: true, result };
  } catch (error) {
    console.error('❌ Error sending batch notifications:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Trigger like notification
 */
export const triggerLikeNotification = async (
  recipientId,
  likerUsername,
  postName
) => {
  return sendPushNotification(
    recipientId,
    `${likerUsername} liked your post`,
    postName || 'your post',
    { type: 'like', postId: postName }
  );
};

/**
 * Trigger comment notification
 */
export const triggerCommentNotification = async (
  recipientId,
  commenterUsername,
  postName,
  commentText
) => {
  return sendPushNotification(
    recipientId,
    `${commenterUsername} commented`,
    commentText.substring(0, 100),
    { type: 'comment', postId: postName }
  );
};

/**
 * Trigger achievement notification
 */
export const triggerAchievementNotification = async (
  userId,
  achievementTitle,
  achievementDescription
) => {
  return sendPushNotification(
    userId,
    `🏆 Achievement Unlocked!`,
    achievementTitle,
    { type: 'achievement', title: achievementTitle }
  );
};

/**
 * Trigger weekly report notification
 */
export const triggerWeeklyReportNotification = async (
  userId,
  scanCount,
  speciesCount
) => {
  return sendPushNotification(
    userId,
    `📊 Your Weekly Report`,
    `${scanCount} scans, ${speciesCount} species discovered!`,
    { type: 'weekly_report' }
  );
};

/**
 * Trigger tip notification
 */
export const triggerTipNotification = async (userId, tipTitle, tipContent) => {
  return sendPushNotification(
    userId,
    `💡 ${tipTitle}`,
    tipContent,
    { type: 'tip' }
  );
};

/**
 * Trigger system notification
 */
export const triggerSystemNotification = async (userId, title, message) => {
  return sendPushNotification(
    userId,
    title,
    message,
    { type: 'system' }
  );
};

export default {
  sendPushNotification,
  sendBatchPushNotifications,
  triggerLikeNotification,
  triggerCommentNotification,
  triggerAchievementNotification,
  triggerWeeklyReportNotification,
  triggerTipNotification,
  triggerSystemNotification,
};