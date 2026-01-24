// firestore.js - ULTIMATE OPTIMIZED VERSION
// ==================== KEY IMPROVEMENTS ====================
// 1. ✅ Added intelligent caching for global observation counts
// 2. ✅ Fixed public/private status preservation in sync
// 3. ✅ Optimized sync to only fetch what's needed
// 4. ✅ Reduced unnecessary Firestore reads
// 5. ✅ Batch delete functions from original version
// 6. ✅ Enhanced image handling from original version
// ==========================================================

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

// ==================== SYNC MANAGER ====================

// Track sync status
let isSyncing = false;
let lastSyncTime = 0;
const SYNC_INTERVAL = 30000; // 30 seconds

// ✅ NEW: Cache for global observation counts
const globalCountsCache = {
  data: {},
  lastFetch: 0,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
};

// Helper to check network status
const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected;
};

// Helper to get AsyncStorage keys
const getHistoryKey = (uid) => uid ? `history_${uid}` : 'history_guest';
const getFavoritesKey = (uid) => uid ? `favorites_${uid}` : 'favorites_guest';
const getSyncStatusKey = (uid) => uid ? `sync_${uid}` : 'sync_guest';

// Helper to safely convert Firestore timestamp to number
const convertTimestampToNumber = (timestamp) => {
  if (!timestamp) return Date.now();
  
  // If it's already a number
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  // If it's a Firestore Timestamp object
  if (timestamp.toMillis && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  
  // If it's a Date object
  if (timestamp.getTime && typeof timestamp.getTime === 'function') {
    return timestamp.getTime();
  }
  
  // Default to current time
  return Date.now();
};

// Helper to normalize item for storage
const normalizeItem = (item) => {
  const normalized = { ...item };
  
  // Convert timestamps to numbers
  if (normalized.timestamp) {
    normalized.timestamp = convertTimestampToNumber(normalized.timestamp);
  }
  
  if (normalized.addedAt) {
    normalized.addedAt = convertTimestampToNumber(normalized.addedAt);
  }
  
  if (normalized.createdAt) {
    normalized.createdAt = convertTimestampToNumber(normalized.createdAt);
  }
  
  if (normalized.lastViewed) {
    normalized.lastViewed = convertTimestampToNumber(normalized.lastViewed);
  }
  
  if (normalized.lastModified) {
    normalized.lastModified = convertTimestampToNumber(normalized.lastModified);
  }
  
  if (normalized.publishedAt) {
    normalized.publishedAt = convertTimestampToNumber(normalized.publishedAt);
  }
  
  // ✅ CRITICAL: Ensure isPublic is preserved as boolean
  if (typeof normalized.isPublic !== 'boolean') {
    normalized.isPublic = normalized.isPublic === true;
  }
  
  // Ensure synced is boolean
  if (typeof normalized.synced !== 'boolean') {
    normalized.synced = !!normalized.synced;
  }
  
  return normalized;
};

// ==================== IMAGE UPLOAD FUNCTIONS ====================

// Upload image to Firebase Storage (ORIGINAL VERSION - KEPT FOR ROBUSTNESS)
export const uploadImageToStorage = async (imageUri, userId, folder = 'scans') => {
  try {
    if (!imageUri || !userId) {
      console.error('❌ Missing image URI or user ID');
      return { success: false, error: 'Missing image URI or user ID' };
    }

    // ✅ CRITICAL: Verify user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    if (currentUser.uid !== userId) {
      console.error('❌ User ID mismatch');
      console.error('Current UID:', currentUser.uid);
      console.error('Requested UID:', userId);
      return { success: false, error: 'User ID mismatch' };
    }

    console.log('👤 User authenticated:', userId);
    console.log('📸 Image URI:', imageUri);

    // Create unique filename
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storagePath = `${folder}/${userId}/${filename}`;
    const storageRef = ref(storage, storagePath);

    console.log('📤 Upload path:', storagePath);

    // ✅ FIX: Handle different URI formats (file://, content://, https://)
    let blob;

    try {
      // For React Native, handle file:// URIs
      if (imageUri.startsWith('file://')) {
        console.log('📱 Processing file:// URI');
        const response = await fetch(imageUri);
        blob = await response.blob();
      }
      // For Android content:// URIs
      else if (imageUri.startsWith('content://')) {
        console.log('🤖 Processing content:// URI');
        const response = await fetch(imageUri);
        blob = await response.blob();
      }
      // For data URIs or base64
      else if (imageUri.startsWith('data:')) {
        console.log('🔤 Processing data URI');
        const response = await fetch(imageUri);
        blob = await response.blob();
      }
      // For HTTP/HTTPS URLs
      else if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
        console.log('🌐 Processing HTTP URI');
        const response = await fetch(imageUri);
        blob = await response.blob();
      }
      // Default: try direct fetch
      else {
        console.log('❓ Processing unknown URI format, trying direct fetch');
        const response = await fetch(imageUri);
        blob = await response.blob();
      }

      if (!blob || blob.size === 0) {
        console.error('❌ Blob is empty');
        return { success: false, error: 'Failed to create blob from image' };
      }

      console.log('✅ Blob created successfully');
      console.log('📊 Blob size:', blob.size, 'bytes');
      console.log('📝 Blob type:', blob.type);

    } catch (fetchError) {
      console.error('❌ Failed to fetch image:', fetchError);
      console.error('❌ Image URI was:', imageUri);
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

    console.log('⏳ Uploading to Firebase Storage...');
    
    // ✅ IMPORTANT: Add a timeout to catch hanging uploads
    const uploadPromise = uploadBytes(storageRef, blob, metadata);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000)
    );

    await Promise.race([uploadPromise, timeoutPromise]);
    console.log('✅ Upload successful');

    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    console.log('🔗 Download URL obtained:', downloadURL);

    return {
      success: true,
      url: downloadURL,
      path: storageRef.fullPath
    };
  } catch (error) {
    console.error('❌ Error uploading image:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);

    // Provide more specific error messages
    if (error.code === 'storage/unauthorized') {
      console.error('⚠️ PERMISSION DENIED: Check Firebase Storage Rules');
      console.error('⚠️ Current user:', auth.currentUser?.uid);
      console.error('⚠️ Upload path should be:', `${folder}/${userId}/...`);
      console.error('⚠️ Verify Storage Rules allow write for this path');
      
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

// Delete image from Firebase Storage (ORIGINAL VERSION - KEPT)
export const deleteImageFromStorage = async (imagePath) => {
  try {
    if (!imagePath) {
      return { success: true }; // No image to delete
    }

    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);

    console.log('✅ Image deleted successfully');
    return { success: true };
  } catch (error) {
    // Don't fail if image doesn't exist - this is expected behavior
    if (error.code === 'storage/object-not-found') {
      console.log('📭 Image already deleted or does not exist');
      return { success: true };
    }

    // Only log actual errors, not expected missing files
    console.error('❌ Error deleting image:', error);
    return { success: false, error: error.message };
  }
};

// ==================== SYNC FUNCTIONS ====================

/**
 * Initialize user data when logging into a new device
 * Pulls all data from Firestore and stores locally
 */
export const initializeUserData = async (userId) => {
  try {
    if (!userId) {
      console.warn('⚠️ No userId provided for initialization');
      return { success: false, error: 'No user ID' };
    }

    const online = await isOnline();
    if (!online) {
      console.log('📶 Offline: Cannot initialize data without internet');
      return { success: false, error: 'offline' };
    }

    console.log('🔄 Initializing user data for new device...');

    // 1. Load history from Firestore
    let firestoreHistory = [];
    try {
      const historyRef = collection(db, 'users', userId, 'history');
      const q = query(historyRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const normalizedData = normalizeItem({
          id: doc.id,
          ...data,
          synced: true,
          isPublic: data.isPublic === true, // ✅ Explicit boolean conversion
        });
        firestoreHistory.push(normalizedData);
      });

      await AsyncStorage.setItem(getHistoryKey(userId), JSON.stringify(firestoreHistory));
      console.log(`✅ Loaded ${firestoreHistory.length} history items from Firestore`);
    } catch (error) {
      console.error('❌ Failed to load history:', error);
    }

    // 2. Load favorites from Firestore
    let firestoreFavorites = [];
    try {
      const favoritesRef = collection(db, 'users', userId, 'favorites');
      const q = query(favoritesRef, orderBy('addedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const normalizedData = normalizeItem({
          id: doc.id,
          ...data,
          synced: true,
        });
        firestoreFavorites.push(normalizedData);
      });

      await AsyncStorage.setItem(getFavoritesKey(userId), JSON.stringify(firestoreFavorites));
      console.log(`✅ Loaded ${firestoreFavorites.length} favorites from Firestore`);
    } catch (error) {
      console.error('❌ Failed to load favorites:', error);
    }

    // 3. Save sync status
    const syncStatus = {
      lastSync: Date.now(),
      initialized: true,
      userId: userId,
    };
    await AsyncStorage.setItem(getSyncStatusKey(userId), JSON.stringify(syncStatus));

    console.log('✅ User data initialized successfully');
    return { 
      success: true, 
      message: 'Data initialized',
      stats: {
        history: firestoreHistory.length,
        favorites: firestoreFavorites.length
      }
    };
  } catch (error) {
    console.error('❌ Error initializing user data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if user data needs initialization (first time on new device)
 */
export const needsInitialization = async (userId) => {
  try {
    if (!userId) return false;

    const syncStatus = await AsyncStorage.getItem(getSyncStatusKey(userId));
    if (!syncStatus) {
      return true; // Never synced before
    }

    const status = JSON.parse(syncStatus);
    if (status.userId !== userId) {
      return true; // Different user
    }

    return false;
  } catch (error) {
    console.warn('⚠️ Error checking initialization:', error);
    return true; // If error, assume needs initialization
  }
};

/**
 * ✅ OPTIMIZED: Two-way sync with proper status preservation
 */
export const syncUserData = async (userId) => {
  if (isSyncing) {
    console.log('⏳ Sync already in progress');
    return { success: false, error: 'sync_in_progress' };
  }

  const now = Date.now();
  if (now - lastSyncTime < SYNC_INTERVAL) {
    console.log('⏳ Sync too soon, skipping');
    return { success: false, error: 'sync_too_soon' };
  }

  try {
    isSyncing = true;
    lastSyncTime = now;

    const online = await isOnline();
    if (!online) {
      console.log('📶 Offline: Cannot sync without internet');
      return { success: false, error: 'offline' };
    }

    if (!userId) {
      console.warn('⚠️ No userId provided for sync');
      return { success: false, error: 'no_user_id' };
    }

    console.log('🔄 Starting optimized data sync...');

    // ========== SYNC HISTORY ==========
    console.log('🔄 Syncing history...');
    
    const historyKey = getHistoryKey(userId);
    const localHistoryRaw = await AsyncStorage.getItem(historyKey);
    const localHistory = localHistoryRaw ? JSON.parse(localHistoryRaw).map(normalizeItem) : [];

    console.log(`📦 Local AsyncStorage has ${localHistory.length} items`);

    // Get Firestore history
    const historyRef = collection(db, 'users', userId, 'history');
    const historyQuery = query(historyRef, orderBy('timestamp', 'desc'));
    const historySnapshot = await getDocs(historyQuery);

    const firestoreHistoryMap = new Map();
    historySnapshot.forEach((doc) => {
      const data = doc.data();
      // ✅ CRITICAL: Preserve isPublic status from Firestore
      const normalizedData = normalizeItem({
        ...data,
        id: doc.id,
        isPublic: data.isPublic === true, // Explicit boolean conversion
      });
      firestoreHistoryMap.set(doc.id, normalizedData);
    });

    console.log(`☁️ Firestore has ${firestoreHistoryMap.size} items`);

    // ✅ CRITICAL: Only upload items that DON'T exist in Firestore
    const localUnsynced = localHistory.filter(item => {
      // Skip if already in Firestore
      if (firestoreHistoryMap.has(item.id)) {
        console.log(`⏭️ Skipping ${item.name} - already in Firestore`);
        return false;
      }
      // Only upload truly unsynced items
      return !item.synced;
    });

    console.log(`📤 ${localUnsynced.length} truly unsynced items to upload`);

    // ✅ OPTIMIZED: Upload unsynced items to Firestore
    for (const item of localUnsynced) {
      try {
        const newItem = { ...item };
        delete newItem.id;
        delete newItem.synced;
        
        // ✅ CRITICAL: Preserve isPublic when uploading
        const docRef = await addDoc(historyRef, {
          ...newItem,
          isPublic: item.isPublic === true, // Ensure boolean
          timestamp: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
        
        item.id = docRef.id;
        item.synced = true;
        console.log(`✅ Created history item: ${docRef.id} (isPublic: ${item.isPublic})`);
      } catch (error) {
        console.error(`❌ Failed to sync history item:`, error);
      }
    }

    // ✅ Merge: Get new items from Firestore
    const localIds = new Set(localHistory.map(item => item.id));
    const newFirestoreItems = Array.from(firestoreHistoryMap.values())
      .filter(item => !localIds.has(item.id));

    console.log(`📥 ${newFirestoreItems.length} new items from Firestore`);

    // ✅ CRITICAL FIX: Merge with proper status preservation
    const mergedHistory = [
      // Update existing local items with Firestore data
      ...localHistory.map(item => {
        const firestoreItem = firestoreHistoryMap.get(item.id);
        if (firestoreItem) {
          // ✅ Firestore is source of truth for isPublic status
          return { 
            ...item, 
            ...firestoreItem, 
            isPublic: firestoreItem.isPublic === true, // Preserve Firestore status
            synced: true 
          };
        }
        return { ...item, synced: true };
      }),
      // Add new items from Firestore
      ...newFirestoreItems.map(item => ({ 
        ...item, 
        isPublic: item.isPublic === true, // Ensure boolean
        synced: true 
      }))
    ];

    // ✅ Remove duplicates
    const uniqueHistory = [];
    const seenHistoryIds = new Set();
    mergedHistory.forEach(item => {
      if (item.id && !seenHistoryIds.has(item.id)) {
        seenHistoryIds.add(item.id);
        uniqueHistory.push(item);
      }
    });

    // ✅ Sort by timestamp
    uniqueHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    await AsyncStorage.setItem(historyKey, JSON.stringify(uniqueHistory));
    console.log(`💾 Saved ${uniqueHistory.length} items to AsyncStorage`);

    // ========== SYNC FAVORITES ==========
    console.log('🔄 Syncing favorites...');
    
    // 1. Get local favorites
    const favoritesKey = getFavoritesKey(userId);
    const localFavoritesRaw = await AsyncStorage.getItem(favoritesKey);
    const localFavorites = localFavoritesRaw ? JSON.parse(localFavoritesRaw).map(normalizeItem) : [];
    
    // 2. Get Firestore favorites
    const favoritesRef = collection(db, 'users', userId, 'favorites');
    const favoritesQuery = query(favoritesRef, orderBy('addedAt', 'desc'));
    const favoritesSnapshot = await getDocs(favoritesQuery);
    
    const firestoreFavoritesMap = new Map();
    favoritesSnapshot.forEach((doc) => {
      const data = doc.data();
      const normalizedData = normalizeItem({
        ...data,
        id: doc.id,
      });
      firestoreFavoritesMap.set(doc.id, normalizedData);
    });

    // 3. Sync local favorites to Firestore
    for (const item of localFavorites) {
      try {
        if (!item.synced) {
          if (item.id && firestoreFavoritesMap.has(item.id)) {
            // Update existing
            const updateData = { ...item };
            delete updateData.id;
            delete updateData.synced;
            
            await updateDoc(doc(db, 'users', userId, 'favorites', item.id), {
              ...updateData,
              addedAt: serverTimestamp(),
            });
            console.log(`✅ Updated favorite: ${item.id}`);
          } else {
            // Create new
            const newItem = { ...item };
            delete newItem.id;
            delete newItem.synced;
            
            const docRef = await addDoc(favoritesRef, {
              ...newItem,
              addedAt: serverTimestamp(),
            });
            item.id = docRef.id;
            console.log(`✅ Created favorite: ${docRef.id}`);
          }
          
          item.synced = true;
        }
      } catch (error) {
        console.error(`❌ Failed to sync favorite ${item.name}:`, error);
      }
    }

    // 4. Merge Firestore favorites to local
    const mergedFavorites = [
      ...localFavorites,
      ...Array.from(firestoreFavoritesMap.values())
        .filter(firestoreItem => !localFavorites.some(local => local.id === firestoreItem.id))
        .map(item => ({
          ...item,
          synced: true,
        }))
    ];

    // Remove duplicates by taxonId/scientificName
    const uniqueFavorites = [];
    const seenIdentifiers = new Set();
    
    mergedFavorites.forEach(item => {
      const identifier = item.taxonId || item.scientificName || item.name || item.id;
      if (!seenIdentifiers.has(identifier)) {
        seenIdentifiers.add(identifier);
        uniqueFavorites.push(item);
      }
    });

    // Sort by addedAt
    uniqueFavorites.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    
    await AsyncStorage.setItem(favoritesKey, JSON.stringify(uniqueFavorites));

    // Update sync status
    const syncStatus = {
      lastSync: Date.now(),
      initialized: true,
      userId: userId,
    };
    await AsyncStorage.setItem(getSyncStatusKey(userId), JSON.stringify(syncStatus));

    console.log('✅ Sync completed successfully');
    return { 
      success: true, 
      stats: {
        history: uniqueHistory.length,
        favorites: uniqueFavorites.length,
      }
    };
  } catch (error) {
    console.error('❌ Error during sync:', error);
    return { success: false, error: error.message };
  } finally {
    isSyncing = false;
  }
};

/**
 * Force sync regardless of timer
 */
export const forceSync = async (userId) => {
  lastSyncTime = 0; // Reset timer
  return syncUserData(userId);
};

// ==================== USER PROFILE ====================

export const createUserProfile = async (userId, email, displayName = '') => {
  try {
    const online = await isOnline();
    
    if (online) {
      await setDoc(doc(db, 'users', userId), {
        email: email,
        displayName: displayName,
        isVerified: false, // 🆕 ADD THIS LINE
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
      console.log('✅ User profile created in Firestore');
    } else {
      console.log('📶 Offline: User profile will sync when online');
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating user profile:', error);
    return { success: false, error: error.message };
  }
};

export const getUserProfile = async (userId) => {
  try {
    const online = await isOnline();
    
    if (online) {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return { success: true, data };
      }
    }
    
    return { success: false, error: 'User profile not found' };
  } catch (error) {
    console.error('❌ Error getting user profile:', error);
    return { success: false, error: error.message };
  }
};

export const updateUserProfile = async (userId, updates) => {
  try {
    const online = await isOnline();
    
    if (online) {
      await updateDoc(doc(db, 'users', userId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      console.log('✅ User profile updated');
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    return { success: false, error: error.message };
  }
};

// ==================== PUBLIC FEED FUNCTIONS ====================

/**
 * ✅ CRITICAL FIX: Properly preserve isPublic status
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

    console.log(`🔄 Toggling visibility for ${historyId} to ${isPublic}`);

    // ✅ Update Firestore with explicit boolean
    const historyRef = doc(db, 'users', userId, 'history', historyId);
    await setDoc(historyRef, {
      isPublic: isPublic === true, // Explicit boolean
      lastModified: serverTimestamp(),
    }, { merge: true });

    console.log(`✅ Firestore updated: isPublic = ${isPublic}`);

    // Handle public/private feed
    if (isPublic) {
      const historyDoc = await getDoc(historyRef);

      if (historyDoc.exists()) {
        const historyData = historyDoc.data();

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

        console.log('✅ Added to public feed');
      }
    } else {
      try {
        const publicScanRef = doc(db, 'publicScans', historyId);
        await deleteDoc(publicScanRef);
        console.log('✅ Removed from public feed');
      } catch (error) {
        console.warn('⚠️ Public scan doc may not exist:', error);
      }
    }

    // ✅ Update AsyncStorage with explicit boolean
    const storageKey = getHistoryKey(userId);
    const existing = await AsyncStorage.getItem(storageKey);
    if (existing) {
      const list = JSON.parse(existing).map(normalizeItem);
      const updatedList = list.map(item =>
        item.id === historyId 
          ? { ...item, isPublic: isPublic === true, synced: false } // Explicit boolean
          : item
      );
      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedList));

      console.log(`✅ AsyncStorage updated: isPublic = ${isPublic}`);

      // Force immediate sync to propagate changes
      setTimeout(() => syncUserData(userId), 500);
    }

    return { success: true, isPublic: isPublic === true };
  } catch (error) {
    console.error('❌ Error toggling visibility:', error);
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
      const normalizedData = normalizeItem({
        id: doc.id,
        ...data,
      });
      publicScans.push(normalizedData);
    });

    console.log(`✅ Loaded ${publicScans.length} public scans`);
    return { success: true, data: publicScans };
  } catch (error) {
    console.error('❌ Error getting public scans:', error);
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
      const normalizedData = normalizeItem({
        id: doc.id,
        ...data,
      });
      userPublicScans.push(normalizedData);
    });

    return { success: true, data: userPublicScans };
  } catch (error) {
    console.error('❌ Error getting user public scans:', error);
    return { success: false, data: [], error: error.message };
  }
};

// ==================== HISTORY FUNCTIONS ====================

export const updateHistoryTimestamp = async (userId, historyId) => {
  try {
    const storageKey = getHistoryKey(userId);
    const existing = await AsyncStorage.getItem(storageKey);
    
    if (!existing) {
      return { success: false, error: 'No history found' };
    }
    
    const list = JSON.parse(existing).map(normalizeItem);
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
      synced: false, // Mark for sync
    };
    
    list.unshift(updatedItem);
    await AsyncStorage.setItem(storageKey, JSON.stringify(list));
    
    console.log('✅ History timestamp updated (no image re-upload)');
    
    // Trigger background sync
    setTimeout(() => syncUserData(userId), 1000);
    
    return { success: true, item: updatedItem };
  } catch (error) {
    console.error('❌ Error updating timestamp:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ✅ UPDATED: addToHistory with proper public status preservation
 */
export const addToHistory = async (userId, historyData) => {
  try {
    console.log('📝 Adding to history for user:', userId);
    
    const storageKey = getHistoryKey(userId);
    let uploadedImageUrl = historyData.imageUrl;
    let imagePath = null;

    // First check Firestore for existing species (if online)
    const online = await isOnline();
    let existingFirestoreId = null;
    let existingScanCount = 1;
    let wasPublic = false; // ✅ Track existing public status

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
            wasPublic = existingData.isPublic === true; // ✅ Preserve status
            
            console.log(`✅ Found existing species in Firestore, preserving isPublic: ${wasPublic}`);
          }
        }
      } catch (error) {
        console.warn('⚠️ Firestore lookup failed:', error);
      }
    }

    // Get existing history from AsyncStorage
    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing).map(normalizeItem) : [];

    // Remove any duplicate from AsyncStorage
    const filteredList = list.filter(item => {
      if (existingFirestoreId && item.id === existingFirestoreId) {
        return false;
      }
      if (historyData.taxonId && item.taxonId === historyData.taxonId) {
        return false;
      }
      const itemName = (item.name || item.scientificName || '').toLowerCase().trim();
      const dataName = (historyData.name || historyData.scientificName || '').toLowerCase().trim();
      if (itemName === dataName && itemName !== '') {
        return false;
      }
      return true;
    });

    // ALWAYS preserve existing image data if updating
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
      id: existingFirestoreId || `history_temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      scanCount: existingScanCount,
      synced: false, // Mark as unsynced
      isPublic: wasPublic, // ✅ CRITICAL: Preserve existing public status
    };

    delete itemWithId.imageUri;

    // Normalize before saving
    const normalizedItem = normalizeItem(itemWithId);

    // Add to top of filtered list
    const updatedList = [normalizedItem, ...filteredList];
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedList));
    console.log(`💾 Saved to AsyncStorage (isPublic: ${normalizedItem.isPublic})`);

    // Trigger background sync if online
    if (online && userId) {
      setTimeout(() => syncUserData(userId), 1000);
    }

    return { success: true, id: normalizedItem.id };
  } catch (error) {
    console.error('❌ Error adding to history:', error);
    return { success: false, error: error.message };
  }
};

export const getHistory = async (userId) => {
  try {
    const storageKey = getHistoryKey(userId);
    
    // Check if we need to initialize
    if (userId) {
      const needsInit = await needsInitialization(userId);
      if (needsInit) {
        console.log('🔄 First time on device, initializing data...');
        await initializeUserData(userId);
      } else {
        // Try to sync in background (reduced delay for faster sync)
        const online = await isOnline();
        if (online) {
          setTimeout(() => syncUserData(userId), 1000); // Reduced from 3000 to 1000 ms
        }
      }
    }

    const local = await AsyncStorage.getItem(storageKey);
    let localItems = local ? JSON.parse(local) : [];
    
    // Normalize all items
    localItems = localItems.map(normalizeItem);
    
    console.log(`📱 Loaded ${localItems.length} history items`);
    
    return { success: true, data: localItems };
  } catch (error) {
    console.error('❌ Error getting history:', error);
    return { success: false, error: error.message };
  }
};

// ========== KEPT: OPTIMIZED deleteHistoryItem function ==========
export const deleteHistoryItem = async (userId, historyId) => {
  try {
    console.log('🗑️ Deleting item:', historyId);
    
    // ✅ CRITICAL: Delete from AsyncStorage PROPERLY
    const storageKey = getHistoryKey(userId);
    const existing = await AsyncStorage.getItem(storageKey);
    
    if (!existing) {
      console.warn('⚠️ No AsyncStorage data found');
      return { success: true };
    }

    const list = JSON.parse(existing).map(normalizeItem);
    console.log(`📦 AsyncStorage has ${list.length} items before delete`);
    
    const itemToDelete = list.find(item => item.id === historyId);
    
    // ✅ FILTER OUT the deleted item
    const filtered = list.filter(item => item.id !== historyId);
    console.log(`📦 AsyncStorage will have ${filtered.length} items after delete`);
    
    // ✅ SAVE the filtered list back
    await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));
    console.log('✅ AsyncStorage updated - item removed');

    // ✅ Verify the save worked
    const verify = await AsyncStorage.getItem(storageKey);
    const verifyList = JSON.parse(verify);
    console.log(`✅ Verified: AsyncStorage now has ${verifyList.length} items`);
    
    const stillExists = verifyList.find(item => item.id === historyId);
    if (stillExists) {
      console.error('❌ CRITICAL: Item still exists in AsyncStorage after delete!');
    } else {
      console.log('✅ Item successfully removed from AsyncStorage');
    }

    // Delete from Firestore in background
    const online = await isOnline();
    if (online && userId) {
      Promise.all([
        deleteDoc(doc(db, 'users', userId, 'history', historyId))
          .then(() => console.log('✅ Deleted from Firestore'))
          .catch(err => console.warn('⚠️ Firestore delete failed:', err)),
        
        itemToDelete?.isPublic 
          ? deleteDoc(doc(db, 'publicScans', historyId))
              .catch(err => console.warn('⚠️ Public scan delete failed:', err))
          : Promise.resolve(),
        
        itemToDelete?.imagePath
          ? deleteImageFromStorage(itemToDelete.imagePath)
              .catch(err => console.warn('⚠️ Image delete failed:', err))
          : Promise.resolve()
      ]);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting history item:', error);
    return { success: false, error: error.message };
  }
};

// ========== KEPT: BATCH DELETE FUNCTION TO PREVENT RACE CONDITIONS ==========
export const deleteMultipleHistoryItems = async (userId, historyIds) => {
  try {
    console.log(`🗑️ Batch deleting ${historyIds.length} items`);
    
    const storageKey = getHistoryKey(userId);
    const existing = await AsyncStorage.getItem(storageKey);
    
    if (!existing) {
      console.warn('⚠️ No AsyncStorage data found');
      return { success: true };
    }

    const list = JSON.parse(existing).map(normalizeItem);
    console.log(`📦 AsyncStorage has ${list.length} items before batch delete`);
    
    // ✅ Create Set for faster lookup
    const idsToDelete = new Set(historyIds);
    
    // ✅ Get items that will be deleted (for cleanup)
    const itemsToDelete = list.filter(item => idsToDelete.has(item.id));
    
    // ✅ Filter out ALL items to delete in ONE operation
    const filtered = list.filter(item => !idsToDelete.has(item.id));
    console.log(`📦 AsyncStorage will have ${filtered.length} items after batch delete`);
    
    // ✅ SAVE once
    await AsyncStorage.setItem(storageKey, JSON.stringify(filtered));
    console.log('✅ AsyncStorage updated - batch removed');

    // ✅ Verify
    const verify = await AsyncStorage.getItem(storageKey);
    const verifyList = JSON.parse(verify);
    console.log(`✅ Verified: AsyncStorage now has ${verifyList.length} items`);
    
    // Check if any still exist
    const stillExist = verifyList.filter(item => idsToDelete.has(item.id));
    if (stillExist.length > 0) {
      console.error(`❌ CRITICAL: ${stillExist.length} items still exist in AsyncStorage!`);
    } else {
      console.log('✅ All items successfully removed from AsyncStorage');
    }

    // Background cleanup
    const online = await isOnline();
    if (online && userId) {
      // Delete all from Firestore in parallel
      Promise.all([
        // Delete documents
        ...historyIds.map(id => 
          deleteDoc(doc(db, 'users', userId, 'history', id))
            .then(() => console.log(`✅ Deleted ${id} from Firestore`))
            .catch(err => console.warn(`⚠️ Firestore delete failed for ${id}:`, err))
        ),
        
        // Delete public scans
        ...itemsToDelete
          .filter(item => item.isPublic)
          .map(item => 
            deleteDoc(doc(db, 'publicScans', item.id))
              .catch(err => console.warn('⚠️ Public scan delete failed:', err))
          ),
        
        // Delete images
        ...itemsToDelete
          .filter(item => item.imagePath)
          .map(item => 
            deleteImageFromStorage(item.imagePath)
              .catch(err => console.warn('⚠️ Image delete failed:', err))
          )
      ]);
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error batch deleting items:', error);
    return { success: false, error: error.message };
  }
};

export const clearAllHistory = async (userId) => {
  try {
    const storageKey = getHistoryKey(userId);

    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing).map(normalizeItem) : [];

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
        
        console.log('✅ All history cleared');
      } catch (firestoreError) {
        console.warn('⚠️ Firestore clear failed:', firestoreError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error clearing history:', error);
    return { success: false, error: error.message };
  }
};

// ==================== FAVORITES FUNCTIONS ====================

export const addToFavorites = async (userId, favoriteData) => {
  try {
    const storageKey = getFavoritesKey(userId);
    let uploadedImageUrl = favoriteData.imageUrl;
    let imagePath = null;

    // Validate if imageUrl is already a valid remote URL
    const isValidRemoteUrl = (url) => {
      if (!url) return false;
      return url.startsWith('http://') || url.startsWith('https://');
    };

    const online = await isOnline();
    
    // Check if we have a valid remote URL already
    const hasValidImageUrl = isValidRemoteUrl(uploadedImageUrl);
    
    // Only upload if necessary
    if (online && userId && favoriteData.imageUri) {
      const shouldUpload = !hasValidImageUrl || 
                          (favoriteData.imageUri !== uploadedImageUrl);
      
      if (shouldUpload) {
        console.log('📤 Uploading image to Firebase Storage for favorite...');
        const uploadResult = await uploadImageToStorage(
          favoriteData.imageUri, 
          userId, 
          'favorites'
        );
        
        if (uploadResult.success) {
          uploadedImageUrl = uploadResult.url;
          imagePath = uploadResult.path;
          console.log('✅ Image uploaded successfully:', uploadedImageUrl);
        } else {
          console.error('❌ Image upload failed:', uploadResult.error);
          if (hasValidImageUrl) {
            console.log('⚠️ Using existing valid imageUrl since upload failed');
          }
        }
      } else {
        console.log('✅ Valid imageUrl already exists, skipping upload');
      }
    } else if (!online && favoriteData.imageUri && !hasValidImageUrl) {
      console.warn('⚠️ Offline and no valid remote URL - favorite will be saved without image');
      uploadedImageUrl = null;
    }

    // Create favorite item
    const itemWithId = {
      ...favoriteData,
      imageUrl: uploadedImageUrl,
      imagePath: imagePath,
      id: `favorite_temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      addedAt: Date.now(),
      synced: false, // Mark as unsynced
    };

    delete itemWithId.imageUri;

    // Get existing favorites
    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing).map(normalizeItem) : [];
    
    // Remove duplicates
    const filteredList = list.filter(item => {
      if (favoriteData.taxonId && item.taxonId === favoriteData.taxonId) {
        return false;
      }
      const itemName = (item.scientificName || item.name || '').toLowerCase().trim();
      const dataName = (favoriteData.scientificName || favoriteData.name || '').toLowerCase().trim();
      if (itemName === dataName && itemName !== '') {
        return false;
      }
      return true;
    });

    // Normalize before saving
    const normalizedItem = normalizeItem(itemWithId);

    // Add to local storage
    const updatedList = [normalizedItem, ...filteredList];
    await AsyncStorage.setItem(storageKey, JSON.stringify(updatedList));
    console.log('💾 Saved favorite to AsyncStorage');

    // Trigger background sync if online
    if (online && userId) {
      setTimeout(() => syncUserData(userId), 1000);
    }

    return { success: true, id: normalizedItem.id };
  } catch (error) {
    console.error('❌ Error adding to favorites:', error);
    return { success: false, error: error.message };
  }
};

export const getFavorites = async (userId) => {
  try {
    const storageKey = getFavoritesKey(userId);
    
    // Check if we need to initialize
    if (userId) {
      const needsInit = await needsInitialization(userId);
      if (needsInit) {
        console.log('🔄 First time on device, initializing data...');
        await initializeUserData(userId);
      } else {
        // Try to sync in background
        const online = await isOnline();
        if (online) {
          setTimeout(() => syncUserData(userId), 2000);
        }
      }
    }

    const local = await AsyncStorage.getItem(storageKey);
    let localItems = local ? JSON.parse(local) : [];
    
    // Normalize all items
    localItems = localItems.map(normalizeItem);
    
    console.log(`📱 Loaded ${localItems.length} favorites`);
    
    return { success: true, data: localItems };
  } catch (error) {
    console.error('❌ Error getting favorites:', error);
    return { success: false, error: error.message };
  }
};

export const removeFromFavorites = async (userId, favoriteId) => {
  try {
    const storageKey = getFavoritesKey(userId);

    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing).map(normalizeItem) : [];
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
        console.log('✅ Removed from Firestore');
      } catch (firestoreError) {
        console.warn('⚠️ Firestore delete failed:', firestoreError);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Error removing from favorites:', error);
    return { success: false, error: error.message };
  }
};

export const isInFavorites = async (userId, plantName) => {
  try {
    const storageKey = getFavoritesKey(userId);
    const local = await AsyncStorage.getItem(storageKey);
    let list = local ? JSON.parse(local) : [];
    
    // Normalize items
    list = list.map(normalizeItem);
    
    const found = list.find(item => item.plantName === plantName || item.name === plantName);
    
    return { success: true, isFavorite: !!found, id: found?.id };
  } catch (error) {
    console.error('❌ Error checking favorites:', error);
    return { success: false, error: error.message };
  }
};

// ==================== USER LOGIN HANDLER ====================

/**
 * Call this when user logs in to handle new device detection
 */
export const handleUserLogin = async (userId) => {
  try {
    console.log('👤 User logged in, checking device...');
    
    const needsInit = await needsInitialization(userId);
    if (needsInit) {
      console.log('📱 New device detected, initializing data');
      const result = await initializeUserData(userId);
      if (result.success) {
        console.log('✅ Data initialized for new device');
      } else {
        console.error('❌ Failed to initialize data:', result.error);
      }
      return result;
    } else {
      console.log('📱 Existing device, syncing data');
      const result = await syncUserData(userId);
      return result;
    }
  } catch (error) {
    console.error('❌ Error handling user login:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear local data when user logs out
 */
export const handleUserLogout = async (userId) => {
  try {
    if (!userId) return;
    
    // Clear only this user's data
    const keys = [getHistoryKey(userId), getFavoritesKey(userId), getSyncStatusKey(userId)];
    await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
    
    console.log('✅ Cleared user data on logout');
    return { success: true };
  } catch (error) {
    console.error('❌ Error clearing user data:', error);
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
      console.log('✅ Subscription added');
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error adding subscription:', error);
    return { success: false, error: error.message };
  }
};

export const getSubscription = async (userId) => {
  try {
    const online = await isOnline();
    
    if (online && userId) {
      const subscriptionDoc = await getDoc(doc(db, 'users', userId, 'subscriptions', 'current'));
      if (subscriptionDoc.exists()) {
        const data = subscriptionDoc.data();
        return { success: true, data };
      }
    }
    
    return { success: false, error: 'No subscription found' };
  } catch (error) {
    console.error('❌ Error getting subscription:', error);
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
      console.log('✅ Subscription cancelled');
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error cancelling subscription:', error);
    return { success: false, error: error.message };
  }
};

// ==================== GLOBAL OBSERVATIONS ====================

/**
 * ✅ OPTIMIZED: Get global observation counts with caching
 */
export const getGlobalObservationCounts = async (speciesArray) => {
  try {
    const online = await isOnline();
    
    if (!online) {
      return { success: false, counts: globalCountsCache.data || {} };
    }

    // ✅ Check cache first
    const now = Date.now();
    if (now - globalCountsCache.lastFetch < globalCountsCache.CACHE_DURATION) {
      console.log('✅ Using cached global counts');
      return { success: true, counts: globalCountsCache.data };
    }

    console.log('🔄 Fetching fresh global counts...');

    const counts = {};
    
    // ✅ OPTIMIZATION: Batch fetch instead of individual queries
    const docIds = speciesArray
      .map(species => {
        if (!species.taxonId && !species.scientificName && !species.name) return null;
        return species.taxonId 
          ? `taxon_${species.taxonId}` 
          : (species.scientificName || species.name || '').toLowerCase().replace(/\s+/g, '_');
      })
      .filter(id => id);

    // ✅ Limit to 10 at a time to avoid overwhelming Firestore
    const uniqueDocIds = [...new Set(docIds)].slice(0, 10);
    
    console.log(`📊 Fetching counts for ${uniqueDocIds.length} species...`);

    const fetchPromises = uniqueDocIds.map(async (docId) => {
      try {
        const observationRef = doc(db, 'globalObservations', docId);
        const observationDoc = await getDoc(observationRef);

        if (observationDoc.exists()) {
          counts[docId] = observationDoc.data().count || 0;
        } else {
          counts[docId] = 0;
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch count for ${docId}:`, error);
        counts[docId] = 0;
      }
    });

    // ✅ Fetch in parallel with timeout
    await Promise.race([
      Promise.all(fetchPromises),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch timeout')), 5000)
      )
    ]).catch(err => {
      console.warn('⚠️ Some counts timed out:', err);
    });

    // ✅ Update cache
    globalCountsCache.data = { ...globalCountsCache.data, ...counts };
    globalCountsCache.lastFetch = now;

    console.log(`✅ Fetched ${Object.keys(counts).length} counts`);
    return { success: true, counts: globalCountsCache.data };
  } catch (error) {
    console.error('❌ Error getting observation counts:', error);
    return { success: false, counts: globalCountsCache.data || {} };
  }
};

export const incrementGlobalObservation = async (speciesData) => {
  try {
    const online = await isOnline();
    
    if (!online) {
      console.log('📶 Offline: Will sync when online');
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
      console.log(`✅ Global observation: ${currentCount + 1}`);
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
      console.log('✅ Global observation created: 1');
      return { success: true, count: 1 };
    }
  } catch (error) {
    console.error('❌ Error incrementing observation:', error);
    return { success: false, error: error.message };
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
    const q = query(globalObsRef, orderBy('count', 'desc'), limit(limitCount * 2));

    const querySnapshot = await getDocs(q);

    const trendingSpecies = [];

    for (const docSnap of querySnapshot.docs) {
      const data = docSnap.data();

      const lastScanned = convertTimestampToNumber(data.lastScanned);
      const count = data.count || 0;

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
            console.warn('⚠️ Failed to fetch details:', error);
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
            console.warn('⚠️ Failed to fetch by name:', error);
          }
        }

        // Calculate trending score
        const daysSinceLastScan = (Date.now() - lastScanned) / (24 * 60 * 60 * 1000);
        const recencyBonus = Math.max(0, 90 - daysSinceLastScan) / 90;
        const trendingScore = count + (count * recencyBonus * 0.5);

        trendingSpecies.push({
          taxonId: data.taxonId,
          name: data.speciesName || data.scientificName || data.commonName,
          scientificName: data.scientificName,
          commonName: data.commonName,
          count: count,
          lastScanned: lastScanned,
          firstScanned: convertTimestampToNumber(data.firstScanned),
          imageUrl: imageUrl,
          iconicTaxon: iconicTaxon,
          rank: rank,
          about: about,
          globalObsCount: count,
          trendingScore: trendingScore,
        });
      }
    }

    // Sort by trending score
    trendingSpecies.sort((a, b) => b.trendingScore - a.trendingScore);

    const topTrending = trendingSpecies.slice(0, limitCount);

    console.log(`✅ Loaded ${topTrending.length} trending species`);
    return { success: true, data: topTrending };
  } catch (error) {
    console.error('❌ Error getting trending species:', error);
    return { success: false, data: [], error: error.message };
  }
};

export const getTrendingByCategory = async (iconicTaxon, limitCount = 10) => {
  try {
    const result = await getTrendingSpecies(100);

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
    console.error('❌ Error getting trending by category:', error);
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
    console.error('❌ Error getting trending stats:', error);
    return { success: false, error: error.message };
  }
};

export async function getSpeciesScans(taxonId, speciesName) {
  try {
    console.log('🔍 Fetching species scans for:', { taxonId, speciesName });

    const publicScansRef = collection(db, 'publicScans');
    let scansQuery;

    if (taxonId) {
      console.log('📊 Querying by taxonId:', taxonId);
      scansQuery = query(
        publicScansRef,
        where('taxonId', '==', taxonId),
        orderBy('publishedAt', 'desc')
      );
    } else if (speciesName) {
      console.log('📊 Querying by name:', speciesName);
      scansQuery = query(
        publicScansRef,
        where('name', '==', speciesName),
        orderBy('publishedAt', 'desc')
      );
    } else {
      console.error('❌ No taxonId or species name provided');
      return {
        success: false,
        data: [],
        error: 'No taxonId or species name provided',
      };
    }

    console.log('⏳ Executing Firestore query...');
    const snapshot = await getDocs(scansQuery);
    console.log(`✅ Found ${snapshot.size} scans`);

    const scans = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const normalizedData = normalizeItem({
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
        about: data.about || null,
      });
      scans.push(normalizedData);
    });

    console.log('✅ Successfully processed scans');
    return {
      success: true,
      data: scans,
    };
  } catch (error) {
    console.error('❌ Error fetching species scans:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    if (error.message?.includes('index')) {
      console.error('⚠️ Firestore Index Required!');
    }

    if (error.code === 'permission-denied') {
      console.error('⚠️ Permission Denied! Check Firestore rules.');
    }

    return {
      success: false,
      data: [],
      error: error.message,
    };
  }
}