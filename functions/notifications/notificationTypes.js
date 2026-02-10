// functions/notifications/notificationTypes.js
const NOTIFICATION_TYPES = {
  LIKE: 'like',
  COMMENT: 'comment',
  DOWNLOAD: 'download',
  FOLLOW: 'follow',
  ACHIEVEMENT: 'achievement',
  WEEKLY_REPORT: 'weekly_report',
  TIP: 'tip',
  SYSTEM: 'system',
  SCAN_REMINDER: 'scan_reminder',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  PAYMENT_APPROVED: 'payment_approved',
  PAYMENT_REJECTED: 'payment_rejected',
};

/**
 * Get notification template for a specific type
 */
function getNotificationTemplate(type, data) {
  const templates = {
    [NOTIFICATION_TYPES.LIKE]: {
      title: `${data.username} liked your post`,
      body: data.postName || 'your post',
      icon: '❤️',
    },

    [NOTIFICATION_TYPES.COMMENT]: {
      title: `${data.username} commented`,
      body: data.comment ? data.comment.substring(0, 100) : 'on your post',
      icon: '💬',
    },

    [NOTIFICATION_TYPES.DOWNLOAD]: {
      title: `${data.username} downloaded`,
      body: data.postName || 'your species data',
      icon: '⬇️',
    },

    [NOTIFICATION_TYPES.FOLLOW]: {
      title: `${data.username} followed you`,
      body: 'Check out their profile!',
      icon: '👥',
    },

    [NOTIFICATION_TYPES.ACHIEVEMENT]: {
      title: '🏆 Achievement Unlocked!',
      body: data.achievementTitle || 'You earned a new achievement',
      icon: '🏆',
    },

    [NOTIFICATION_TYPES.WEEKLY_REPORT]: {
      title: '📊 Your Weekly Report',
      body: `${data.scanCount} scans, ${data.speciesCount} species discovered!`,
      icon: '📊',
    },

    [NOTIFICATION_TYPES.TIP]: {
      title: `💡 ${data.tipTitle}`,
      body: data.tipContent || 'New tip available',
      icon: '💡',
    },

    [NOTIFICATION_TYPES.SYSTEM]: {
      title: data.title || '⚙️ System Update',
      body: data.message || 'New update available',
      icon: '⚙️',
    },

    [NOTIFICATION_TYPES.SCAN_REMINDER]: {
      title: data.title || '🌿 Daily Exploration',
      body: data.message || "Haven't explored nature today? Take a quick scan!",
      icon: '🌿',
    },

    [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING]: {
      title: '⏰ Subscription Expiring Soon',
      body: `Your subscription expires in ${data.daysRemaining} day(s)`,
      icon: '⏰',
    },

    [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED]: {
      title: '⚠️ Subscription Expired',
      body: 'Renew now to continue enjoying premium features',
      icon: '⚠️',
    },

    [NOTIFICATION_TYPES.PAYMENT_APPROVED]: {
      title: '🎉 Payment Approved!',
      body: 'Your premium subscription is now active',
      icon: '🎉',
    },

    [NOTIFICATION_TYPES.PAYMENT_REJECTED]: {
      title: '❌ Payment Not Verified',
      body: data.reason || 'Please submit a clearer screenshot',
      icon: '❌',
    },
  };

  return templates[type] || {
    title: 'LeafNest Notification',
    body: data.message || 'You have a new notification',
    icon: '🔔',
  };
}

/**
 * Format notification data for push
 */
function formatNotificationForPush(type, data) {
  const template = getNotificationTemplate(type, data);

  return {
    title: template.title,
    body: template.body,
    data: {
      type: type,
      ...data,
    },
    sound: 'default',
    badge: 1,
    priority: getPriorityForType(type),
    channelId: getChannelIdForType(type),
  };
}

/**
 * Get priority level for notification type
 */
function getPriorityForType(type) {
  const highPriority = [
    NOTIFICATION_TYPES.ACHIEVEMENT,
    NOTIFICATION_TYPES.PAYMENT_APPROVED,
    NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRED,
  ];

  return highPriority.includes(type) ? 'high' : 'normal';
}

/**
 * Get channel ID for notification type
 */
function getChannelIdForType(type) {
  const channels = {
    [NOTIFICATION_TYPES.LIKE]: 'likes',
    [NOTIFICATION_TYPES.COMMENT]: 'comments',
    [NOTIFICATION_TYPES.DOWNLOAD]: 'likes',
    [NOTIFICATION_TYPES.ACHIEVEMENT]: 'achievements',
    [NOTIFICATION_TYPES.WEEKLY_REPORT]: 'default',
    [NOTIFICATION_TYPES.TIP]: 'default',
    [NOTIFICATION_TYPES.SCAN_REMINDER]: 'default',
    [NOTIFICATION_TYPES.SYSTEM]: 'default',
  };

  return channels[type] || 'default';
}

module.exports = {
  NOTIFICATION_TYPES,
  getNotificationTemplate,
  formatNotificationForPush,
  getPriorityForType,
  getChannelIdForType,
};
