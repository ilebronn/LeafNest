// firestoreService.js - COMPLETE FILE WITH ALL FUNCTIONS (FIXED)
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
} from '@config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { auth } from '@config/firebase';

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
      console.error('âŒ Missing image URI or user ID');
      return { success: false, error: 'Missing image URI or user ID' };
    }

    // âœ… CRITICAL: Verify user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('âŒ User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    if (currentUser.uid !== userId) {
      console.error('âŒ User ID mismatch');
      console.error('Current UID:', currentUser.uid);
      console.error('Requested UID:', userId);
      return { success: false, error: 'User ID mismatch' };
    }

    console.log('User authenticated:', userId);
    console.log('¸ Image URI:', imageUri);

    // Create unique filename
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storagePath = `${folder}/${userId}/${filename}`;
    const storageRef = ref(storage, storagePath);

    console.log(' Upload path:', storagePath);

    // âœ… FIX: Handle different URI formats (file://, content://, https://)
    let blob;

    try {
      // For React Native, handle file:// URIs
      if (imageUri.startsWith('file://')) {
        console.log(' Processing file:// URI');
        const response = await fetch(imageUri);
        blob = await response.blob();
      }
      // For Android content:// URIs
      else if (imageUri.startsWith('content://')) {
        console.log(' Processing content:// URI');
        const response = await fetch(imageUri);
        blob = await response.blob();
      }
      // For data URIs or base64
      else if (imageUri.startsWith('data:')) {
        console.log(' Processing data URI');
        const response = await fetch(imageUri);
        blob = await response.blob();
      }
      // For HTTP/HTTPS URLs
      else if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
        console.log(' Processing HTTP URI');
        const response = await fetch(imageUri);
        blob = await response.blob();
      }
      // Default: try direct fetch
      else {
        console.log(' Processing unknown URI format, trying direct fetch');
        const response = await fetch(imageUri);
        blob = await response.blob();
      }

      if (!blob || blob.size === 0) {
        console.error('âŒ Blob is empty');
        return { success: false, error: 'Failed to create blob from image' };
      }

      console.log(' Blob created successfully');
      console.log(' Blob size:', blob.size, 'bytes');
      console.log(' Blob type:', blob.type);

    } catch (fetchError) {
      console.error('âŒ Failed to fetch image:', fetchError);
      console.error('âŒ Image URI was:', imageUri);
      return { success: false, error: `Failed to fetch image: ${fetchError.message}` };
    }

    // Upload to Firebase Storage with metadata
    const metadata = {
      contentType: blob.type || 'image/jpeg',
      customMetadata: {
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
      }
    };

    console.log('â³ Uploading to Firebase Storage...');
    
    // âœ… IMPORTANT: Add a timeout to catch hanging uploads
    const uploadPromise = uploadBytes(storageRef, blob, metadata);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
    );

    await Promise.race([uploadPromise, timeoutPromise]);
    console.log(' Upload successful');

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log(' Download URL obtained:', downloadURL);

    return {
      success: true,
      url: downloadURL,
      path: storageRef.fullPath
    };
  } catch (error) {
    console.error('âŒ Error uploading image:', error);
    console.error('âŒ Error code:', error.code);
    console.error('âŒ Error message:', error.message);

    // Provide more specific error messages
    if (error.code === 'storage/unauthorized') {
      console.error('âš ï¸ PERMISSION DENIED: Check Firebase Storage Rules');
      console.error('âš ï¸ Current user:', auth.currentUser?.uid);
      console.error('âš ï¸ Upload path should be:', `${folder}/${userId}/...`);
      console.error('âš ï¸ Verify Storage Rules allow write for this path');
      
      return { 
        success: false, 
        error: 'Permission denied. Please check if you are logged in and try again.' 
      };
    }

    if (error.code === 'storage/canceled') {
      return { success: false, error: 'Upload was canceled' };
    }

    if (error.code === 'storage/unknown') {
      return { success: false, error: 'Unknown error occurred during upload' };
    }

    return { success: false, error: error.message || 'Failed to upload image' };
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
    
    console.log(' Image deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('âŒ Error deleting image:', error);
    
    // Don't fail if image doesn't exist
    if (error.code === 'storage/object-not-found') {
      console.log('Image already deleted or does not exist');
      return { success: true };
    }
    
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
      console.log(' User profile created in Firestore');
    } else {
      console.log('âš ï¸ Offline: User profile will sync when online');
    }
    
    return { success: true };
  } catch (error) {
    console.error('âŒ Error creating user profile:', error);
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
    console.error('âŒ Error getting user profile:', error);
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
    console.error('âŒ Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};

// ==================== PUBLIC FEED FUNCTIONS ====================

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
          name: historyData.commonName || historyData.name,
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
        
        console.log(' Added to public feed');
      }
    } else {
      // If setting to private, remove from publicScans collection
      try {
        const publicScanRef = doc(db, 'publicScans', historyId);
        await deleteDoc(publicScanRef);
        console.log(' Removed from public feed');
      } catch (error) {
        console.warn('âš ï¸ Public scan doc may not exist:', error);
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
    console.error('âŒ Error toggling visibility:', error);
    return { success: false, error: error.message };
  }
};

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

    console.log(` Loaded ${publicScans.length} public scans`);
    return { success: true, data: publicScans };
  } catch (error) {
    console.error('âŒ Error getting public scans:', error);
    return { success: false, data: [], error: error.message };
  }
};

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
    console.error('âŒ Error getting user public scans:', error);
    return { success: false, data: [], error: error.message };
  }
};

