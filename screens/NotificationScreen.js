import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// In-memory storage for notifications
let storedNotifications = [
  {
    id: '1',
    type: 'new_species',
    title: 'New Species Discovered!',
    message: 'You\'ve scanned a Philippine Eagle - a critically endangered species',
    time: '2 hours ago',
    read: false,
    icon: 'planet',
    iconColor: '#4CAF50',
  },
  {
    id: '2',
    type: 'achievement',
    title: 'Achievement Unlocked',
    message: 'Congratulations! You\'ve reached 10 species scanned',
    time: '5 hours ago',
    read: false,
    icon: 'trophy',
    iconColor: '#FF9800',
  },
  {
    id: '3',
    type: 'reminder',
    title: 'Daily Scan Reminder',
    message: 'Don\'t forget to scan species today and maintain your streak!',
    time: '1 day ago',
    read: true,
    icon: 'time',
    iconColor: '#2196F3',
  },
  {
    id: '4',
    type: 'weekly_report',
    title: 'Weekly Report Ready',
    message: 'Your weekly scanning summary is available. You scanned 5 new species!',
    time: '2 days ago',
    read: true,
    icon: 'bar-chart',
    iconColor: '#FF5722',
  },
  {
    id: '5',
    type: 'system',
    title: 'App Update Available',
    message: 'A new version with improved species recognition is now available',
    time: '3 days ago',
    read: true,
    icon: 'construct',
    iconColor: '#607D8B',
  },
];

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState(storedNotifications);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setNotifications([...storedNotifications]);
      setRefreshing(false);
    }, 1000);
  };

  const markAsRead = (id) => {
    const updatedNotifications = notifications.map(notif =>
      notif.id === id ? { ...notif, read: true } : notif
    );
    setNotifications(updatedNotifications);
    storedNotifications = updatedNotifications;
  };

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(notif => ({ ...notif, read: true }));
    setNotifications(updatedNotifications);
    storedNotifications = updatedNotifications;
  };

  const deleteNotification = (id) => {
    const updatedNotifications = notifications.filter(notif => notif.id !== id);
    setNotifications(updatedNotifications);
    storedNotifications = updatedNotifications;
  };

  const NotificationItem = ({ notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        !notification.read && styles.unreadNotification,
      ]}
      onPress={() => markAsRead(notification.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: notification.iconColor + '20' }]}>
        <Ionicons name={notification.icon} size={24} color={notification.iconColor} />
      </View>
      
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          {!notification.read && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notificationMessage}>{notification.message}</Text>
        <Text style={styles.notificationTime}>{notification.time}</Text>
      </View>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteNotification(notification.id)}
        activeOpacity={0.7}
      >
        <Ionicons name="close-circle" size={20} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

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
      {notifications.length > 0 && (
        <View style={styles.actionBar}>
          <View style={styles.counterContainer}>
            <Ionicons name="notifications" size={20} color="#5E936C" />
            <Text style={styles.counterText}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
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

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={80} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>No notifications yet</Text>
          <Text style={styles.emptyMessage}>
            We'll notify you when something new happens
          </Text>
        </View>
      ) : (
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
          {notifications.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
          
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
  },
  unreadNotification: {
    backgroundColor: '#F1F8F4',
    borderColor: '#5E936C',
    borderWidth: 1.5,
  },
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
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 4,
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
});