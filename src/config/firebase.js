// firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  CACHE_SIZE_UNLIMITED,
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
  limit,
  onSnapshot,
  writeBatch,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';

// ✅ Import environment variables
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID
} from '@env';

// ✅ Use environment variables directly (not ENV.FIREBASE_API_KEY)
const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,           // ✅ Fixed
  authDomain: FIREBASE_AUTH_DOMAIN,   // ✅ Fixed
  projectId: FIREBASE_PROJECT_ID,     // ✅ Fixed
  storageBucket: FIREBASE_STORAGE_BUCKET, // ✅ Fixed
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID, // ✅ Fixed
  appId: FIREBASE_APP_ID              // ✅ Fixed
};

// ✅ Validate that all required environment variables are present
if (!FIREBASE_API_KEY || !FIREBASE_AUTH_DOMAIN || !FIREBASE_PROJECT_ID || 
    !FIREBASE_STORAGE_BUCKET || !FIREBASE_MESSAGING_SENDER_ID || !FIREBASE_APP_ID) {
  console.error('❌ Missing required environment variables');
  console.log('Check your .env file and make sure all Firebase variables are set');
  throw new Error('Missing Firebase configuration');
}

// Initialize Firebase with better error handling
let app;
let auth;
let db;

try {
  if (getApps().length === 0) {
    // First initialization - set up everything properly
    app = initializeApp(firebaseConfig);
    
    // Initialize Auth with AsyncStorage persistence
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    
    // Initialize Firestore with better caching settings
    // ✅ CORRECT - Use only localCache
db = getFirestore(app);
    
    console.log('✅ Firebase initialized successfully');
  } else {
    // Already initialized - get existing instances
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    
    console.log('✅ Firebase instance retrieved');
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw new Error(`Firebase initialization failed: ${error.message}`);
}

// Initialize Storage and Functions
export { auth, db };
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Export Firestore functions for easy access
export {
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
  limit,
  onSnapshot,
  writeBatch,
  runTransaction,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp
};

// Export Storage functions for image uploads
export { 
  ref, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
};

// Export Auth functions for authentication
export { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';

// Export Functions utilities
export { httpsCallable } from 'firebase/functions';

// ✅ Helper function to upload image to Firebase Storage
export const uploadImageToStorage = async (uri, userId, folder = 'scans') => {
  try {
    if (!uri || !userId) {
      throw new Error('URI and userId are required');
    }

    // Create a unique filename
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, `${folder}/${userId}/${filename}`);
    
    // Convert URI to blob for upload
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }
    
    const blob = await response.blob();
    
    // Validate blob size (max 5MB)
    if (blob.size > 5 * 1024 * 1024) {
      throw new Error('Image size exceeds 5MB limit');
    }
    
    // Upload the image
    await uploadBytes(storageRef, blob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    return { success: true, url: downloadURL, path: storageRef.fullPath };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { success: false, error: error.message };
  }
};

// ✅ Helper function to delete image from Firebase Storage
export const deleteImageFromStorage = async (imagePath) => {
  try {
    if (!imagePath) {
      throw new Error('Image path is required');
    }

    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    
    console.log('✅ Image deleted successfully');
    return { success: true };
  } catch (error) {
    // If file doesn't exist, consider it a success
    if (error.code === 'storage/object-not-found') {
      console.log('⚠️ Image already deleted or not found');
      return { success: true };
    }
    
    console.error('Error deleting image:', error);
    return { success: false, error: error.message };
  }
};

// ✅ Helper function to upload image with progress tracking
export const uploadImageWithProgress = (uri, userId, folder = 'scans', onProgress) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!uri || !userId) {
        reject({ success: false, error: 'URI and userId are required' });
        return;
      }

      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, `${folder}/${userId}/${filename}`);
      
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const blob = await response.blob();
      
      // Validate blob size
      if (blob.size > 5 * 1024 * 1024) {
        reject({ success: false, error: 'Image size exceeds 5MB limit' });
        return;
      }
      
      const uploadTask = uploadBytesResumable(storageRef, blob);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(Math.round(progress));
          }
        },
        (error) => {
          console.error('Upload error:', error);
          reject({ success: false, error: error.message });
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ 
              success: true, 
              url: downloadURL, 
              path: uploadTask.snapshot.ref.fullPath 
            });
          } catch (error) {
            reject({ success: false, error: error.message });
          }
        }
      );
    } catch (error) {
      console.error('Error preparing upload:', error);
      reject({ success: false, error: error.message });
    }
  });
};

export default app;