// ==================== HISTORY (UPDATED WITH PUBLIC/PRIVATE) ====================

// âœ… NEW: Update history item timestamp without re-uploading image
export const updateHistoryTimestamp = async (userId, historyId) => {
  try {
    const storageKey = getHistoryKey(userId);
    const existing = await AsyncStorage.getItem(storageKey);
    
    if (!existing) {
      return { success: false, error: 'No history found' };
    }
    
    const list = JSON.parse(existing);
    const itemIndex = list.findIndex(item => item.id === historyId);
    
    if (itemIndex === -1) {
      return { success: false, error: 'Item not found' };
    }
    
    // Move item to top with updated timestamp
    const item = list[itemIndex];
    list.splice(itemIndex, 1);
    
    const updatedItem = {
      ...item,
      timestamp: Date.now(),
      lastViewed: Date.now(),
    };
    
    list.unshift(updatedItem);
    await AsyncStorage.setItem(storageKey, JSON.stringify(list));
    
    console.log(' History timestamp updated (no image re-upload)');
    
    // Update in Firestore if online
    const online = await isOnline();
    if (online && userId && item.synced) {
      try {
        await updateDoc(doc(db, 'users', userId, 'history', historyId), {
          timestamp: serverTimestamp(),
          lastViewed: serverTimestamp(),
        });
        console.log(' Timestamp synced to Firestore');
      } catch (error) {
        console.warn('âš ï¸ Firestore timestamp update failed:', error);
      }
    }
    
    return { success: true, item: updatedItem };
  } catch (error) {
    console.error('âŒ Error updating timestamp:', error);
    return { success: false, error: error.message };
  }
};

