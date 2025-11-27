// screens/ProfileScreen.js - WITH PREMIUM STATUS DISPLAY
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView, 
  StatusBar, 
  Dimensions, 
  TextInput,
  Alert,
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, updateProfile, signOut } from 'firebase/auth';
import { auth } from '@config/firebase';
import { clearAllUserData } from '@utils/auth';
import { useTranslation } from 'react-i18next';
import { getScanStats, syncPendingScans } from '@services/scanning/scanStatsService';
import { getUserSubscription } from '@services/subscription/subscriptionService';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ route, navigation }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [isGuest, setIsGuest] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  
  // Subscription state
  const [subscription, setSubscription] = useState(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  
  // Stats state
  const [stats, setStats] = useState({
    totalScans: 0,
    weekScans: 0,
    uniqueSpecies: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    
    const guestParam = route?.params?.guest;
    const isUserGuest = !user || guestParam === true;
    
    console.log('ProfileScreen Auth check:', { 
      hasUser: !!user, 
      userEmail: user?.email,
      guestParam, 
      isUserGuest 
    });
    
    setIsGuest(isUserGuest);
    
    if (isUserGuest) {
      setIsEditing(false);
    }
    
    const loadUserData = async () => {
      if (isUserGuest) {
        await clearAllUserData();
        setUsername(t('profile.guestUser'));
        setEmail('guest@leafnest.app');
        setProfilePicture('');
        setNewUsername('');
        setStats({ totalScans: 0, weekScans: 0, uniqueSpecies: 0 });
        setSubscription(null);
      } else if (user) {
        setUsername(user.displayName || t('common.welcome'));
        setEmail(user.email || t('common.loading'));
        setProfilePicture(user.photoURL || '');
        setNewUsername(user.displayName || t('common.welcome'));
        
        await loadStats(user.uid);
        await loadSubscription(user.uid);
      }
    };
    
    loadUserData();
  }, [route?.params?.guest, t]);

  // Add this useEffect to reload subscription when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      const user = auth.currentUser;
      if (user && !isGuest) {
        await loadSubscription(user.uid);
      }
    });

    return unsubscribe;
  }, [navigation, isGuest]);

  const loadSubscription = async (userId) => {
    setLoadingSubscription(true);
    try {
      const result = await getUserSubscription(userId);
      if (result.success) {
        setSubscription(result);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      setSubscription(null);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const loadStats = async (userId) => {
    setIsLoadingStats(true);
    try {
      const result = await getScanStats(userId);
      if (result.success && result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleSync = async () => {
    const user = auth.currentUser;
    if (!user || isGuest) return;
    
    setIsSyncing(true);
    try {
      const result = await syncPendingScans(user.uid);
      if (result.success) {
        Alert.alert(
          t('common.success'),
          t('profile.alerts.syncSuccess', { count: result.synced })
        );
        await loadStats(user.uid);
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const StatCard = ({ icon, title, value, color, gradient }) => (
    <View style={[styles.statCard, { backgroundColor: color }]}>
      <View style={styles.statIconCircle}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const MenuItem = ({ icon, title, subtitle, onPress, color, showBadge, showPremiumBadge }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <View style={styles.menuContent}>
        <View style={styles.menuTitleRow}>
          <Text style={styles.menuTitle}>{title}</Text>
          {showPremiumBadge && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={12} color="#FFD700" />
              <Text style={styles.premiumBadgeText}>Premium</Text>
            </View>
          )}
        </View>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      {showBadge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{t('profile.badgeNew')}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={22} color="#999" />
    </TouchableOpacity>
  );

  const saveUsername = async () => {
    if (isGuest) return;

    if (newUsername !== username && newUsername.trim() !== '') {
      try {
        const authInstance = getAuth();
        const user = authInstance.currentUser;

        if (!user) {
          console.error('No authenticated user found');
          return;
        }

        await updateProfile(user, {
          displayName: newUsername,
        });

        setUsername(newUsername);
        setIsEditing(false);
        Alert.alert(t('common.success'), t('profile.alerts.usernameUpdated'));
      } catch (error) {
        console.error('Error updating username: ', error);
        Alert.alert(t('common.error'), t('profile.alerts.usernameUpdateError'));
      }
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      t('profile.alerts.signOutTitle'),
      t('profile.alerts.signOutMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.alerts.signOutConfirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              await clearAllUserData();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert(t('common.error'), t('profile.alerts.signOutError'));
            }
          },
        },
      ]
    );
  };

  const isPremium = subscription?.isActive && subscription?.tier === 'premium';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5E936C" />
      
      {/* Custom Header with Gradient Effect */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          {!isGuest ? (
            <TouchableOpacity 
              style={styles.syncButton}
              onPress={handleSync}
              disabled={isSyncing}
              activeOpacity={0.7}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="cloud-upload-outline" size={24} color="#fff" />
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
          
          <Text style={styles.headerTitle}>{t('profile.title')}</Text>
          
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings', { guest: isGuest })}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Profile Avatar Section */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {username ? username.charAt(0).toUpperCase() : 'G'}
                </Text>
              </View>
            )}
            {/* Premium Crown Badge on Avatar */}
            {isPremium && (
              <View style={styles.premiumCrown}>
                <Ionicons name="star" size={20} color="#FFD700" />
              </View>
            )}
          </View>
          <View style={styles.userInfo}>
            {isEditing ? (
              <View style={styles.editContainer}>
                <TextInput
                  style={styles.usernameInput}
                  value={newUsername}
                  onChangeText={setNewUsername}
                  autoFocus
                  placeholder={t('profile.editPlaceholder')}
                  placeholderTextColor="#ccc"
                />
                <View style={styles.editActions}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={() => {
                      setIsEditing(false);
                      setNewUsername(username);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.saveButton} 
                    onPress={saveUsername}
                  >
                    <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.usernameRow}>
                  <Text style={styles.username}>{username}</Text>
                  {!isGuest && (
                    <TouchableOpacity 
                      style={styles.editIconButton}
                      onPress={() => setIsEditing(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil" size={18} color="#5E936C" />
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.email}>{email}</Text>
                {/* Premium Status Label */}
                {isPremium && (
                  <View style={styles.premiumStatusBadge}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.premiumStatusText}>
                      LeafNest Premium • {subscription.daysRemaining} days left
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Statistics Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('profile.statsTitle')}</Text>
            {!isGuest && (
              <TouchableOpacity 
                onPress={() => navigation.navigate('ScanStats', { userId: auth.currentUser?.uid })}
              >
                <Text style={styles.viewAllText}>{t('profile.viewAll')}</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {isGuest ? (
            <View style={styles.guestPrompt}>
              <View style={styles.guestIconContainer}>
                <Ionicons name="bar-chart-outline" size={48} color="#5E936C" />
              </View>
              <Text style={styles.guestPromptTitle}>{t('profile.guestPromptTitle')}</Text>
              <Text style={styles.guestPromptText}>
                {t('profile.guestPromptText')}
              </Text>
            </View>
          ) : (
            <>
              {isLoadingStats ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#5E936C" />
                </View>
              ) : (
                <View style={styles.statsGrid}>
                  <StatCard
                    icon="scan"
                    title={t('profile.stats.total')}
                    value={stats.totalScans || 0}
                    color="#4CAF50"
                  />
                  <StatCard
                    icon="calendar"
                    title={t('profile.stats.week')}
                    value={stats.weekScans || 0}
                    color="#2196F3"
                  />
                  <StatCard
                    icon="planet"
                    title={t('profile.stats.species')}
                    value={stats.uniqueSpecies || 0}
                    color="#FF9800"
                  />
                </View>
              )}
            </>
          )}
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('profile.sections.account')}</Text>
          
          {!isGuest ? (
            <>
              <MenuItem
                icon="star-outline"
                title={t('profile.menu.planTitle')}
                subtitle={
                  loadingSubscription 
                    ? "Loading..." 
                    : isPremium 
                      ? `Expires ${new Date(subscription.expiryDate).toLocaleDateString()}`
                      : t('profile.menu.planSubtitle')
                }
                color="#FF9800"
                onPress={() => navigation.navigate("PlanScreen")}
                showPremiumBadge={isPremium}
              />
              <MenuItem
                icon="notifications-outline"
                title={t('profile.menu.notificationsTitle')}
                subtitle={t('profile.menu.notificationsSubtitle')}
                color="#9C27B0"
                onPress={() => navigation.navigate('ManageNotifications')}
              />
              <MenuItem
                icon="key-outline"
                title={t('profile.menu.passwordTitle')}
                subtitle={t('profile.menu.passwordSubtitle')}
                color="#FF9800"
                onPress={() => navigation.navigate('ForgotPassword')}
              />
              <MenuItem
                icon="log-out-outline"
                title={t('profile.menu.signOutTitle')}
                subtitle={t('profile.menu.signOutSubtitle')}
                color="#F44336"
                onPress={handleSignOut}
              />
            </>
          ) : (
            <>
              <MenuItem
                icon="log-in-outline"
                title={t('profile.menu.signInTitle')}
                subtitle={t('profile.menu.signInSubtitle')}
                color="#4CAF50"
                onPress={() => navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })}
              />
              <MenuItem
                icon="person-add-outline"
                title={t('profile.menu.createAccountTitle')}
                subtitle={t('profile.menu.createAccountSubtitle')}
                color="#2196F3"
                onPress={() => navigation.navigate('SignUp')}
                showBadge
              />
            </>
          )}
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>LeafNest v1.0.0</Text>
          <Text style={styles.copyrightText}>© 2025 LeafNest. All rights reserved.</Text>
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
  headerContainer: {
    backgroundColor: '#5E936C',
    paddingTop: 50,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#5E936C',
  },
  premiumCrown: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  userInfo: {
    alignItems: 'center',
    width: '100%',
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  editIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  email: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 4,
  },
  premiumStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  premiumStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
  },
  editContainer: {
    width: '100%',
    alignItems: 'center',
  },
  usernameInput: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    width: '80%',
    textAlign: 'center',
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  saveButtonText: {
    color: '#5E936C',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#5E936C',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  guestPrompt: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  guestIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  guestPromptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  guestPromptText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5E936C',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuItem: {
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
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuContent: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  premiumBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF9800',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  badge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: '#bbb',
  },
});