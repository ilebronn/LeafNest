// notificationTypes.js - Define notification templates
export const NOTIFICATION_TEMPLATES = {
  LIKE: {
    getTitle: (username) => `${username} liked your post`,
    getBody: (postName) => `${postName}`,
    icon: '❤️',
  },
  
  COMMENT: {
    getTitle: (username) => `${username} commented`,
    getBody: (comment) => comment.substring(0, 100),
    icon: '💬',
  },
  
  ACHIEVEMENT: {
    getTitle: (achievementName) => `🏆 Achievement Unlocked!`,
    getBody: (achievementDesc) => achievementDesc,
    icon: '🏆',
  },
  
  WEEKLY_REPORT: {
    getTitle: () => `📊 Your Weekly Report`,
    getBody: (scanCount, speciesCount) => 
      `${scanCount} scans, ${speciesCount} species discovered!`,
    icon: '📊',
  },
  
  TIP: {
    getTitle: (tipTitle) => `💡 ${tipTitle}`,
    getBody: (tipContent) => tipContent,
    icon: '💡',
  },
};

export default NOTIFICATION_TEMPLATES;