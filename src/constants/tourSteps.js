export const TOUR_STEPS = [
  {
    id: 'home',
    title: 'Home Feed',
    description: 'Discover trending plants and community posts here',
    targetKey: 'home-tab',
    position: 'top',
  },
  {
    id: 'scan',
    title: 'Scan Plants/Animals',
    description: 'Take a photo to instantly identify any plant species',
    targetKey: 'scan-button',
    position: 'bottom', // Changed to bottom since scan is in header
    highlightPadding: 12, // Extra padding for header icons
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Stay updated with likes, comments, and community interactions',
    targetKey: 'notification-button',
    position: 'bottom',
    highlightPadding: 12,
  },
  {
    id: 'favorites',
    title: 'Your Favorites',
    description: 'Save and access your favorite plants anytime',
    targetKey: 'favorites-tab',
    position: 'top',
  },
  {
    id: 'history',
    title: 'Scan History',
    description: 'Review all your previous plant scans',
    targetKey: 'history-tab',
    position: 'top',
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Manage settings, notifications, and account preferences',
    targetKey: 'profile-tab',
    position: 'top',
  },
];

/**
 * Highlight All Features
 * Used when "Highlight All" button is pressed
 */
export const ALL_FEATURES = [
  { key: 'home-tab', label: 'Home' },
  { key: 'scan-button', label: 'Scan' },
  { key: 'notification-button', label: 'Notifications' },
  { key: 'favorites-tab', label: 'Favorites' },
  { key: 'history-tab', label: 'History' },
  { key: 'profile-tab', label: 'Profile' },
];
