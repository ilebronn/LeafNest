import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// In-memory storage (no AsyncStorage needed)
let notificationSettings = null;

export default function ManageNotificationsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    pushNotifications: true,
    scanReminders: true,
    weeklyReport: false,
    newSpecies: true,
    achievements: true,
    tips: false,
    systemUpdates: true,
    email: false,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      if (notificationSettings) {
        setSettings(notificationSettings);
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = (newSettings) => {
    try {
      notificationSettings = newSettings;
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const NotificationToggle = ({ icon, title, description, settingKey, iconColor }) => (
    <View style={styles.toggleItem}>
      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View style={styles.toggleContent}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Switch
        value={settings[settingKey]}
        onValueChange={() => toggleSetting(settingKey)}
        trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
        thumbColor={settings[settingKey] ? '#5E936C' : '#f4f3f4'}
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  );

  const Section = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5E936C" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={24} color="#5E936C" />
          <Text style={styles.infoBannerText}>
            Manage your notification preferences to stay updated on your species discoveries
          </Text>
        </View>

        {/* App Notifications */}
        <Section title="App Notifications">
          <NotificationToggle
            icon="notifications"
            title="Push Notifications"
            description="Enable all push notifications"
            settingKey="pushNotifications"
            iconColor="#5E936C"
          />
          <NotificationToggle
            icon="time"
            title="Scan Reminders"
            description="Daily reminders to scan species"
            settingKey="scanReminders"
            iconColor="#2196F3"
          />
          <NotificationToggle
            icon="planet"
            title="New Species Alerts"
            description="Get notified when you scan a new species"
            settingKey="newSpecies"
            iconColor="#4CAF50"
          />
          <NotificationToggle
            icon="trophy"
            title="Achievements"
            description="Celebrate your milestones"
            settingKey="achievements"
            iconColor="#FF9800"
          />
        </Section>

        {/* Updates & Tips */}
        <Section title="Updates & Tips">
          <NotificationToggle
            icon="bar-chart"
            title="Weekly Report"
            description="Summary of your scanning activity"
            settingKey="weeklyReport"
            iconColor="#FF5722"
          />
          <NotificationToggle
            icon="construct"
            title="System Updates"
            description="Important app updates and news"
            settingKey="systemUpdates"
            iconColor="#607D8B"
          />
        </Section>

        {/* Email Notifications */}
        <Section title="Email Notifications">
          <NotificationToggle
            icon="mail"
            title="Email Notifications"
            description="Receive notifications via email"
            settingKey="email"
            iconColor="#1976D2"
          />
        </Section>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              const allEnabled = {
                pushNotifications: true,
                scanReminders: true,
                weeklyReport: true,
                newSpecies: true,
                achievements: true,
                tips: true,
                systemUpdates: true,
                email: true,
              };
              saveSettings(allEnabled);
              Alert.alert('Success', 'All notifications enabled');
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={20} color="#5E936C" />
            <Text style={styles.actionButtonText}>Enable All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => {
              Alert.alert(
                'Disable All Notifications',
                'Are you sure you want to disable all notifications?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Disable',
                    style: 'destructive',
                    onPress: () => {
                      const allDisabled = {
                        pushNotifications: false,
                        scanReminders: false,
                        weeklyReport: false,
                        newSpecies: false,
                        achievements: false,
                        tips: false,
                        systemUpdates: false,
                        email: false,
                      };
                      saveSettings(allDisabled);
                    },
                  },
                ]
              );
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#F44336" />
            <Text style={[styles.actionButtonText, { color: '#F44336' }]}>
              Disable All
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#5E936C',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#5E936C',
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  toggleContent: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#5E936C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonSecondary: {
    borderColor: '#F44336',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5E936C',
  },
});