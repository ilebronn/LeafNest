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
import { auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function ManageNotificationsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    // Social notifications
    pushNotifications: true,
    likes: true,
    comments: true,
    downloads: true,
    
    // Activity notifications
    achievements: true,
    weeklyReport: true,
    tips: true,
    systemUpdates: true,
    
    // Other
    scanReminders: true,
    newSpecies: true,
    email: false,
  });

  const [loading, setLoading] = useState(true);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (currentUser) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const loadSettings = async () => {
    try {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'notifications');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data());
        console.log('✅ Notification settings loaded from Firestore');
      } else {
        console.log('📍 No settings found, using defaults');
      }
    } catch (error) {
      console.error('❌ Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      if (!currentUser) {
        Alert.alert('Error', 'Please sign in to save settings');
        return;
      }

      const settingsRef = doc(db, 'users', currentUser.uid, 'settings', 'notifications');
      await setDoc(settingsRef, newSettings, { merge: true });
      
      setSettings(newSettings);
      console.log('✅ Notification settings saved to Firestore');
    } catch (error) {
      console.error('❌ Error saving notification settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const toggleSetting = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    
    // ✅ If turning off pushNotifications, also turn off likes, comments, downloads
    if (key === 'pushNotifications' && !settings[key] === false) {
      newSettings.likes = false;
      newSettings.comments = false;
      newSettings.downloads = false;
    }
    
    // ✅ If turning on any social notif, ensure pushNotifications is on
    if ((key === 'likes' || key === 'comments' || key === 'downloads') && !settings[key] === true) {
      newSettings.pushNotifications = true;
    }
    
    saveSettings(newSettings);
  };

  const NotificationToggle = ({ icon, title, description, settingKey, iconColor, isSubOption = false }) => (
    <View style={[styles.toggleItem, isSubOption && styles.toggleItemSub]}>
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

  const handleEnableAll = () => {
    const allEnabled = {
      pushNotifications: true,
      likes: true,
      comments: true,
      downloads: true,
      achievements: true,
      weeklyReport: true,
      tips: true,
      systemUpdates: true,
      scanReminders: true,
      newSpecies: true,
      email: true,
    };
    saveSettings(allEnabled);
    Alert.alert('✅ Success', 'All notifications have been enabled');
  };

  const handleDisableAll = () => {
    Alert.alert(
      '⚠️ Disable All Notifications',
      'Are you sure you want to disable all notifications? You won\'t receive any updates.',
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        {
          text: 'Disable All',
          style: 'destructive',
          onPress: () => {
            const allDisabled = {
              pushNotifications: false,
              likes: false,
              comments: false,
              downloads: false,
              achievements: false,
              weeklyReport: false,
              tips: false,
              systemUpdates: false,
              scanReminders: false,
              newSpecies: false,
              email: false,
            };
            saveSettings(allDisabled);
          },
        },
      ]
    );
  };

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
        <Text style={styles.headerTitle}>Manage Notifications</Text>
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
            Control which notifications you receive from LeafNest
          </Text>
        </View>

        {/* Social Interactions */}
        <Section title="Social Interactions">
          <NotificationToggle
            icon="notifications"
            title="All Social Notifications"
            description="Master toggle for likes, comments, and downloads"
            settingKey="pushNotifications"
            iconColor="#5E936C"
          />
          
          {settings.pushNotifications && (
            <>
              <NotificationToggle
                icon="heart"
                title="Likes"
                description="When someone likes your posts"
                settingKey="likes"
                iconColor="#FF3B30"
                isSubOption={true}
              />
              <NotificationToggle
                icon="chatbubble"
                title="Comments"
                description="When someone comments on your posts"
                settingKey="comments"
                iconColor="#007AFF"
                isSubOption={true}
              />
              <NotificationToggle
                icon="download"
                title="Downloads"
                description="When someone downloads your species data"
                settingKey="downloads"
                iconColor="#5E936C"
                isSubOption={true}
              />
            </>
          )}
        </Section>

        {/* Activity & Progress */}
        <Section title="Activity & Progress">
          <NotificationToggle
            icon="trophy"
            title="Achievements"
            description="Celebrate your scanning milestones"
            settingKey="achievements"
            iconColor="#FFD700"
          />
          
          <NotificationToggle
            icon="bar-chart"
            title="Weekly Report"
            description="Get a summary of your scanning activity every week"
            settingKey="weeklyReport"
            iconColor="#FF5722"
          />
        </Section>

        {/* Learning & Updates */}
        <Section title="Learning & Updates">
          <NotificationToggle
            icon="bulb"
            title="Tips & Tricks"
            description="Learn how to identify species and use the app better"
            settingKey="tips"
            iconColor="#9C27B0"
          />
        </Section>

        {/* Other Notifications */}
        <Section title="Other Notifications">
          <NotificationToggle
            icon="time"
            title="Scan Reminders"
            description="Daily reminders to explore nature"
            settingKey="scanReminders"
            iconColor="#2196F3"
          />
          
        </Section>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleEnableAll}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-circle" size={20} color="#5E936C" />
            <Text style={styles.actionButtonText}>Enable All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={handleDisableAll}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#F44336" />
            <Text style={[styles.actionButtonText, { color: '#F44336' }]}>
              Disable All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Settings Info */}
        <View style={styles.infoBox}>
          <Ionicons name="cloud" size={20} color="#666" />
          <Text style={styles.infoText}>
            Your notification preferences are synced to the cloud and apply across all devices
          </Text>
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
    fontSize: 18,
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
  toggleItemSub: {
    marginLeft: 20,
    backgroundColor: '#F8F9FA',
    borderLeftWidth: 3,
    borderLeftColor: '#5E936C',
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
    marginBottom: 20,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});