// scanStatsService.js
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Helper to check network status
const isOnline = async () => {
  const state = await NetInfo.fetch();
  return state.isConnected;
};

// Helper to get AsyncStorage key for scans
const getScansKey = (uid) => uid ? `scans_${uid}` : 'scans_guest';
const getStatsKey = (uid) => uid ? `stats_${uid}` : 'stats_guest';

// ==================== RECORD SCAN ====================

export const recordScan = async (userId, scanData) => {
  try {
    // ✅ Only record scans for authenticated users
    if (!userId || userId === 'guest') {
      console.log('ℹ️ Guest user - scan not recorded');
      return { success: false, message: 'Guest users cannot record scans' };
    }

    const storageKey = getScansKey(userId);
    const scanRecord = {
      ...scanData,
      id: `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      date: new Date().toISOString(),
      synced: false,
      userId: userId,
    };

    // Always save to AsyncStorage first (offline-first)
    const existing = await AsyncStorage.getItem(storageKey);
    const list = existing ? JSON.parse(existing) : [];
    list.unshift(scanRecord);
    await AsyncStorage.setItem(storageKey, JSON.stringify(list));

    // Update local stats cache
    await updateLocalStats(userId);

    // Try to sync to Firestore if online
    const online = await isOnline();
    if (online) {
      try {
        const scansRef = collection(db, 'users', userId, 'scans');
        await addDoc(scansRef, {
          ...scanData,
          timestamp: serverTimestamp(),
        });
        
        // Update stats in Firestore
        await updateFirestoreStats(userId);
        
        // Mark as synced in AsyncStorage
        scanRecord.synced = true;
        await AsyncStorage.setItem(storageKey, JSON.stringify(list));
        console.log('✅ Scan recorded to Firestore');
      } catch (firestoreError) {
        console.warn('⚠️ Firestore save failed, kept in AsyncStorage:', firestoreError);
      }
    } else {
      console.log('📱 Scan saved locally (offline mode)');
    }

    return { success: true, id: scanRecord.id };
  } catch (error) {
    console.error('❌ Error recording scan:', error);
    return { success: false, error: error.message };
  }
};

// ==================== UPDATE STATS ====================

const updateLocalStats = async (userId) => {
  try {
    const scansKey = getScansKey(userId);
    const statsKey = getStatsKey(userId);
    
    const scansData = await AsyncStorage.getItem(scansKey);
    const scans = scansData ? JSON.parse(scansData) : [];
    
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    const stats = {
      totalScans: scans.length,
      todayScans: scans.filter(s => s.timestamp > oneDayAgo).length,
      weekScans: scans.filter(s => s.timestamp > oneWeekAgo).length,
      monthScans: scans.filter(s => s.timestamp > oneMonthAgo).length,
      lastScanDate: scans.length > 0 ? scans[0].timestamp : null,
      uniqueSpecies: [...new Set(scans.map(s => s.speciesName || s.plantName))].length,
      lastUpdated: now,
    };
    
    await AsyncStorage.setItem(statsKey, JSON.stringify(stats));
    return stats;
  } catch (error) {
    console.error('Error updating local stats:', error);
    return null;
  }
};

const updateFirestoreStats = async (userId) => {
  try {
    if (!userId || userId === 'guest') return;
    
    const scansRef = collection(db, 'users', userId, 'scans');
    const querySnapshot = await getDocs(scansRef);
    
    const scans = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      scans.push({
        ...data,
        timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(),
      });
    });
    
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    const stats = {
      totalScans: scans.length,
      todayScans: scans.filter(s => s.timestamp > oneDayAgo).length,
      weekScans: scans.filter(s => s.timestamp > oneWeekAgo).length,
      monthScans: scans.filter(s => s.timestamp > oneMonthAgo).length,
      lastScanDate: scans.length > 0 ? Math.max(...scans.map(s => s.timestamp)) : null,
      uniqueSpecies: [...new Set(scans.map(s => s.speciesName || s.plantName))].filter(Boolean).length,
      lastUpdated: serverTimestamp(),
    };
    
    const statsRef = doc(db, 'users', userId, 'stats', 'scanStats');
    await setDoc(statsRef, stats);
    console.log('✅ Stats updated in Firestore');
  } catch (error) {
    console.error('❌ Error updating Firestore stats:', error);
  }
};

// ==================== GET STATS ====================

export const getScanStats = async (userId) => {
  try {
    // ✅ Return empty stats for guest users
    if (!userId || userId === 'guest') {
      console.log('ℹ️ Guest user - returning empty stats');
      return { success: true, data: getDefaultStats() };
    }

    const statsKey = getStatsKey(userId);
    const online = await isOnline();

    // Try to get from Firestore if online and authenticated
    if (online) {
      try {
        const statsRef = doc(db, 'users', userId, 'stats', 'scanStats');
        const statsDoc = await getDoc(statsRef);
        
        if (statsDoc.exists()) {
          const firestoreStats = statsDoc.data();
          // Convert Firestore timestamp if needed
          if (firestoreStats.lastScanDate?.toMillis) {
            firestoreStats.lastScanDate = firestoreStats.lastScanDate.toMillis();
          }
          
          // Save to AsyncStorage for offline access
          await AsyncStorage.setItem(statsKey, JSON.stringify(firestoreStats));
          console.log('📊 Stats loaded from Firestore');
          
          return { success: true, data: firestoreStats };
        }
      } catch (firestoreError) {
        console.warn('⚠️ Firestore stats fetch failed, using local data:', firestoreError);
      }
    }

    // Fallback to AsyncStorage (offline mode)
    const localStats = await AsyncStorage.getItem(statsKey);
    if (localStats) {
      console.log('📱 Stats loaded from AsyncStorage');
      return { success: true, data: JSON.parse(localStats) };
    }
    
    // If no stats exist, calculate from scans
    const stats = await updateLocalStats(userId);
    return { success: true, data: stats || getDefaultStats() };
    
  } catch (error) {
    console.error('❌ Error getting scan stats:', error);
    return { success: false, data: getDefaultStats() };
  }
};

// ==================== GET SCAN HISTORY ====================

export const getScanHistory = async (userId, limit = 50) => {
  try {
    // ✅ Return empty array for guest users
    if (!userId || userId === 'guest') {
      console.log('ℹ️ Guest user - returning empty scan history');
      return { success: true, data: [] };
    }

    const storageKey = getScansKey(userId);
    const online = await isOnline();

    // Try to get from Firestore if online
    if (online) {
      try {
        const scansRef = collection(db, 'users', userId, 'scans');
        const q = query(scansRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const firestoreScans = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          firestoreScans.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toMillis ? data.timestamp.toMillis() : Date.now(),
            synced: true,
          });
        });

        // Save to AsyncStorage for offline access
        await AsyncStorage.setItem(storageKey, JSON.stringify(firestoreScans));
        console.log('📊 Scan history loaded from Firestore');
        
        return { success: true, data: firestoreScans.slice(0, limit) };
      } catch (firestoreError) {
        console.warn('⚠️ Firestore fetch failed, using local data:', firestoreError);
      }
    }

    // Fallback to AsyncStorage
    const local = await AsyncStorage.getItem(storageKey);
    const localScans = local ? JSON.parse(local) : [];
    console.log('📱 Scan history loaded from AsyncStorage');
    
    return { success: true, data: localScans.slice(0, limit) };
  } catch (error) {
    console.error('❌ Error getting scan history:', error);
    return { success: false, data: [] };
  }
};

// ==================== DAILY SCAN CHART DATA ====================

export const getDailyScanData = async (userId, days = 7) => {
  try {
    const { data: scans } = await getScanHistory(userId, 1000);
    
    const now = Date.now();
    const dailyData = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const dayStart = now - (i * 24 * 60 * 60 * 1000);
      const dayEnd = dayStart + (24 * 60 * 60 * 1000);
      
      const dayScans = scans.filter(s => 
        s.timestamp >= dayStart && s.timestamp < dayEnd
      );
      
      const date = new Date(dayStart);
      // Use shorter format for month view
      const dateFormat = days > 7 
        ? { month: 'numeric', day: 'numeric' }  // "10/14"
        : { month: 'short', day: 'numeric' };   // "Oct 14"
      
      dailyData.push({
        date: date.toLocaleDateString('en-US', dateFormat),
        scans: dayScans.length,
        fullDate: date.toISOString(),
      });
    }
    
    return { success: true, data: dailyData };
  } catch (error) {
    console.error('❌ Error getting daily scan data:', error);
    return { success: false, data: [] };
  }
};

// ==================== HELPERS ====================

const getDefaultStats = () => ({
  totalScans: 0,
  todayScans: 0,
  weekScans: 0,
  monthScans: 0,
  lastScanDate: null,
  uniqueSpecies: 0,
});

// ==================== SYNC PENDING SCANS ====================

export const syncPendingScans = async (userId) => {
  // ✅ Only allow sync for authenticated users
  if (!userId || userId === 'guest') {
    console.log('ℹ️ Guest user - sync not available');
    return { success: false, message: 'Sync not available for guest users' };
  }
  
  try {
    const online = await isOnline();
    if (!online) return { success: false, message: 'Offline' };
    
    const storageKey = getScansKey(userId);
    const local = await AsyncStorage.getItem(storageKey);
    const scans = local ? JSON.parse(local) : [];
    
    const unsynced = scans.filter(s => !s.synced);
    if (unsynced.length === 0) return { success: true, synced: 0 };
    
    let syncedCount = 0;
    const scansRef = collection(db, 'users', userId, 'scans');
    
    for (const scan of unsynced) {
      try {
        await addDoc(scansRef, {
          speciesName: scan.speciesName,
          plantName: scan.plantName,
          confidence: scan.confidence,
          timestamp: new Date(scan.timestamp),
        });
        scan.synced = true;
        syncedCount++;
      } catch (err) {
        console.warn('Failed to sync scan:', err);
      }
    }
    
    await AsyncStorage.setItem(storageKey, JSON.stringify(scans));
    await updateFirestoreStats(userId);
    
    console.log(`✅ Synced ${syncedCount} scans to Firestore`);
    return { success: true, synced: syncedCount };
  } catch (error) {
    console.error('❌ Error syncing scans:', error);
    return { success: false, error: error.message };
  }
};