// firestoreService.js - COMPLETE FILE WITH ALL FUNCTIONS
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
  serverTimestamp,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  limit
} from './firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { auth } from './firebase';

// Helper to check network status
const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected;
};

// Helper to get AsyncStorage keys
const getHistoryKey = (uid) => uid ? `history_${uid}` : 'history_guest';
const getFavoritesKey = (uid) => uid ? `favorites_${uid}` : 'favorites_guest';

// ==================== IMAGE UPLOAD FUNCTIONS ====================

// Upload image to Firebase Storage
export const uploadImageToStorage = async (imageUri, userId, folder = 'scans') => {
  try {
    if (!imageUri || !userId) {
      return { success: false, error: 'Missing image URI or user ID' };
    }

    // Create unique filename
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, `${folder}/${userId}/${filename}`);
    
    // Fetch the image and convert to blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Upload to Firebase Storage
    await uploadBytes(storageRef, blob);
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log('Image uploaded successfully:', downloadURL);
    return { 
      success: true, 
      url: downloadURL, 
      path: storageRef.fullPath 
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { success: false, error: error.message };
  }
};

// Delete image from Firebase Storage
export const deleteImageFromStorage = async (imagePath) => {
  try {
    if (!imagePath) {
      return { success: true }; // No image to delete
    }

    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    
    console.log('Image deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('Error deleting image:', error);
    return { success: false, error: error.message };
  }
};

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

// ==================== PUBLIC FEED FUNCTIONS ====================

/**
 * Toggle the public/private status of a history item
 */
export const toggleHistoryItemVisibility = async (userId, historyId, isPublic) => {
  try {
    const online = await isOnline();
    
    if (!online) {
      return { success: false, error: 'offline' };
    }

    if (!userId || !historyId) {
      return { success: false, error: 'Missing userId or historyId' };
    }

    // Update in Firestore
    const historyRef = doc(db, 'users', userId, 'history', historyId);
    await updateDoc(historyRef, {
      isPublic: isPublic,
      lastModified: serverTimestamp(),
    });

    // If setting to public, also add/update in publicScans collection
    if (isPublic) {
      const historyDoc = await getDoc(historyRef);
      
      if (historyDoc.exists()) {
        const historyData = historyDoc.data();
        
        // Create or update public scan document
        const publicScanRef = doc(db, 'publicScans', historyId);
        await setDoc(publicScanRef, {
          userId: userId,
          userName: auth.currentUser?.displayName || auth.currentUser?.email || 'Anonymous',
          historyId: historyId,
          name: historyData.plantName || historyData.name,
          scientificName: historyData.scientificName,
          commonName: historyData.commonName,
          taxonId: historyData.taxonId,
          rank: historyData.rank,
          iconicTaxon: historyData.iconicTaxon,
          imageUrl: historyData.imageUrl,
          conservation: historyData.conservation,
          about: historyData.about,
          globalObsCount: historyData.globalObsCount || 0,
          createdAt: historyData.timestamp || serverTimestamp(),
          publishedAt: serverTimestamp(),
        });
        
        console.log('✅ Added to public feed');
      }
    } else {
      // If setting to private, remove from publicScans collection
      try {
        const publicScanRef = doc(db, 'publicScans', historyId);
        await deleteDoc(publicScanRef);
        console.log('✅ Removed from public feed');
      } catch (error) {
        console.warn('Public scan doc may not exist:', error);
      }
    }

    // Update in AsyncStorage
    const storageKey = getHistoryKey(userId);
    const existing = await AsyncStorage.getItem(storageKey);
    if (existing) {
      const list = JSON.parse(existing);
      const updatedList = list.map(item => 
        item.id === historyId ? { ...item, isPublic } : item
      );
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedList));
    }

    return { success: true, isPublic };
  } catch (error) {
    console.error('Error toggling visibility:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all public scans from all users (for the home feed)
 */
export const getPublicScans = async (limitCount = 50) => {
  try {
    const online = await isOnline();
    
    if (!online) {
      return { success: false, data: [], error: 'offline' };
    }

    const publicScansRef = collection(db, 'publicScans');
    const q = query(
      publicScansRef, 
      orderBy('publishedAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    
    const publicScans = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      publicScans.push({
        id: doc.id,
        ...data,
        createdAt: data.publishedAt?.toMillis() || data.createdAt?.toMillis() || Date.now(),
      });
    });

    console.log(`✅ Loaded ${publicScans.length} public scans`);
    return { success: true, data: publicScans };
  } catch (error) {
    console.error('Error getting public scans:', error);
    return { success: false, data: [], error: error.message };
  }
};

/**
 * Get public scans from a specific user
 */
export const getUserPublicScans = async (userId, limitCount = 20) => {
  try {
    const online = await isOnline();
    
    if (!online) {
      return { success: false, data: [], error: 'offline' };
    }

    const publicScansRef = collection(db, 'publicScans');
    const q = query(
      publicScansRef,
      where('userId', '==', userId),
      orderBy('publishedAt', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    
    const userPublicScans = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      userPublicScans.push({
        id: doc.id,
        ...data,
        createdAt: data.publishedAt?.toMillis() || data.createdAt?.toMillis() || Date.now(),
      });
    });

    return { success: true, data: userPublicScans };
  } catch (error) {
    console.error('Error getting user public scans:', error);
    return { success: false, data: [], error: error.message };
  }
};

// ==================== HISTORY (UPDATED WITH PUBLIC/PRIVATE) ====================

export const addToHistory = async (userId, historyData) => {
  try {
    const storageKey = getHistoryKey(userId);
    let uploadedImageUrl = historyData.imageUrl;
    let imagePath = null;

    // Get existing history first
    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];

    // Check if this species already exists in history (by name or taxonId)
    const existingIndex = list.findIndex(item => {
      // Match by taxonId (most accurate)
      if (historyData.taxonId && item.taxonId) {
        return item.taxonId === historyData.taxonId;
      }
      // Fallback: Match by name (scientificName or plantName)
      const itemName = (item.plantName || item.name || item.scientificName || '').toLowerCase().trim();
      const dataName = (historyData.plantName || historyData.name || historyData.scientificName || '').toLowerCase().trim();
      return itemName === dataName && itemName !== '';
    });

    let oldFirestoreId = null;
    let wasPublic = false;

    // If found, remove the old entry (we'll add updated one to top)
    if (existingIndex !== -1) {
      const existingItem = list[existingIndex];
      oldFirestoreId = existingItem.synced ? existingItem.id : null;
      wasPublic = existingItem.isPublic || false;
      
      // Delete old image if it exists and we're uploading a new one
      if (existingItem.imagePath && historyData.imageUri) {
        await deleteImageFromStorage(existingItem.imagePath);
      } else if (!historyData.imageUri) {
        // Keep the old image if no new image provided
        uploadedImageUrl = existingItem.imageUrl;
        imagePath = existingItem.imagePath;
      }
      
      // Remove the old entry
      list.splice(existingIndex, 1);
      console.log('✅ Moved existing history item to top:', historyData.plantName || historyData.name);
    }

    // Upload new image to Firebase Storage if user is authenticated and online
    const online = await isOnline();
    if (online && userId && historyData.imageUri) {
      const uploadResult = await uploadImageToStorage(historyData.imageUri, userId, 'history');
      if (uploadResult.success) {
        uploadedImageUrl = uploadResult.url;
        imagePath = uploadResult.path;
        console.log('Image uploaded for history item:', uploadedImageUrl);
      }
    }

    const itemWithId = {
      ...historyData,
      imageUrl: uploadedImageUrl,
      imagePath: imagePath,
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      synced: false,
      isPublic: false, // Default to private for new scans
    };

    // Remove imageUri from storage (we don't need the local URI anymore)
    delete itemWithId.imageUri;

    // Add to the beginning of the array (most recent first)
    list.unshift(itemWithId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(list));

    // Try to sync to Firestore if online
    if (online && userId) {
      try {
        // If item existed in Firestore, delete the old one first
        if (oldFirestoreId) {
          try {
            await deleteDoc(doc(db, 'users', userId, 'history', oldFirestoreId));
            console.log('Deleted old Firestore history entry');
            
            // If it was public, also remove from publicScans
            if (wasPublic) {
              try {
                await deleteDoc(doc(db, 'publicScans', oldFirestoreId));
                console.log('Deleted old public scan entry');
              } catch (pubError) {
                console.warn('Failed to delete old public scan:', pubError);
              }
            }
          } catch (deleteError) {
            console.warn('Failed to delete old Firestore entry:', deleteError);
          }
        }

        // Add new entry to Firestore
        const historyRef = collection(db, 'users', userId, 'history');
        const docRef = await addDoc(historyRef, {
          ...historyData,
          imageUrl: uploadedImageUrl,
          imagePath: imagePath,
          timestamp: serverTimestamp(),
          isPublic: false, // Default to private
        });
        
        // Update the item with Firestore doc ID and mark as synced
        itemWithId.id = docRef.id;
        itemWithId.synced = true;
        list[0] = itemWithId; // Update the first item
        await AsyncStorage.setItem(storageKey, JSON.stringify(list));
        console.log('History saved to Firestore with image');
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

    // Get the item to find its image path and public status
    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];
    const itemToDelete = list.find(item => item.id === historyId);

    // Delete image from Storage if it exists
    if (itemToDelete && itemToDelete.imagePath) {
      await deleteImageFromStorage(itemToDelete.imagePath);
    }

    // If item was public, remove from publicScans collection
    const online = await isOnline();
    if (online && itemToDelete && itemToDelete.isPublic) {
      try {
        const publicScanRef = doc(db, 'publicScans', historyId);
        await deleteDoc(publicScanRef);
        console.log('Public scan deleted from feed');
      } catch (error) {
        console.warn('Failed to delete public scan:', error);
      }
    }

    // Delete from AsyncStorage
    const filtered = list.filter(item => item.id !== historyId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));

    // Try to delete from Firestore if online
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

    // Get all items to delete their images and public entries
    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];

    // Delete all images from Storage
    const deleteImagePromises = list
      .filter(item => item.imagePath)
      .map(item => deleteImageFromStorage(item.imagePath));
    
    await Promise.all(deleteImagePromises);

    // Delete all public scans
    const online = await isOnline();
    if (online) {
      const deletePublicPromises = list
        .filter(item => item.isPublic)
        .map(item => {
          try {
            return deleteDoc(doc(db, 'publicScans', item.id));
          } catch (error) {
            console.warn(`Failed to delete public scan ${item.id}:`, error);
            return Promise.resolve();
          }
        });
      
      await Promise.all(deletePublicPromises);
      console.log('All public scans removed from feed');
    }

    // Clear AsyncStorage
    await AsyncStorage.setItem(storageKey, JSON.stringify([]));

    // Try to clear Firestore if online
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
    let uploadedImageUrl = favoriteData.imageUrl;
    let imagePath = null;

    // Upload image to Firebase Storage if user is authenticated and online
    const online = await isOnline();
    if (online && userId && favoriteData.imageUri) {
      const uploadResult = await uploadImageToStorage(favoriteData.imageUri, userId, 'favorites');
      if (uploadResult.success) {
        uploadedImageUrl = uploadResult.url;
        imagePath = uploadResult.path;
        console.log('Image uploaded for favorite item:', uploadedImageUrl);
      }
    }

    const itemWithId = {
      ...favoriteData,
      imageUrl: uploadedImageUrl,
      imagePath: imagePath,
      id: `favorite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: Date.now(),
      synced: false,
    };

    // Remove imageUri from storage
    delete itemWithId.imageUri;

    // Always save to AsyncStorage first
    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];
    list.unshift(itemWithId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(list));

    // Try to sync to Firestore if online
    if (online && userId) {
      try {
        const favoritesRef = collection(db, 'users', userId, 'favorites');
        await addDoc(favoritesRef, {
          ...favoriteData,
          imageUrl: uploadedImageUrl,
          imagePath: imagePath,
          addedAt: serverTimestamp(),
        });
        
        itemWithId.synced = true;
        await AsyncStorage.setItem(storageKey, JSON.stringify(list));
        console.log('Favorite saved to Firestore with image');
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

    // Get the item to find its image path
    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];
    const itemToDelete = list.find(item => item.id === favoriteId);

    // Delete image from Storage if it exists
    if (itemToDelete && itemToDelete.imagePath) {
      await deleteImageFromStorage(itemToDelete.imagePath);
    }

    // Remove from AsyncStorage
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

// ==================== GLOBAL OBSERVATIONS ====================

export const incrementGlobalObservation = async (speciesData) => {
  try {
    const online = await isOnline();
    
    if (!online) {
      console.log('Offline: Global observation will sync when online');
      return { success: false, error: 'offline' };
    }

    // Use taxonId as document ID for accuracy, fallback to normalized name
    const docId = speciesData.taxonId 
      ? `taxon_${speciesData.taxonId}` 
      : (speciesData.scientificName || speciesData.name || '').toLowerCase().replace(/\s+/g, '_');

    if (!docId) {
      return { success: false, error: 'No valid identifier' };
    }

    const observationRef = doc(db, 'globalObservations', docId);
    const observationDoc = await getDoc(observationRef);

    if (observationDoc.exists()) {
      // Increment existing count
      const currentCount = observationDoc.data().count || 0;
      await updateDoc(observationRef, {
        count: currentCount + 1,
        lastScanned: serverTimestamp(),
      });
      console.log(`✅ Global observation incremented: ${currentCount + 1}`);
      return { success: true, count: currentCount + 1 };
    } else {
      // Create new observation record
      await setDoc(observationRef, {
        speciesName: speciesData.name || speciesData.scientificName,
        scientificName: speciesData.scientificName,
        commonName: speciesData.commonName,
        taxonId: speciesData.taxonId,
        count: 1,
        firstScanned: serverTimestamp(),
        lastScanned: serverTimestamp(),
      });
      console.log('✅ Global observation created: 1');
      return { success: true, count: 1 };
    }
  } catch (error) {
    console.error('Error incrementing global observation:', error);
    return { success: false, error: error.message };
  }
};

export const getGlobalObservationCounts = async (speciesArray) => {
  try {
    const online = await isOnline();
    
    if (!online) {
      return { success: false, counts: {} };
    }

    const counts = {};
    
    // Fetch counts for each species
    for (const species of speciesArray) {
      if (!species.taxonId && !species.scientificName && !species.name) continue;
      
      const docId = species.taxonId 
        ? `taxon_${species.taxonId}` 
        : (species.scientificName || species.name || '').toLowerCase().replace(/\s+/g, '_');

      if (!docId) continue;

      try {
        const observationRef = doc(db, 'globalObservations', docId);
        const observationDoc = await getDoc(observationRef);

        if (observationDoc.exists()) {
          counts[docId] = observationDoc.data().count || 0;
        } else {
          counts[docId] = 0;
        }
      } catch (error) {
        console.warn(`Failed to fetch count for ${docId}:`, error);
        counts[docId] = 0;
      }
    }

    return { success: true, counts };
  } catch (error) {
    console.error('Error getting global observation counts:', error);
    return { success: false, counts: {} };
  }
};


// ==================== TRENDING SPECIES (IMPROVED) ====================

export const getTrendingSpecies = async (limitCount = 10, daysBack = 7) => {
  try {
    const online = await isOnline();
    
    if (!online) {
      return { success: false, data: [], error: 'offline' };
    }

    // Calculate timestamp for X days ago (in milliseconds)
    const daysAgoTimestamp = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
    const daysAgoDate = new Date(daysAgoTimestamp);

    // Get all observations from globalObservations collection
    const globalObsRef = collection(db, 'globalObservations');
    const q = query(globalObsRef, orderBy('lastScanned', 'desc'));
    
    const querySnapshot = await getDocs(q);
    
    const trendingSpecies = [];
    
    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();
      
      // Get the timestamp (convert Firestore timestamp to milliseconds)
      const lastScanned = data.lastScanned?.toMillis?.() || data.lastScanned || 0;
      
      // Only include species scanned in the last X days
      if (lastScanned >= daysAgoTimestamp) {
        // Fetch additional details from iNaturalist if we have a taxonId
        let imageUrl = null;
        let iconicTaxon = null;
        let rank = null;
        let about = null;
        
        if (data.taxonId) {
          try {
            // Fetch from publicScans first (faster, already has the data)
            const publicScansRef = collection(db, 'publicScans');
            const publicQuery = query(
              publicScansRef,
              where('taxonId', '==', data.taxonId),
              limit(1)
            );
            const publicSnapshot = await getDocs(publicQuery);
            
            if (!publicSnapshot.empty) {
              const publicData = publicSnapshot.docs[0].data();
              imageUrl = publicData.imageUrl;
              iconicTaxon = publicData.iconicTaxon;
              rank = publicData.rank;
              about = publicData.about;
            }
          } catch (error) {
            console.warn('Failed to fetch additional details:', error);
          }
        }
        
        trendingSpecies.push({
          taxonId: data.taxonId,
          name: data.speciesName || data.scientificName,
          scientificName: data.scientificName,
          commonName: data.commonName,
          count: data.count || 0,
          lastScanned: lastScanned,
          firstScanned: data.firstScanned?.toMillis?.() || data.firstScanned || lastScanned,
          imageUrl: imageUrl,
          iconicTaxon: iconicTaxon,
          rank: rank,
          about: about,
          globalObsCount: data.count || 0,
        });
      }
    }
    
    // Sort by scan count (descending), then by most recent
    trendingSpecies.sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }
      return b.lastScanned - a.lastScanned;
    });
    
    // Return top X species
    const topTrending = trendingSpecies.slice(0, limitCount);
    
    console.log(`✅ Loaded ${topTrending.length} trending species (based on all scans)`);
    return { success: true, data: topTrending };
  } catch (error) {
    console.error('Error getting trending species:', error);
    return { success: false, data: [], error: error.message };
  }
};

/**
 * Get trending species by specific category (Plants, Animals, etc.)
 */
export const getTrendingByCategory = async (iconicTaxon, limitCount = 10, daysBack = 7) => {
  try {
    const result = await getTrendingSpecies(100, daysBack); // Get more results to filter
    
    if (!result.success) {
      return result;
    }

    // Filter by iconicTaxon category
    const filtered = result.data
      .filter(species => {
        if (!species.iconicTaxon) return false;
        return species.iconicTaxon.toLowerCase().includes(iconicTaxon.toLowerCase());
      })
      .slice(0, limitCount);

    return { success: true, data: filtered };
  } catch (error) {
    console.error('Error getting trending by category:', error);
    return { success: false, data: [], error: error.message };
  }
};

/**
 * Get trending statistics for the app
 */
export const getTrendingStats = async () => {
  try {
    const online = await isOnline();
    
    if (!online) {
      return { success: false, error: 'offline' };
    }

    const globalObsRef = collection(db, 'globalObservations');
    const querySnapshot = await getDocs(globalObsRef);
    
    let totalScans = 0;
    let totalSpecies = querySnapshot.size;
    let mostScanned = null;
    let maxCount = 0;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const count = data.count || 0;
      totalScans += count;
      
      if (count > maxCount) {
        maxCount = count;
        mostScanned = {
          name: data.speciesName || data.scientificName,
          commonName: data.commonName,
          count: count,
        };
      }
    });
    
    return {
      success: true,
      stats: {
        totalScans,
        totalSpecies,
        mostScanned,
      },
    };
  } catch (error) {
    console.error('Error getting trending stats:', error);
    return { success: false, error: error.message };
  }
};