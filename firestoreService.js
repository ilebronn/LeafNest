// firestoreService.js
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Helper to check network status
const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected;
};

// Helper to get AsyncStorage keys
const getHistoryKey = (uid) => uid ? `history_${uid}` : 'history_guest';
const getFavoritesKey = (uid) => uid ? `favorites_${uid}` : 'favorites_guest';

// ==================== USER PROFILE ====================

export const createUserProfile = async (userId, email, displayName = '') => {
  try {
    const online = await isOnline();
    
    if (online) {
      await setDoc(doc(db, 'users', userId), {
        email: email,
        displayName: displayName,
        createdAt: serverTimestamp(),
      });
      console.log('User profile created in Firestore');
    } else {
      console.log('Offline: User profile will sync when online');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

export const getUserProfile = async (userId) => {
  try {
    const online = await isOnline();
    
    if (online) {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        return { success: true, data: userDoc.data() };
      }
    }
    
    return { success: false, error: 'User profile not found' };
  } catch (error) {
    console.error('Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    const online = await isOnline();
    
    if (online) {
      await updateDoc(doc(db, 'users', userId), updates);
    }
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};

// ==================== HISTORY ====================

export const addToHistory = async (userId, historyData) => {
  try {
    const storageKey = getHistoryKey(userId);
    const itemWithId = {
      ...historyData,
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      synced: false,
    };

    // Always save to AsyncStorage first (offline-first)
    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];
    list.unshift(itemWithId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(list));

    // Try to sync to Firestore if online
    const online = await isOnline();
    if (online && userId) {
      try {
        const historyRef = collection(db, 'users', userId, 'history');
        await addDoc(historyRef, {
          ...historyData,
          timestamp: serverTimestamp(),
        });
        
        // Mark as synced in AsyncStorage
        itemWithId.synced = true;
        await AsyncStorage.setItem(storageKey, JSON.stringify(list));
        console.log('History saved to Firestore');
      } catch (firestoreError) {
        console.warn('Firestore save failed, kept in AsyncStorage:', firestoreError);
      }
    }

    return { success: true, id: itemWithId.id };
  } catch (error) {
    console.error('Error adding to history:', error);
    return { success: false, error: error.message };
  }
};

export const getHistory = async (userId) => {
  try {
    const storageKey = getHistoryKey(userId);
    const online = await isOnline();

    // Try to get from Firestore if online
    if (online && userId) {
      try {
        const historyRef = collection(db, 'users', userId, 'history');
        const q = query(historyRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const firestoreItems = [];
        querySnapshot.forEach((doc) => {
          firestoreItems.push({
            id: doc.id,
            ...doc.data(),
            synced: true,
          });
        });

        // Save to AsyncStorage for offline access
        await AsyncStorage.setItem(storageKey, JSON.stringify(firestoreItems));
        console.log('History loaded from Firestore');
        
        return { success: true, data: firestoreItems };
      } catch (firestoreError) {
        console.warn('Firestore fetch failed, using local data:', firestoreError);
      }
    }

    // Fallback to AsyncStorage (offline mode)
    const local = await AsyncStorage.getItem(storageKey);
    const localItems = local ? JSON.parse(local) : [];
    console.log('History loaded from AsyncStorage (offline)');
    
    return { success: true, data: localItems };
  } catch (error) {
    console.error('Error getting history:', error);
    return { success: false, error: error.message };
  }
};

export const deleteHistoryItem = async (userId, historyId) => {
  try {
    const storageKey = getHistoryKey(userId);

    // Delete from AsyncStorage
    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];
    const filtered = list.filter(item => item.id !== historyId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));

    // Try to delete from Firestore if online
    const online = await isOnline();
    if (online && userId) {
      try {
        await deleteDoc(doc(db, 'users', userId, 'history', historyId));
        console.log('History item deleted from Firestore');
      } catch (firestoreError) {
        console.warn('Firestore delete failed:', firestoreError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting history item:', error);
    return { success: false, error: error.message };
  }
};

export const clearAllHistory = async (userId) => {
  try {
    const storageKey = getHistoryKey(userId);

    // Clear AsyncStorage
    await AsyncStorage.setItem(storageKey, JSON.stringify([]));

    // Try to clear Firestore if online
    const online = await isOnline();
    if (online && userId) {
      try {
        const historyRef = collection(db, 'users', userId, 'history');
        const querySnapshot = await getDocs(historyRef);
        
        const deletePromises = [];
        querySnapshot.forEach((doc) => {
          deletePromises.push(deleteDoc(doc.ref));
        });
        
        await Promise.all(deletePromises);
        console.log('All history cleared from Firestore');
      } catch (firestoreError) {
        console.warn('Firestore clear failed:', firestoreError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error clearing history:', error);
    return { success: false, error: error.message };
  }
};

// ==================== FAVORITES ====================

export const addToFavorites = async (userId, favoriteData) => {
  try {
    const storageKey = getFavoritesKey(userId);
    const itemWithId = {
      ...favoriteData,
      id: `favorite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: Date.now(),
      synced: false,
    };

    // Always save to AsyncStorage first
    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];
    list.unshift(itemWithId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(list));

    // Try to sync to Firestore if online
    const online = await isOnline();
    if (online && userId) {
      try {
        const favoritesRef = collection(db, 'users', userId, 'favorites');
        await addDoc(favoritesRef, {
          ...favoriteData,
          addedAt: serverTimestamp(),
        });
        
        itemWithId.synced = true;
        await AsyncStorage.setItem(storageKey, JSON.stringify(list));
        console.log('Favorite saved to Firestore');
      } catch (firestoreError) {
        console.warn('Firestore save failed, kept in AsyncStorage:', firestoreError);
      }
    }

    return { success: true, id: itemWithId.id };
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return { success: false, error: error.message };
  }
};

export const getFavorites = async (userId) => {
  try {
    const storageKey = getFavoritesKey(userId);
    const online = await isOnline();

    // Try to get from Firestore if online
    if (online && userId) {
      try {
        const favoritesRef = collection(db, 'users', userId, 'favorites');
        const q = query(favoritesRef, orderBy('addedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const firestoreItems = [];
        querySnapshot.forEach((doc) => {
          firestoreItems.push({
            id: doc.id,
            ...doc.data(),
            synced: true,
          });
        });

        // Save to AsyncStorage for offline access
        await AsyncStorage.setItem(storageKey, JSON.stringify(firestoreItems));
        console.log('Favorites loaded from Firestore');
        
        return { success: true, data: firestoreItems };
      } catch (firestoreError) {
        console.warn('Firestore fetch failed, using local data:', firestoreError);
      }
    }

    // Fallback to AsyncStorage (offline mode)
    const local = await AsyncStorage.getItem(storageKey);
    const localItems = local ? JSON.parse(local) : [];
    console.log('Favorites loaded from AsyncStorage (offline)');
    
    return { success: true, data: localItems };
  } catch (error) {
    console.error('Error getting favorites:', error);
    return { success: false, error: error.message };
  }
};

export const removeFromFavorites = async (userId, favoriteId) => {
  try {
    const storageKey = getFavoritesKey(userId);

    // Remove from AsyncStorage
    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];
    const filtered = list.filter(item => item.id !== favoriteId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));

    // Try to remove from Firestore if online
    const online = await isOnline();
    if (online && userId) {
      try {
        await deleteDoc(doc(db, 'users', userId, 'favorites', favoriteId));
        console.log('Favorite removed from Firestore');
      } catch (firestoreError) {
        console.warn('Firestore delete failed:', firestoreError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return { success: false, error: error.message };
  }
};

export const isInFavorites = async (userId, plantName) => {
  try {
    const storageKey = getFavoritesKey(userId);
    const local = await AsyncStorage.getItem(storageKey);
    const list = local ? JSON.parse(local) : [];
    
    const found = list.find(item => item.plantName === plantName || item.name === plantName);
    
    return { success: true, isFavorite: !!found, id: found?.id };
  } catch (error) {
    console.error('Error checking favorites:', error);
    return { success: false, error: error.message };
  }
};

// ==================== SUBSCRIPTIONS ====================

export const addSubscription = async (userId, subscriptionData) => {
  try {
    const online = await isOnline();
    
    if (online && userId) {
      const subscriptionRef = doc(db, 'users', userId, 'subscriptions', 'current');
      await setDoc(subscriptionRef, {
        ...subscriptionData,
        updatedAt: serverTimestamp(),
      });
      console.log('Subscription added/updated');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error adding subscription:', error);
    return { success: false, error: error.message };
  }
};

export const getSubscription = async (userId) => {
  try {
    const online = await isOnline();
    
    if (online && userId) {
      const subscriptionDoc = await getDoc(doc(db, 'users', userId, 'subscriptions', 'current'));
      if (subscriptionDoc.exists()) {
        return { success: true, data: subscriptionDoc.data() };
      }
    }
    
    return { success: false, error: 'No subscription found' };
  } catch (error) {
    console.error('Error getting subscription:', error);
    return { success: false, error: error.message };
  }
};

export const cancelSubscription = async (userId) => {
  try {
    const online = await isOnline();
    
    if (online && userId) {
      const subscriptionRef = doc(db, 'users', userId, 'subscriptions', 'current');
      await updateDoc(subscriptionRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
      });
      console.log('Subscription cancelled');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return { success: false, error: error.message };
  }
};