// NotificationBadge/index.js - Badge component for notification count
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNotifications } from '@contexts/NotificationContext';

const NotificationBadge = ({ count, size = 'medium', style }) => {
  const { unreadCount } = useNotifications();
  
  // Use provided count or context count
  const displayCount = count !== undefined ? count : unreadCount;
  
  // Don't render if no notifications
  if (displayCount === 0) return null;
  
  // Size configurations
  const sizes = {
    small: {
      container: 16,
      fontSize: 10,
    },
    medium: {
      container: 20,
      fontSize: 12,
    },
    large: {
      container: 24,
      fontSize: 14,
    },
  };
  
  const sizeConfig = sizes[size] || sizes.medium;
  
  // Format count (e.g., 99+ for counts over 99)
  const formattedCount = displayCount > 99 ? '99+' : displayCount.toString();
  
  return (
    <View
      style={[
        styles.badge,
        {
          width: sizeConfig.container,
          height: sizeConfig.container,
          borderRadius: sizeConfig.container / 2,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { fontSize: sizeConfig.fontSize },
        ]}
        numberOfLines={1}
      >
        {formattedCount}
      </Text>
    </View>
  );
};

/**
 * Positioned badge (for use with icons/buttons)
 */
export const PositionedNotificationBadge = ({ 
  count, 
  size = 'small', 
  position = 'top-right',
  offset = 0,
}) => {
  const { unreadCount } = useNotifications();
  const displayCount = count !== undefined ? count : unreadCount;
  
  if (displayCount === 0) return null;
  
  const positionStyles = {
    'top-right': { top: offset, right: offset },
    'top-left': { top: offset, left: offset },
    'bottom-right': { bottom: offset, right: offset },
    'bottom-left': { bottom: offset, left: offset },
  };
  
  return (
    <View style={[styles.positionedBadge, positionStyles[position]]}>
      <NotificationBadge count={displayCount} size={size} />
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  positionedBadge: {
    position: 'absolute',
    zIndex: 10,
  },
});

export default NotificationBadge;