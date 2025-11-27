// NotificationScreen.js - WITH PIN FEATURE
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '@config/firebase';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  NOTIFICATION_TYPES,
} from '@firestoreService/notifications/notificationService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@config/firebase';

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid;

  const unreadCount = notifications.filter(n => !n.read).length;
  const pinnedCount = notifications.filter(n => n.pinned).length;
  
  // Show only first 5 notifications unless "Show More" is clicked
  const INITIAL_DISPLAY_COUNT = 5;
  const displayedNotifications = showAll 
    ? notifications 
    : notifications.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = notifications.length > INITIAL_DISPLAY_COUNT;

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const loadNotifications = async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      const result = await getUserNotifications(currentUserId);
      if (result.success) {
        // Sort: pinned first, then by timestamp
        const sorted = result.data.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return b.createdAt - a.createdAt;
        });
        setNotifications(sorted);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
    setShowAll(false); // Reset to show only first 5 on refresh
  };

  const markAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      
      setNotifications(prevNotifs =>
        prevNotifs.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUserId) return;

    try {
      await markAllNotificationsAsRead(currentUserId);
      
      setNotifications(prevNotifs =>
        prevNotifs.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // ✅ PIN/UNPIN NOTIFICATION
  const togglePinNotification = async (notificationId, currentPinStatus) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, {
        pinned: !currentPinStatus,
      });
      
      // Update local state and re-sort
      setNotifications(prevNotifs => {
        const updated = prevNotifs.map(notif =>
          notif.id === notificationId 
            ? { ...notif, pinned: !currentPinStatus } 
            : notif
        );
        
        // Re-sort: pinned first, then by timestamp
        return updated.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return b.createdAt - a.createdAt;
        });
      });
      
      console.log(!currentPinStatus ? '📌 Notification pinned' : '📌 Notification unpinned');
    } catch (error) {
      console.error('Error toggling pin:', error);
      Alert.alert('Error', 'Failed to pin notification');
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNotification(notificationId);
              setNotifications(prevNotifs =>
                prevNotifs.filter(notif => notif.id !== notificationId)
              );
            } catch (error) {
              console.error('Error deleting notification:', error);
            }
          },
        },
      ]
    );
  };

  const getNotificationIcon = (type, notification) => {
    switch (type) {
      case NOTIFICATION_TYPES.LIKE:
        return { icon: 'heart', color: '#FF3B30' };
      case NOTIFICATION_TYPES.COMMENT:
        return { icon: 'chatbubble', color: '#007AFF' };
      case NOTIFICATION_TYPES.DOWNLOAD:
        return { icon: 'download', color: '#5E936C' };
      case NOTIFICATION_TYPES.FOLLOW:
        return { icon: 'person-add', color: '#FF9500' };
      case NOTIFICATION_TYPES.ACHIEVEMENT:
        return { 
          icon: notification.achievementIcon || 'trophy', 
          color: notification.achievementColor || '#FFD700' 
        };
      case NOTIFICATION_TYPES.WEEKLY_REPORT:
        return { icon: 'bar-chart', color: '#FF5722' };
      case NOTIFICATION_TYPES.TIP:
        return { icon: 'bulb', color: '#9C27B0' };
      case NOTIFICATION_TYPES.SYSTEM:
        return { icon: 'construct', color: '#607D8B' };
      default:
        return { icon: 'notifications', color: '#5E936C' };
    }
  };

  const formatTime = (timestamp) => {
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

  const handleNotificationPress = (notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.postId) {
      navigation.navigate('PostDetailScreen', { postId: notification.postId });
    } else if (notification.type === NOTIFICATION_TYPES.ACHIEVEMENT) {
      navigation.navigate('ScanStats', { userId: currentUserId });
    } else if (notification.type === NOTIFICATION_TYPES.WEEKLY_REPORT) {
      navigation.navigate('ScanStats', { userId: currentUserId });
    }
  };

  const NotificationItem = ({ notification }) => {
    const { icon, color } = getNotificationIcon(notification.type, notification);
    const isPinned = notification.pinned;

    // ✅ ACHIEVEMENT NOTIFICATION
    if (notification.type === NOTIFICATION_TYPES.ACHIEVEMENT) {
      return (
        <View style={[
          styles.notificationItem,
          styles.achievementNotification,
          !notification.read && styles.unreadNotification,
          isPinned && styles.pinnedNotification,
        ]}>
          {isPinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={12} color="#FF9800" />
            </View>
          )}
          
          <TouchableOpacity
            style={styles.notificationTouchable}
            onPress={() => handleNotificationPress(notification)}
            activeOpacity={0.7}
          >
            <View style={[styles.achievementIconContainer, { backgroundColor: color + '20' }]}>
              <Ionicons name={icon} size={32} color={color} />
            </View>
            
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.achievementTitle}>
                  🏆 Achievement Unlocked!
                </Text>
                {!notification.read && <View style={styles.unreadDot} />}
              </View>
              
              <Text style={styles.achievementName}>
                {notification.achievementTitle}
              </Text>
              
              <Text style={styles.achievementDescription}>
                {notification.achievementDescription}
              </Text>
              
              <Text style={styles.notificationTime}>
                {formatTime(notification.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.pinButton}
              onPress={() => togglePinNotification(notification.id, isPinned)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isPinned ? "pin" : "pin-outline"} 
                size={20} 
                color={isPinned ? "#FF9800" : "#999"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteNotification(notification.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ✅ WEEKLY REPORT NOTIFICATION
    if (notification.type === NOTIFICATION_TYPES.WEEKLY_REPORT) {
      return (
        <View style={[
          styles.notificationItem,
          styles.weeklyReportNotification,
          !notification.read && styles.unreadNotification,
          isPinned && styles.pinnedNotification,
        ]}>
          {isPinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={12} color="#FF9800" />
            </View>
          )}
          
          <TouchableOpacity
            style={styles.notificationTouchable}
            onPress={() => handleNotificationPress(notification)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
              <Ionicons name={icon} size={24} color={color} />
            </View>
            
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>
                  📊 Weekly Report
                </Text>
                {!notification.read && <View style={styles.unreadDot} />}
              </View>
              
              <Text style={styles.notificationMessage}>
                {notification.message}
              </Text>
              
              {notification.reportData && (
                <View style={styles.reportStats}>
                  <Text style={styles.reportStat}>
                    📸 {notification.reportData.totalScans} scans
                  </Text>
                  <Text style={styles.reportStat}>
                    🌿 {notification.reportData.newSpecies} new species
                  </Text>
                </View>
              )}
              
              <Text style={styles.notificationTime}>
                {formatTime(notification.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.pinButton}
              onPress={() => togglePinNotification(notification.id, isPinned)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isPinned ? "pin" : "pin-outline"} 
                size={20} 
                color={isPinned ? "#FF9800" : "#999"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteNotification(notification.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ✅ TIP NOTIFICATION
    if (notification.type === NOTIFICATION_TYPES.TIP) {
      return (
        <View style={[
          styles.notificationItem,
          styles.tipNotification,
          !notification.read && styles.unreadNotification,
          isPinned && styles.pinnedNotification,
        ]}>
          {isPinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={12} color="#FF9800" />
            </View>
          )}
          
          <TouchableOpacity
            style={styles.notificationTouchable}
            onPress={() => handleNotificationPress(notification)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
              <Ionicons name={icon} size={24} color={color} />
            </View>
            
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>
                  💡 Tip & Trick
                </Text>
                {!notification.read && <View style={styles.unreadDot} />}
              </View>
              
              <Text style={styles.tipTitle}>
                {notification.message}
              </Text>
              
              {notification.tipContent && (
                <Text style={styles.tipContent}>
                  {notification.tipContent}
                </Text>
              )}
              
              <Text style={styles.notificationTime}>
                {formatTime(notification.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.pinButton}
              onPress={() => togglePinNotification(notification.id, isPinned)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isPinned ? "pin" : "pin-outline"} 
                size={20} 
                color={isPinned ? "#FF9800" : "#999"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteNotification(notification.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ✅ SYSTEM NOTIFICATION
    if (notification.type === NOTIFICATION_TYPES.SYSTEM) {
      return (
        <View style={[
          styles.notificationItem,
          styles.systemNotification,
          !notification.read && styles.unreadNotification,
          isPinned && styles.pinnedNotification,
        ]}>
          {isPinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={12} color="#FF9800" />
            </View>
          )}
          
          <TouchableOpacity
            style={styles.notificationTouchable}
            onPress={() => handleNotificationPress(notification)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
              <Ionicons name={icon} size={24} color={color} />
            </View>
            
            <View style={styles.notificationContent}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>
                  ⚙️ {notification.systemTitle || 'System Update'}
                </Text>
                {!notification.read && <View style={styles.unreadDot} />}
              </View>
              
              <Text style={styles.notificationMessage}>
                {notification.message}
              </Text>
              
              {notification.updateDetails && (
                <Text style={styles.updateDetails}>
                  {notification.updateDetails}
                </Text>
              )}
              
              <Text style={styles.notificationTime}>
                {formatTime(notification.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.pinButton}
              onPress={() => togglePinNotification(notification.id, isPinned)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isPinned ? "pin" : "pin-outline"} 
                size={20} 
                color={isPinned ? "#FF9800" : "#999"} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteNotification(notification.id)}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // ✅ DEFAULT NOTIFICATION (LIKE, COMMENT, DOWNLOAD, FOLLOW)
    return (
      <View style={[
        styles.notificationItem,
        !notification.read && styles.unreadNotification,
        isPinned && styles.pinnedNotification,
      ]}>
        {isPinned && (
          <View style={styles.pinnedBadge}>
            <Ionicons name="pin" size={12} color="#FF9800" />
          </View>
        )}
        
        <TouchableOpacity
          style={styles.notificationTouchable}
          onPress={() => handleNotificationPress(notification)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
            <Ionicons name={icon} size={24} color={color} />
          </View>
          
          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Text style={styles.notificationTitle}>
                {notification.senderUsername || 'Someone'}
              </Text>
              {!notification.read && <View style={styles.unreadDot} />}
            </View>
            
            <Text style={styles.notificationMessage}>
              {notification.message}
            </Text>
            
            {notification.commentText && (
              <Text style={styles.notificationComment} numberOfLines={2}>
                "{notification.commentText}"
              </Text>
            )}
            
            {notification.postName && (
              <Text style={styles.notificationPostName} numberOfLines={1}>
                📸 {notification.postName}
              </Text>
            )}
            
            <Text style={styles.notificationTime}>
              {formatTime(notification.createdAt)}
            </Text>
          </View>

          {notification.postImageUrl && (
            <Image
              source={{ uri: notification.postImageUrl }}
              style={styles.postThumbnail}
              resizeMode="cover"
            />
          )}
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.pinButton}
            onPress={() => togglePinNotification(notification.id, isPinned)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={isPinned ? "pin" : "pin-outline"} 
              size={20} 
              color={isPinned ? "#FF9800" : "#999"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteNotification(notification.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!currentUser) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={28} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Notifications</Text>
          <View style={{ width: 44 }} />
        </View>
        
        <View style={styles.emptyContainer}>
          <Ionicons name="log-in-outline" size={80} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>Sign in Required</Text>
          <Text style={styles.emptyMessage}>
            Please sign in to view your notifications
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={28} color="#111" />
        </TouchableOpacity>

        <Text style={styles.headerText}>Notification</Text>

        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('ManageNotifications')}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={24} color="#111" />
        </TouchableOpacity>
      </View>

      {/* Notification Counter & Actions */}
      {!loading && notifications.length > 0 && (
        <View style={styles.actionBar}>
          <View style={styles.counterContainer}>
            <Ionicons name="notifications" size={20} color="#5E936C" />
            <Text style={styles.counterText}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              {pinnedCount > 0 && ` • ${pinnedCount} pinned`}
            </Text>
          </View>
          
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllAsRead}
              activeOpacity={0.7}
            >
              <Text style={styles.markAllText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E936C" />
        </View>
      ) : notifications.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={80} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyMessage}>
            We'll notify you when something new happens
          </Text>
        </View>
      ) : (
        /* Notifications List */
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#5E936C']}
              tintColor="#5E936C"
            />
          }
        >
          {displayedNotifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
          
          {/* Show More Button */}
          {!showAll && hasMore && (
            <TouchableOpacity
              style={styles.showMoreButton}
              onPress={() => setShowAll(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.showMoreText}>
                Show More ({notifications.length - INITIAL_DISPLAY_COUNT} more)
              </Text>
              <Ionicons name="chevron-down" size={20} color="#5E936C" />
            </TouchableOpacity>
          )}
          
          {/* Show Less Button */}
          {showAll && hasMore && (
            <TouchableOpacity
              style={styles.showLessButton}
              onPress={() => setShowAll(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.showLessText}>Show Less</Text>
              <Ionicons name="chevron-up" size={20} color="#5E936C" />
            </TouchableOpacity>
          )}
          
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  headerText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#111',
    flex: 1,
    marginLeft: 10,
  },
  settingsButton: {
    padding: 5,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  markAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5E936C',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 15,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'visible',
    position: 'relative',
  },
  notificationTouchable: {
    flexDirection: 'row',
    flex: 1,
  },
  unreadNotification: {
    backgroundColor: '#F1F8F4',
    borderColor: '#5E936C',
    borderWidth: 1.5,
  },
  pinnedNotification: {
    borderColor: '#FF9800',
    borderWidth: 2,
    shadowColor: '#FF9800',
    shadowOpacity: 0.1,
  },
  pinnedBadge: {
    position: 'absolute',
    top: -8,
    left: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  // Achievement styles
  achievementNotification: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  achievementIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9800',
    flex: 1,
  },
  achievementName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  // Weekly report styles
  weeklyReportNotification: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  reportStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    marginBottom: 6,
  },
  reportStat: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF5722',
  },
  // Tip styles
  tipNotification: {
    backgroundColor: '#F3E5F5',
    borderColor: '#9C27B0',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  tipContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 6,
  },
  // System styles
  systemNotification: {
    backgroundColor: '#ECEFF1',
    borderColor: '#607D8B',
  },
  updateDetails: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 6,
    fontStyle: 'italic',
  },
  // Default styles
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
    marginRight: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#5E936C',
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationComment: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationPostName: {
    fontSize: 13,
    color: '#5E936C',
    fontWeight: '500',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  postThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#f5f5f5',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'center',
    marginLeft: 8,
  },
  pinButton: {
    padding: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  signInButton: {
    backgroundColor: '#5E936C',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F8F4',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#5E936C',
    gap: 8,
  },
  showMoreText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5E936C',
  },
  showLessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 8,
  },
  showLessText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
});