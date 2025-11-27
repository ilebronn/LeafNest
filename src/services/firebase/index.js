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
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
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
  onSnapshot
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBfZ1g1YhPLDKghIRgQ4UXbsoGZKjItRE",
  authDomain: "leafnest-98408.firebaseapp.com",
  projectId: "leafnest-98408",
  storageBucket: "leafnest-98408.firebasestorage.app",
  messagingSenderId: "412130350031",
  appId: "1:412130350031:web:eb265fc7b9daf6e74b78ba"
};

// Initialize Firebase only if it hasn't been initialized yet
let app;
let auth;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} else {
  app = getApp();
  auth = getAuth(app);
}

// Initialize Firestore, Storage, and Functions
export { auth };
export const db = getFirestore(app);
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
  onSnapshot
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
  signOut
} from 'firebase/auth';

// Export Functions utilities
export { httpsCallable } from 'firebase/functions';

// Helper function to upload image to Firebase Storage
export const uploadImageToStorage = async (uri, userId, folder = 'scans') => {
  try {
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const storageRef = ref(storage, `${folder}/${userId}/${filename}`);
    
    const response = await fetch(uri);
    const blob = await response.blob();
    
    await uploadBytes(storageRef, blob);
    
    const downloadURL = await getDownloadURL(storageRef);
    
    return { success: true, url: downloadURL, path: storageRef.fullPath };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to delete image from Firebase Storage
export const deleteImageFromStorage = async (imagePath) => {
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting image:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to upload image with progress tracking
export const uploadImageWithProgress = (uri, userId, folder = 'scans', onProgress) => {
  return new Promise(async (resolve, reject) => {
    try {
      const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const storageRef = ref(storage, `${folder}/${userId}/${filename}`);
      
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const uploadTask = uploadBytesResumable(storageRef, blob);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          console.error('Upload error:', error);
          reject({ success: false, error: error.message });
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ 
            success: true, 
            url: downloadURL, 
            path: uploadTask.snapshot.ref.fullPath 
          });
        }
      );
    } catch (error) {
      console.error('Error preparing upload:', error);
      reject({ success: false, error: error.message });
    }
  });
};

// Re-export all functions from firestore.js
export { 
  getPublicScans, 
  getTrendingSpecies,
  getTrendingByCategory,
  getTrendingStats,
  getSpeciesScans,
  addToHistory,
  getHistory,
  deleteHistoryItem,
  clearAllHistory,
  addToFavorites,
  getFavorites,
  removeFromFavorites,
  isInFavorites,
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  toggleHistoryItemVisibility,
  getUserPublicScans,
  incrementGlobalObservation,
  getGlobalObservationCounts,
  updateHistoryTimestamp,
  saveHistoryWithDuplicateCheck,
  cleanupDuplicateHistory,
  addSubscription,
  getSubscription,
  cancelSubscription,
} from './firestore';

export default app;