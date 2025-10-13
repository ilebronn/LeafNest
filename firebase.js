// firebase.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, updateProfile, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore'; // ✅ ADD THIS LINE
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBBfZ1g1YhPLDKghIRgQ4UXbsoGZKjItRE",
  authDomain: "leafnest-98408.firebaseapp.com",
  projectId: "leafnest-98408",
  storageBucket: "leafnest-98408.firebasestorage.app",
  messagingSenderId: "412130350031",
  appId: "1:412130350031:web:eb265fc7b9daf6e74b78ba"
};

// Initialize Firebase app only if it hasn't been initialized yet
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication
let auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  if (!globalThis._firebaseAuthInstance) {
    globalThis._firebaseAuthInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
  auth = globalThis._firebaseAuthInstance;
}

// ✅ ADD THIS: Initialize Firestore
const db = getFirestore(app);

// ✅ UPDATE THIS: Export everything (added db and Firestore functions)
export { 
  auth, 
  db,  // ✅ ADD THIS
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  updateProfile,
  // ✅ ADD THESE Firestore functions
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
};