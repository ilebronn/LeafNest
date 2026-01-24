// components/common/ProfileBadge/ProfileBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * ProfileBadge - Display a user's active badge (like Discord tags)
 * @param {Object} badge - Badge object from ACHIEVEMENT_BADGES
 * @param {String} size - 'small', 'medium', or 'large'
 * @param {Boolean} showName - Whether to show badge name
 */
const ProfileBadge = ({ badge, size = 'medium', showName = true }) => {
  if (!badge) return null;

  const sizeConfig = {
    small: {
      container: 20,
      icon: 12,
      fontSize: 10,
      padding: 4,
      horizontalPadding: 8,
      gap: 5,
    },
    medium: {
      container: 26,
      icon: 15,
      fontSize: 12,
      padding: 5,
      horizontalPadding: 12,
      gap: 6,
    },
    large: {
      container: 32,
      icon: 18,
      fontSize: 14,
      padding: 6,
      horizontalPadding: 14,
      gap: 8,
    },
  };

  const config = sizeConfig[size] || sizeConfig.medium;

  return (
    <View style={styles.outerContainer}>
      <View style={[styles.container, { gap: config.gap }]}>
        {/* Icon Circle */}
        <View 
          style={[
            styles.iconContainer, 
            { 
              backgroundColor: badge.backgroundColor,
              width: config.container,
              height: config.container,
              borderRadius: config.container / 2,
            }
          ]}
        >
          <Ionicons name={badge.icon} size={config.icon} color={badge.color} />
        </View>
        
        {/* Name Tag */}
        {showName && (
          <View style={[styles.nameContainer, { 
            paddingVertical: config.padding,
            paddingHorizontal: config.horizontalPadding,
            minHeight: config.container,
            borderRadius: config.container / 2,
          }]}>
            <Text 
              style={[
                styles.badgeName, 
                { fontSize: config.fontSize, color: badge.color }
              ]}
              numberOfLines={1}
            >
              {badge.name}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  nameContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  badgeName: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default ProfileBadge;