// functions/notifications/sendPushNotification.js
const admin = require('firebase-admin');
const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
const expo = new Expo();

/**
 * Send push notification via Expo Push API
 */
async function sendPushNotification(userId, title, body, data = {}) {
  try {
    console.log('📤 Attempting to send push notification to user:', userId);

    // Get user's push token from Firestore
    const tokenDoc = await admin
      .firestore()
      .doc(`users/${userId}/settings/pushToken`)
      .get();

    if (!tokenDoc.exists) {
      console.log('⚠️ No push token found for user:', userId);
      return { success: false, error: 'No push token' };
    }

    const tokenData = tokenDoc.data();
    const pushToken = tokenData.token;

    console.log('✅ Push token found:', pushToken);

    // Validate push token format
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error('❌ Invalid Expo push token format:', pushToken);
      return { success: false, error: 'Invalid push token format' };
    }

    // Create the message
    const message = {
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      badge: 1,
      priority: 'high',
      channelId: getChannelId(data.type),
    };

    console.log('📨 Sending message:', message);

    // Send the notification
    const chunks = expo.chunkPushNotifications([message]);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('❌ Error sending push notification chunk:', error);
      }
    }

    console.log('✅ Push notification sent successfully');
    console.log('Tickets:', JSON.stringify(tickets, null, 2));

    return { success: true, tickets };
  } catch (error) {
    console.error('❌ Error in sendPushNotification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send batch push notifications to multiple users
 */
async function sendBatchPushNotifications(notifications) {
  try {
    console.log(`📤 Sending batch notifications to ${notifications.length} users`);

    const messages = [];

    // Fetch all push tokens
    for (const notif of notifications) {
      try {
        const tokenDoc = await admin
          .firestore()
          .doc(`users/${notif.userId}/settings/pushToken`)
          .get();

        if (tokenDoc.exists()) {
          const pushToken = tokenDoc.data().token;

          if (Expo.isExpoPushToken(pushToken)) {
            messages.push({
              to: pushToken,
              sound: 'default',
              title: notif.title,
              body: notif.body,
              data: notif.data || {},
              badge: 1,
              priority: 'high',
              channelId: getChannelId(notif.data?.type),
            });
          }
        }
      } catch (error) {
        console.warn(`⚠️ Skipping user ${notif.userId}:`, error.message);
      }
    }

    if (messages.length === 0) {
      console.log('⚠️ No valid push tokens found');
      return { success: false, error: 'No valid push tokens' };
    }

    console.log(`✅ Prepared ${messages.length} messages`);

    // Send in chunks
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error('❌ Error sending chunk:', error);
      }
    }

    console.log(`✅ Batch notifications sent: ${tickets.length} tickets`);
    return { success: true, tickets, sent: tickets.length };
  } catch (error) {
    console.error('❌ Error in sendBatchPushNotifications:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get notification channel ID based on type
 */
function getChannelId(type) {
  const channels = {
    like: 'likes',
    comment: 'comments',
    download: 'likes',
    achievement: 'achievements',
    weekly_report: 'default',
    tip: 'default',
    system: 'default',
  };

  return channels[type] || 'default';
}

/**
 * Check if a push token is still valid
 */
async function validatePushToken(pushToken) {
  try {
    if (!Expo.isExpoPushToken(pushToken)) {
      return false;
    }

    // You can add additional validation here
    return true;
  } catch (error) {
    console.error('❌ Error validating push token:', error);
    return false;
  }
}

module.exports = {
  sendPushNotification,
  sendBatchPushNotifications,
  validatePushToken,
};
