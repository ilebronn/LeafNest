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
  Alert 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, updateProfile, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { clearAllUserData } from '../utils/userUtils';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ route, navigation }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [isGuest, setIsGuest] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    
    // ✅ Properly determine guest status
    const guestParam = route?.params?.guest;
    const isUserGuest = !user || guestParam === true;
    
    console.log('ProfileScreen Auth check:', { 
      hasUser: !!user, 
      userEmail: user?.email,
      guestParam, 
      isUserGuest 
    });
    
    setIsGuest(isUserGuest);
    
    // Reset editing mode if user is guest
    if (isUserGuest) {
      setIsEditing(false);
    }
    
    const loadUserData = async () => {
      if (isUserGuest) {
        // Guest user
        await clearAllUserData();
        setUsername(t('common.guest') + ' User');
        setEmail('guest@leafnest.app');
        setProfilePicture('');
        setNewUsername('');
      } else if (user) {
        // Authenticated user
        setUsername(user.displayName || t('common.welcome'));
        setEmail(user.email || t('common.loading'));
        setProfilePicture(user.photoURL || '');
        setNewUsername(user.displayName || t('common.welcome'));
      }
    };
    
    loadUserData();
  }, [route?.params?.guest, t]);

  const ProfileCard = ({ icon, title, value, color }) => (
    <View style={[styles.card, { backgroundColor: color }]}>
      <View style={styles.cardContent}>
        <Ionicons name={icon} size={24} color="#fff" />
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
      </View>
    </View>
  );

  const MenuItem = ({ icon, title, subtitle, onPress, color }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={22} color="#fff" />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  // Function to save the new username to Firebase
  const saveUsername = async () => {
    if (isGuest) {
      console.warn('Guest users cannot edit username');
      return;
    }

    if (newUsername !== username && newUsername.trim() !== '') {
      try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
          console.error('No authenticated user found');
          return;
        }

        // Update the username in Firebase
        await updateProfile(user, {
          displayName: newUsername,
        });

        setUsername(newUsername);
        setIsEditing(false);
        Alert.alert('Success', 'Username updated successfully!');
      } catch (error) {
        console.error('Error updating username: ', error);
        Alert.alert('Error', 'Failed to update username');
      }
    }
  };

  // ✅ Handle Sign Out properly
  const handleSignOut = async () => {
    try {
      console.log('Signing out user...');
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Clear all user data
      await clearAllUserData();
      
      console.log('✅ User signed out successfully');
      
      // ✅ Navigate to Login screen and reset navigation stack
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
      
    } catch (error) {
      console.error('❌ Sign out error:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>{t('profile.title') || 'Profile'}</Text>
        
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.profileCard}>
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
          </View>
          
          {/* Only show username input if NOT a guest AND editing is active */}
          {!isGuest && isEditing ? (
            <TextInput
              style={styles.usernameInput}
              value={newUsername}
              onChangeText={setNewUsername}
              autoFocus
            />
          ) : (
            <Text style={styles.username}>{username}</Text>
          )}
          
          <Text style={styles.email}>{email}</Text>
          
          {/* Only show edit/save buttons if NOT a guest */}
          {!isGuest && (
            <>
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={() => setIsEditing(!isEditing)}
              >
                <Text style={styles.editButtonText}>
                  {isEditing ? t('common.cancel') : t('profile.editUsername')}
                </Text>
              </TouchableOpacity>
              {isEditing && (
                <TouchableOpacity 
                  style={styles.saveButton} 
                  onPress={saveUsername}
                >
                  <Text style={styles.saveButtonText}>{t('common.save')}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          {!isGuest ? (
            <>
              <MenuItem
                icon="log-out"
                title={t('profile.signOut')}
                subtitle={t('profile.leaveAccount')}
                color="#F44336"
                onPress={handleSignOut}
              />
            </>
          ) : (
            <>
              <MenuItem
                icon="log-in"
                title={t('profile.signIn')}
                subtitle={t('profile.accessFullFeatures')}
                color="#4CAF50"
                onPress={() => navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })}
              />
              <MenuItem
                icon="person-add"
                title={t('profile.createAccount')}
                subtitle={t('profile.joinLeafNest')}
                color="#2196F3"
                onPress={() => navigation.navigate('SignUp')}
              />
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    height: 200,
    backgroundColor: '#5E936C',
    paddingHorizontal: 20,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    top: -50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    top: -50,
    marginRight: 48, 
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    top: -50,
  },
  profileSection: {
    paddingHorizontal: 20,
    marginTop: -50,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#5E936C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#5E936C',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  usernameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 5,
    width: '80%',
    textAlign: 'center',
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  editButton: {
    backgroundColor: '#5E936C',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
  },
  cardContent: {
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 12,
    color: '#fff',
    marginTop: 5,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5,
  },
  menuSection: {
    marginTop: 30,
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginVertical: 8,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
});