export const addToHistory = async (userId, historyData) => {
  try {
    console.log('📝 Adding to history for user:', userId);
    
    const storageKey = getHistoryKey(userId);
    let uploadedImageUrl = historyData.imageUrl;
    let imagePath = null;

    // ✅ FIXED: First check Firestore for existing species (if online)
    const online = await isOnline();
    let existingFirestoreId = null;
    let existingScanCount = 1;
    let wasPublic = false;

    if (online && userId) {
      try {
        const historyRef = collection(db, 'users', userId, 'history');
        let firestoreQuery = null;

        // Try to find by taxonId first
        if (historyData.taxonId) {
          firestoreQuery = query(historyRef, where('taxonId', '==', historyData.taxonId), limit(1));
        } 
        // Otherwise try by scientificName
        else if (historyData.scientificName) {
          firestoreQuery = query(historyRef, where('scientificName', '==', historyData.scientificName), limit(1));
        }
        // Otherwise try by name
        else if (historyData.name) {
          firestoreQuery = query(historyRef, where('name', '==', historyData.name), limit(1));
        }

        if (firestoreQuery) {
          const querySnapshot = await getDocs(firestoreQuery);
          if (!querySnapshot.empty) {
            const existingDoc = querySnapshot.docs[0];
            const existingData = existingDoc.data();
            
            existingFirestoreId = existingDoc.id;
            existingScanCount = (existingData.scanCount || 1) + 1;
            wasPublic = existingData.isPublic || false;
            
            console.log(`✅ Found existing species in Firestore, incrementing count to ${existingScanCount}`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Firestore lookup failed:', error);
      }
    }

    // Get existing history from AsyncStorage
    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];

    // ✅ FIXED: Remove any duplicate from AsyncStorage (in case of sync issues)
    const filteredList = list.filter(item => {
      if (existingFirestoreId && item.id === existingFirestoreId) {
        return false; // Remove if it matches the Firestore ID
      }
      if (historyData.taxonId && item.taxonId === historyData.taxonId) {
        return false; // Remove if taxonId matches
      }
      const itemName = (item.name || item.scientificName || '').toLowerCase().trim();
      const dataName = (historyData.name || historyData.scientificName || '').toLowerCase().trim();
      if (itemName === dataName && itemName !== '') {
        return false; // Remove if name matches
      }
      return true;
    });

    // ✅ ALWAYS preserve existing image data if updating
    if (existingFirestoreId) {
      const existingItem = list.find(item => item.id === existingFirestoreId);
      if (existingItem) {
        uploadedImageUrl = existingItem.imageUrl;
        imagePath = existingItem.imagePath;
      }
    }

    // Only upload NEW image if explicitly provided AND different from existing
    if (historyData.imageUri && historyData.imageUri !== uploadedImageUrl) {
      console.log('📤 New image provided, uploading...');
      if (online && userId) {
        const uploadResult = await uploadImageToStorage(historyData.imageUri, userId, 'history');
        if (uploadResult.success) {
          uploadedImageUrl = uploadResult.url;
          imagePath = uploadResult.path;
          console.log('✅ New image uploaded successfully');
        } else {
          console.warn('⚠️ New image upload failed, keeping old image');
        }
      }
    } else if (!existingFirestoreId && historyData.imageUri) {
      // NEW item - upload image if provided
      if (online && userId) {
        console.log('📤 Uploading image for NEW history item...');
        const uploadResult = await uploadImageToStorage(historyData.imageUri, userId, 'history');
        
        if (uploadResult.success) {
          uploadedImageUrl = uploadResult.url;
          imagePath = uploadResult.path;
          console.log('✅ Image uploaded successfully');
        } else {
          console.error('❌ Image upload failed:', uploadResult.error);
        }
      }
    }

    // Create updated item
    const itemWithId = {
      ...historyData,
      imageUrl: uploadedImageUrl,
      imagePath: imagePath,
      id: existingFirestoreId || `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      scanCount: existingScanCount,
      synced: false,
      isPublic: wasPublic,
    };

    delete itemWithId.imageUri;

    // Add to top of filtered list
    const updatedList = [itemWithId, ...filteredList];
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedList));
    console.log('💾 Saved to AsyncStorage (duplicates removed)');

    // ✅ Sync to Firestore - UPDATE existing doc or CREATE new one
    if (online && userId) {
      try {
        if (existingFirestoreId) {
          // ✅ UPDATE existing Firestore document
          const historyRef = doc(db, 'users', userId, 'history', existingFirestoreId);
          await updateDoc(historyRef, {
            ...historyData,
            imageUrl: uploadedImageUrl,
            imagePath: imagePath,
            timestamp: serverTimestamp(),
            scanCount: existingScanCount,
            isPublic: wasPublic,
          });
          
          console.log(`✅ Updated Firestore document with scanCount: ${existingScanCount}`);
          
          // Update public scan if it's public
          if (wasPublic) {
            const publicScanRef = doc(db, 'publicScans', existingFirestoreId);
            await updateDoc(publicScanRef, {
              name: historyData.commonName || historyData.name,
              scientificName: historyData.scientificName,
              commonName: historyData.commonName,
              imageUrl: uploadedImageUrl,
              publishedAt: serverTimestamp(),
            }).catch(err => console.warn('⚠️ Failed to update public scan:', err));
          }
          
          itemWithId.synced = true;
        } else {
          // ✅ CREATE new Firestore document
          const historyRef = collection(db, 'users', userId, 'history');
          const docRef = await addDoc(historyRef, {
            ...historyData,
            imageUrl: uploadedImageUrl,
            imagePath: imagePath,
            timestamp: serverTimestamp(),
            scanCount: existingScanCount,
            isPublic: wasPublic,
          });
          
          itemWithId.id = docRef.id;
          itemWithId.synced = true;
          console.log('✅ Created new Firestore document');
        }
        
        // Update AsyncStorage with synced ID
        const finalList = [itemWithId, ...filteredList];
        await AsyncStorage.setItem(storageKey, JSON.stringify(finalList));
        
      } catch (firestoreError) {
        console.warn('⚠️ Firestore save failed:', firestoreError);
      }
    }

    return { success: true, id: itemWithId.id };
  } catch (error) {
    console.error('❌ Error adding to history:', error);
    return { success: false, error: error.message };
  }
};

export const getHistory = async (userId) => {
  try {
    const storageKey = getHistoryKey(userId);
    const online = await isOnline();

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

        await AsyncStorage.setItem(storageKey, JSON.stringify(firestoreItems));
        console.log(' History loaded from Firestore');
        
        return { success: true, data: firestoreItems };
      } catch (firestoreError) {
        console.warn('âš ï¸ Firestore fetch failed, using local data:', firestoreError);
      }
    }

    const local = await AsyncStorage.getItem(storageKey);
    const localItems = local ? JSON.parse(local) : [];
    console.log(' History loaded from AsyncStorage');
    
    return { success: true, data: localItems };
  } catch (error) {
    console.error('âŒ Error getting history:', error);
    return { success: false, error: error.message };
  }
};

export const deleteHistoryItem = async (userId, historyId) => {
  try {
    const storageKey = getHistoryKey(userId);

    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];
    const itemToDelete = list.find(item => item.id === historyId);

    if (itemToDelete && itemToDelete.imagePath) {
      await deleteImageFromStorage(itemToDelete.imagePath);
    }

    const online = await isOnline();
    if (online && itemToDelete && itemToDelete.isPublic) {
      try {
        await deleteDoc(doc(db, 'publicScans', historyId));
        console.log(' Public scan deleted');
      } catch (error) {
        console.warn('âš ï¸ Failed to delete public scan:', error);
      }
    }

    const filtered = list.filter(item => item.id !== historyId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));

    if (online && userId) {
      try {
        await deleteDoc(doc(db, 'users', userId, 'history', historyId));
        console.log(' Deleted from Firestore');
      } catch (firestoreError) {
        console.warn('âš ï¸ Firestore delete failed:', firestoreError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('âŒ Error deleting history item:', error);
    return { success: false, error: error.message };
  }
};

export const clearAllHistory = async (userId) => {
  try {
    const storageKey = getHistoryKey(userId);

    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];

    const deleteImagePromises = list
      .filter(item => item.imagePath)
      .map(item => deleteImageFromStorage(item.imagePath));
    
    await Promise.all(deleteImagePromises);

    const online = await isOnline();
    if (online) {
      const deletePublicPromises = list
        .filter(item => item.isPublic)
        .map(item => deleteDoc(doc(db, 'publicScans', item.id)).catch(console.warn));
      
      await Promise.all(deletePublicPromises);
    }

    await AsyncStorage.setItem(storageKey, JSON.stringify([]));

    if (online && userId) {
      try {
        const historyRef = collection(db, 'users', userId, 'history');
        const querySnapshot = await getDocs(historyRef);
        
        const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        
        console.log(' All history cleared');
      } catch (firestoreError) {
        console.warn('âš ï¸ Firestore clear failed:', firestoreError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('âŒ Error clearing history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save history with duplicate checking
 * If the species already exists, update it instead of creating a new entry
 */
export const saveHistoryWithDuplicateCheck = async (uid, historyData) => {
  try {
    if (!uid) {
      return { success: false, error: 'User not authenticated' };
    }

    const historyRef = collection(db, 'users', uid, 'history');

    // Create identifier for duplicate checking
    const identifier = historyData.taxonId
      ? `taxon_${historyData.taxonId}`
      : (historyData.scientificName || historyData.name || '').toLowerCase().trim();

    if (!identifier) {
      return { success: false, error: 'Invalid species data' };
    }

    // Check for existing entry
    let existingDoc = null;

    // Try to find by taxonId first
    if (historyData.taxonId) {
      const q = query(historyRef, where('taxonId', '==', historyData.taxonId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        existingDoc = querySnapshot.docs[0];
      }
    }

    // If not found by taxonId, try scientificName
    if (!existingDoc && historyData.scientificName) {
      const q = query(historyRef, where('scientificName', '==', historyData.scientificName));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        existingDoc = querySnapshot.docs[0];
      }
    }

    if (existingDoc) {
      // Update existing entry
      const docRef = doc(db, 'users', uid, 'history', existingDoc.id);
      const existingData = existingDoc.data();

      await updateDoc(docRef, {
        ...historyData,
        timestamp: serverTimestamp(),
        scanCount: (existingData.scanCount || 1) + 1,
        lastScanned: serverTimestamp(),
        // Keep the original creation date
        createdAt: existingData.createdAt || existingData.timestamp,
      });

      return {
        success: true,
        message: 'History updated',
        docId: existingDoc.id,
        isUpdate: true
      };
    } else {
      // Create new entry
      const newDocRef = doc(historyRef);
      await setDoc(newDocRef, {
        ...historyData,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        scanCount: 1,
        lastScanned: serverTimestamp(),
      });

      return {
        success: true,
        message: 'History saved',
        docId: newDocRef.id,
        isUpdate: false
      };
    }
  } catch (error) {
    console.error('Error saving history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clean up duplicate entries in history
 * Keeps only the most recent scan of each species
 */
export const cleanupDuplicateHistory = async (uid) => {
  try {
    if (!uid) {
      return { success: false, error: 'User not authenticated' };
    }

    const historyRef = collection(db, 'users', uid, 'history');
    const querySnapshot = await getDocs(historyRef);

    if (querySnapshot.empty) {
      return { success: true, message: 'No history to clean up', duplicatesRemoved: 0 };
    }

    // Group by species identifier
    const speciesMap = new Map();

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const identifier = data.taxonId
        ? `taxon_${data.taxonId}`
        : (data.scientificName || data.name || '').toLowerCase().trim();

      if (!identifier) return;

      if (!speciesMap.has(identifier)) {
        speciesMap.set(identifier, []);
      }

      speciesMap.get(identifier).push({
        id: doc.id,
        data: data,
        timestamp: data.timestamp?.toMillis() || data.createdAt || 0
      });
    });

    // Find duplicates and keep only the most recent
    const docsToDelete = [];
    let duplicatesCount = 0;

    speciesMap.forEach((docs) => {
      if (docs.length > 1) {
        // Sort by timestamp (most recent first)
        docs.sort((a, b) => b.timestamp - a.timestamp);

        // Keep the first (most recent) and mark others for deletion
        for (let i = 1; i < docs.length; i++) {
          docsToDelete.push(docs[i].id);
          duplicatesCount++;
        }
      }
    });

    // Delete duplicate documents
    const deletePromises = docsToDelete.map(docId =>
      deleteDoc(doc(db, 'users', uid, 'history', docId))
    );

    await Promise.all(deletePromises);

    return {
      success: true,
      message: `Cleaned up ${duplicatesCount} duplicate ${duplicatesCount === 1 ? 'entry' : 'entries'}`,
      duplicatesRemoved: duplicatesCount
    };
  } catch (error) {
    console.error('Error cleaning up duplicates:', error);
    return { success: false, error: error.message };
  }
};

// ==================== FAVORITES ====================

export const addToFavorites = async (userId, favoriteData) => {
  try {
    const storageKey = getFavoritesKey(userId);
    let uploadedImageUrl = favoriteData.imageUrl;
    let imagePath = null;

    const online = await isOnline();
    if (online && userId && favoriteData.imageUri) {
      const uploadResult = await uploadImageToStorage(favoriteData.imageUri, userId, 'favorites');
      if (uploadResult.success) {
        uploadedImageUrl = uploadResult.url;
        imagePath = uploadResult.path;
        console.log(' Image uploaded for favorite');
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

    delete itemWithId.imageUri;

    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];
    list.unshift(itemWithId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(list));

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
        console.log(' Favorite synced to Firestore');
      } catch (firestoreError) {
        console.warn('âš ï¸ Firestore save failed:', firestoreError);
      }
    }

    return { success: true, id: itemWithId.id };
  } catch (error) {
    console.error('âŒ Error adding to favorites:', error);
    return { success: false, error: error.message };
  }
};

export const getFavorites = async (userId) => {
  try {
    const storageKey = getFavoritesKey(userId);
    const online = await isOnline();

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

        await AsyncStorage.setItem(storageKey, JSON.stringify(firestoreItems));
        console.log(' Favorites loaded from Firestore');
        
        return { success: true, data: firestoreItems };
      } catch (firestoreError) {
        console.warn('âš ï¸ Firestore fetch failed:', firestoreError);
      }
    }

    const local = await AsyncStorage.getItem(storageKey);
    const localItems = local ? JSON.parse(local) : [];
    console.log(' Favorites loaded from AsyncStorage');
    
    return { success: true, data: localItems };
  } catch (error) {
    console.error('âŒ Error getting favorites:', error);
    return { success: false, error: error.message };
  }
};

export const removeFromFavorites = async (userId, favoriteId) => {
  try {
    const storageKey = getFavoritesKey(userId);

    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];
    const itemToDelete = list.find(item => item.id === favoriteId);

    if (itemToDelete && itemToDelete.imagePath) {
      await deleteImageFromStorage(itemToDelete.imagePath);
    }

    const filtered = list.filter(item => item.id !== favoriteId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));

    const online = await isOnline();
    if (online && userId) {
      try {
        await deleteDoc(doc(db, 'users', userId, 'favorites', favoriteId));
        console.log(' Removed from Firestore');
      } catch (firestoreError) {
        console.warn('âš ï¸ Firestore delete failed:', firestoreError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('âŒ Error removing from favorites:', error);
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
    console.error('âŒ Error checking favorites:', error);
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
      console.log(' Subscription added');
    }
    
    return { success: true };
  } catch (error) {
    console.error('âŒ Error adding subscription:', error);
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
    console.error('âŒ Error getting subscription:', error);
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
      console.log(' Subscription cancelled');
    }
    
    return { success: true };
  } catch (error) {
    console.error('âŒ Error cancelling subscription:', error);
    return { success: false, error: error.message };
  }
};

// ==================== GLOBAL OBSERVATIONS ====================

export const incrementGlobalObservation = async (speciesData) => {
  try {
    const online = await isOnline();
    
    if (!online) {
      console.log('âš ï¸ Offline: Will sync when online');
      return { success: false, error: 'offline' };
    }

    const docId = speciesData.taxonId 
      ? `taxon_${speciesData.taxonId}` 
      : (speciesData.scientificName || speciesData.name || '').toLowerCase().replace(/\s+/g, '_');

    if (!docId) {
      return { success: false, error: 'No valid identifier' };
    }

    const observationRef = doc(db, 'globalObservations', docId);
    const observationDoc = await getDoc(observationRef);

    if (observationDoc.exists()) {
      const currentCount = observationDoc.data().count || 0;
      await updateDoc(observationRef, {
        count: currentCount + 1,
        lastScanned: serverTimestamp(),
      });
      console.log(` Global observation: ${currentCount + 1}`);
      return { success: true, count: currentCount + 1 };
    } else {
      await setDoc(observationRef, {
        speciesName: speciesData.name || speciesData.scientificName,
        scientificName: speciesData.scientificName,
        commonName: speciesData.commonName,
        taxonId: speciesData.taxonId,
        count: 1,
        firstScanned: serverTimestamp(),
        lastScanned: serverTimestamp(),
      });
      console.log(' Global observation created: 1');
      return { success: true, count: 1 };
    }
  } catch (error) {
    console.error('âŒ Error incrementing observation:', error);
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
        console.warn(`âš ï¸ Failed to fetch count for ${docId}:`, error);
        counts[docId] = 0;
      }
    }

    return { success: true, counts };
  } catch (error) {
    console.error('âŒ Error getting observation counts:', error);
    return { success: false, counts: {} };
  }
};

// ==================== TRENDING SPECIES ====================

export const getTrendingSpecies = async (limitCount = 10) => {
  try {
    const online = await isOnline();

    if (!online) {
      return { success: false, data: [], error: 'offline' };
    }

    const globalObsRef = collection(db, 'globalObservations');
    const q = query(globalObsRef, orderBy('count', 'desc'), limit(limitCount * 2)); // Get more than needed for processing

    const querySnapshot = await getDocs(q);

    const trendingSpecies = [];

    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();

      const lastScanned = data.lastScanned?.toMillis?.() || data.lastScanned || 0;
      const count = data.count || 0;

      // Include all species that have been scanned at least once
      if (count > 0) {
        let imageUrl = null;
        let iconicTaxon = null;
        let rank = null;
        let about = null;

        // Try to get details from public scans
        if (data.taxonId) {
          try {
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
            console.warn('âš ï¸ Failed to fetch details:', error);
          }
        }

        if (!imageUrl && !iconicTaxon && data.scientificName) {
          try {
            const publicScansRef = collection(db, 'publicScans');
            const nameQuery = query(
              publicScansRef,
              where('scientificName', '==', data.scientificName),
              limit(1)
            );
            const nameSnapshot = await getDocs(nameQuery);

            if (!nameSnapshot.empty) {
              const publicData = nameSnapshot.docs[0].data();
              imageUrl = publicData.imageUrl;
              iconicTaxon = publicData.iconicTaxon;
              rank = publicData.rank;
              about = publicData.about;
            }
          } catch (error) {
            console.warn('âš ï¸ Failed to fetch by name:', error);
          }
        }

        // Calculate trending score based on scan activity and recency
        const daysSinceLastScan = (Date.now() - lastScanned) / (24 * 60 * 60 * 1000);
        const recencyBonus = Math.max(0, 90 - daysSinceLastScan) / 90; // Bonus for scans within last 90 days
        const trendingScore = count + (count * recencyBonus * 0.5); // Base score is total scans, with recency bonus

        trendingSpecies.push({
          taxonId: data.taxonId,
          name: data.speciesName || data.scientificName || data.commonName,
          scientificName: data.scientificName,
          commonName: data.commonName,
          count: count,
          lastScanned: lastScanned,
          firstScanned: data.firstScanned?.toMillis?.() || data.firstScanned || lastScanned,
          imageUrl: imageUrl,
          iconicTaxon: iconicTaxon,
          rank: rank,
          about: about,
          globalObsCount: count,
          trendingScore: trendingScore,
        });
      }
    }

    // Sort by trending score (prioritizes total scans with recency bonus)
    trendingSpecies.sort((a, b) => b.trendingScore - a.trendingScore);

    const topTrending = trendingSpecies.slice(0, limitCount);

    console.log(` Loaded ${topTrending.length} trending species`);
    return { success: true, data: topTrending };
  } catch (error) {
    console.error('âŒ Error getting trending species:', error);
    return { success: false, data: [], error: error.message };
  }
};

export const getTrendingByCategory = async (iconicTaxon, limitCount = 10) => {
  try {
    const result = await getTrendingSpecies(100); // Get more data to filter from

    if (!result.success) {
      return result;
    }

    const filtered = result.data
      .filter(species => {
        if (!species.iconicTaxon) return false;
        return species.iconicTaxon.toLowerCase().includes(iconicTaxon.toLowerCase());
      })
      .slice(0, limitCount);

    return { success: true, data: filtered };
  } catch (error) {
    console.error('âŒ Error getting trending by category:', error);
    return { success: false, data: [], error: error.message };
  }
};

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
    console.error('âŒ Error getting trending stats:', error);
    return { success: false, error: error.message };
  }
};

export async function getSpeciesScans(taxonId, speciesName) {
  try {
    console.log(' Fetching species scans for:', { taxonId, speciesName });

    const publicScansRef = collection(db, 'publicScans');
    let scansQuery;

    if (taxonId) {
      console.log(' Querying by taxonId:', taxonId);
      scansQuery = query(
        publicScansRef,
        where('taxonId', '==', taxonId),
        orderBy('publishedAt', 'desc')
      );
    } else if (speciesName) {
      console.log(' Querying by name:', speciesName);
      scansQuery = query(
        publicScansRef,
        where('name', '==', speciesName),
        orderBy('publishedAt', 'desc')
      );
    } else {
      console.error('âŒ No taxonId or species name provided');
      return {
        success: false,
        data: [],
        error: 'No taxonId or species name provided',
      };
    }

    console.log('â³ Executing Firestore query...');
    const snapshot = await getDocs(scansQuery);
    console.log(` Found ${snapshot.size} scans`);

    const scans = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      scans.push({
        id: doc.id,
        userId: data.userId,
        userName: data.userName || 'Anonymous',
        name: data.name || data.plantName || data.commonName || 'Unknown',
        scientificName: data.scientificName || null,
        commonName: data.commonName || null,
        imageUrl: data.imageUrl || null,
        iconicTaxon: data.iconicTaxon || null,
        taxonId: data.taxonId || null,
        isPublic: true,
        createdAt: data.publishedAt || data.createdAt || data.timestamp?.toMillis() || Date.now(),
        about: data.about || null,
      });
    });

    console.log(' Successfully processed scans');
    return {
      success: true,
      data: scans,
    };
  } catch (error) {
    console.error('âŒ Error fetching species scans:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    if (error.message?.includes('index')) {
      console.error('âš ï¸ Firestore Index Required!');
    }

    if (error.code === 'permission-denied') {
      console.error('âš ï¸ Permission Denied! Check Firestore rules.');
    }

    return {
      success: false,
      data: [],
      error: error.message,
    };
  }
}