// notificationFormatter.js - Format notification objects
import { NOTIFICATION_TYPES } from '@services/notifications/notificationService';

/**
 * Format notification for display in UI
 */
export const formatNotificationForDisplay = (notification) => {
  if (!notification) return null;

  return {
    id: notification.id,
    type: notification.type,
    title: getNotificationTitle(notification),
    message: notification.message,
    body: getNotificationBody(notification),
    timestamp: notification.createdAt || notification.timestamp,
    read: notification.read || false,
    icon: getNotificationIcon(notification.type),
    color: getNotificationColor(notification.type),
    data: notification,
  };
};

/**
 * Get notification title based on type
 */
const getNotificationTitle = (notification) => {
  switch (notification.type) {
    case NOTIFICATION_TYPES.LIKE:
      return `${notification.senderUsername} liked your post`;
    
    case NOTIFICATION_TYPES.COMMENT:
      return `${notification.senderUsername} commented`;
    
    case NOTIFICATION_TYPES.DOWNLOAD:
      return `${notification.senderUsername} downloaded`;
    
    case NOTIFICATION_TYPES.FOLLOW:
      return `${notification.senderUsername} followed you`;
    
    case NOTIFICATION_TYPES.ACHIEVEMENT:
      return '🏆 Achievement Unlocked!';
    
    case NOTIFICATION_TYPES.WEEKLY_REPORT:
      return '📊 Your Weekly Report';
    
    case NOTIFICATION_TYPES.TIP:
      return '💡 Tip & Trick';
    
    case NOTIFICATION_TYPES.SYSTEM:
      return notification.systemTitle || '⚙️ System Update';
    
    default:
      return notification.senderUsername || 'LeafNest';
  }
};

/**
 * Get notification body text
 */
const getNotificationBody = (notification) => {
  switch (notification.type) {
    case NOTIFICATION_TYPES.ACHIEVEMENT:
      return notification.achievementTitle || notification.message;
    
    case NOTIFICATION_TYPES.COMMENT:
      return notification.commentText || notification.message;
    
    case NOTIFICATION_TYPES.TIP:
      return notification.tipContent || notification.message;
    
    default:
      return notification.message;
  }
};

/**
 * Get icon name for notification type
 */
const getNotificationIcon = (type) => {
  const icons = {
    [NOTIFICATION_TYPES.LIKE]: 'heart',
    [NOTIFICATION_TYPES.COMMENT]: 'chatbubble',
    [NOTIFICATION_TYPES.DOWNLOAD]: 'download',
    [NOTIFICATION_TYPES.FOLLOW]: 'person-add',
    [NOTIFICATION_TYPES.ACHIEVEMENT]: 'trophy',
    [NOTIFICATION_TYPES.WEEKLY_REPORT]: 'bar-chart',
    [NOTIFICATION_TYPES.TIP]: 'bulb',
    [NOTIFICATION_TYPES.SYSTEM]: 'construct',
  };
  
  return icons[type] || 'notifications';
};

/**
 * Get color for notification type
 */
const getNotificationColor = (type) => {
  const colors = {
    [NOTIFICATION_TYPES.LIKE]: '#FF3B30',
    [NOTIFICATION_TYPES.COMMENT]: '#007AFF',
    [NOTIFICATION_TYPES.DOWNLOAD]: '#5E936C',
    [NOTIFICATION_TYPES.FOLLOW]: '#FF9500',
    [NOTIFICATION_TYPES.ACHIEVEMENT]: '#FFD700',
    [NOTIFICATION_TYPES.WEEKLY_REPORT]: '#FF5722',
    [NOTIFICATION_TYPES.TIP]: '#9C27B0',
    [NOTIFICATION_TYPES.SYSTEM]: '#607D8B',
  };
  
  return colors[type] || '#5E936C';
};

/**
 * Format badge count from notifications array
 */
export const formatNotificationBadgeCount = (notifications) => {
  if (!notifications || !Array.isArray(notifications)) return 0;
  return notifications.filter(n => !n.read).length;
};

/**
 * Group notifications by type
 */
export const groupNotificationsByType = (notifications) => {
  if (!notifications || !Array.isArray(notifications)) return {};
  
  return notifications.reduce((groups, notification) => {
    const type = notification.type || 'other';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(notification);
    return groups;
  }, {});
};

/**
 * Group notifications by date
 */
export const groupNotificationsByDate = (notifications) => {
  if (!notifications || !Array.isArray(notifications)) return {};
  
  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  
  notifications.forEach(notification => {
    const notifDate = new Date(notification.createdAt || notification.timestamp);
    
    if (notifDate >= today) {
      groups.today.push(notification);
    } else if (notifDate >= yesterday) {
      groups.yesterday.push(notification);
    } else if (notifDate >= lastWeek) {
      groups.thisWeek.push(notification);
    } else {
      groups.older.push(notification);
    }
  });
  
  return groups;
};

/**
 * Format time ago string
 */
export const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'Just now';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/**
 * Get notification summary text
 */
export const getNotificationSummary = (notifications) => {
  if (!notifications || notifications.length === 0) {
    return 'No new notifications';
  }
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  if (unreadCount === 0) {
    return 'All caught up!';
  }
  
  return `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`;
};

export default {
  formatNotificationForDisplay,
  formatNotificationBadgeCount,
  groupNotificationsByType,
  groupNotificationsByDate,
  formatTimeAgo,
  getNotificationSummary,
};