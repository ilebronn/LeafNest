import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CACHE_EXPIRY_MS,
  MAX_CACHE_SIZE,
  CACHE_SAVE_DEBOUNCE_MS,
  CACHE_STORAGE_KEY
} from './constants';

// Candidate scores can be 0-1 or 0-100 depending on source; normalize to percent.
const toPercentScore = (score) => {
  const n = Number(score);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n <= 1.5) return Math.min(n * 100, 100);
  return Math.min(n, 100);
};

/**
 * SpeciesCache - Manages in-memory and persistent caching of species data
 * Features:
 * - LRU (Least Recently Used) eviction when cache is full
 * - Debounced persistence to AsyncStorage
 * - Automatic expiry of old entries
 * - Multiple key lookup (scientific name, common name, etc.)
 */
class SpeciesCache {
  constructor() {
    this.cache = new Map();
    this.saveTimeout = null;
    this.isInitialized = false;
  }

  /**
   * Initialize cache by loading from AsyncStorage
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('📦 Cache already initialized');
      return;
    }

    try {
      const cached = await AsyncStorage.getItem(CACHE_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        let loadedCount = 0;
        let expiredCount = 0;

        Object.entries(parsed).forEach(([key, value]) => {
          if (Date.now() - value.timestamp < CACHE_EXPIRY_MS) {
            this.cache.set(key, value);
            loadedCount++;
          } else {
            expiredCount++;
          }
        });

        console.log(`📦 Cache loaded: ${loadedCount} entries, ${expiredCount} expired`);
      } else {
        console.log('📦 No cached data found, starting fresh');
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Error loading cache:', error);
      this.isInitialized = true; // Continue even if load fails
    }
  }

  /**
   * Get a cached species by key
   * @param {string} key - Cache key (species name, common name, etc.)
   * @returns {Object|null} - Cached species data or null if not found/expired
   */
  get(key) {
    if (!key || typeof key !== 'string') {
      return null;
    }

    const normalizedKey = this._normalizeKey(key);
    const cached = this.cache.get(normalizedKey);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp >= CACHE_EXPIRY_MS) {
      this.cache.delete(normalizedKey);
      console.log(`🗑️ Expired cache entry removed: ${normalizedKey}`);
      return null;
    }

    // Cache hit!
    console.log(`⚡ Cache HIT: ${normalizedKey}`);
    return cached.data;
  }

  /**
   * Store species data in cache with multiple keys
   * @param {string} primaryKey - Main key (usually scientific name)
   * @param {Object} data - Species data to cache
   * @param {Object} options - Additional options
   * @param {string[]} options.alternateKeys - Alternative keys (e.g., common name)
   * @param {boolean} options.persist - Whether to persist immediately (default: false)
   * @returns {void}
   */
  set(primaryKey, data, options = {}) {
    if (!primaryKey || typeof primaryKey !== 'string') {
      console.warn('⚠️ Invalid cache key provided');
      return;
    }

    const { alternateKeys = [], persist = false } = options;

    // Implement LRU eviction if cache is full
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this._evictOldestEntry();
    }

    const cacheEntry = {
      data,
      timestamp: Date.now()
    };

    // Store with primary key
    const normalizedPrimaryKey = this._normalizeKey(primaryKey);
    this.cache.set(normalizedPrimaryKey, cacheEntry);

    // Store with alternate keys
    alternateKeys.forEach(altKey => {
      if (altKey && typeof altKey === 'string') {
        const normalizedAltKey = this._normalizeKey(altKey);
        this.cache.set(normalizedAltKey, cacheEntry);
      }
    });

    console.log(`💾 Cached: ${normalizedPrimaryKey}${alternateKeys.length > 0 ? ` (+${alternateKeys.length} aliases)` : ''}`);

    // Persist to storage (debounced or immediate)
    if (persist) {
      this.persistToStorage();
    } else {
      this.debouncedSave();
    }
  }

  /**
   * Check if any of the candidate names exist in cache
   * @param {Array} candidates - Array of candidate objects with {name, score}
   * @returns {Object|null} - First matching cached result or null
   */
  checkCandidates(candidates) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return null;
    }

    for (const candidate of candidates.slice(0, 5)) {
      if (!candidate.name) continue;

      const cached = this.get(candidate.name);
      if (cached) {
        // Return cached data with updated confidence from current scan
        return {
          ...cached,
          confidence: Math.round(toPercentScore(candidate.score)),
          source: 'cache'
        };
      }
    }

    return null;
  }

  /**
   * Delete a cache entry
   * @param {string} key - Cache key to delete
   * @returns {boolean} - True if deleted, false if not found
   */
  delete(key) {
    if (!key || typeof key !== 'string') {
      return false;
    }

    const normalizedKey = this._normalizeKey(key);
    const deleted = this.cache.delete(normalizedKey);

    if (deleted) {
      console.log(`🗑️ Deleted cache entry: ${normalizedKey}`);
      this.debouncedSave();
    }

    return deleted;
  }

  /**
   * Clear all cache entries
   * @returns {Promise<void>}
   */
  async clear() {
    this.cache.clear();
    console.log('🧹 Cache cleared');

    try {
      await AsyncStorage.removeItem(CACHE_STORAGE_KEY);
      console.log('🧹 Persistent cache cleared');
    } catch (error) {
      console.error('❌ Error clearing persistent cache:', error);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getStats() {
    let validEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach((value) => {
      if (Date.now() - value.timestamp < CACHE_EXPIRY_MS) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    });

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: MAX_CACHE_SIZE,
      utilizationPercent: Math.round((validEntries / MAX_CACHE_SIZE) * 100)
    };
  }

  /**
   * Clean up expired entries
   * @returns {number} - Number of entries removed
   */
  cleanExpired() {
    let removedCount = 0;
    const now = Date.now();

    this.cache.forEach((value, key) => {
      if (now - value.timestamp >= CACHE_EXPIRY_MS) {
        this.cache.delete(key);
        removedCount++;
      }
    });

    if (removedCount > 0) {
      console.log(`🧹 Cleaned ${removedCount} expired cache entries`);
      this.debouncedSave();
    }

    return removedCount;
  }

  /**
   * Debounced save to AsyncStorage
   * @private
   */
  debouncedSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.persistToStorage();
    }, CACHE_SAVE_DEBOUNCE_MS);
  }

  /**
   * Immediately persist cache to AsyncStorage
   * @returns {Promise<void>}
   */
  async persistToStorage() {
    try {
      const cacheObj = {};
      this.cache.forEach((value, key) => {
        // Only save non-expired entries
        if (Date.now() - value.timestamp < CACHE_EXPIRY_MS) {
          cacheObj[key] = value;
        }
      });

      await AsyncStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cacheObj));
      console.log(`💾 Cache persisted: ${Object.keys(cacheObj).length} entries`);
    } catch (error) {
      console.error('❌ Error saving cache:', error);
    }
  }

  /**
   * Normalize cache key (lowercase, trim)
   * @private
   * @param {string} key - Raw key
   * @returns {string} - Normalized key
   */
  _normalizeKey(key) {
    return key.toLowerCase().trim();
  }

  /**
   * Evict oldest entry (LRU eviction)
   * @private
   */
  _evictOldestEntry() {
    let oldestKey = null;
    let oldestTimestamp = Date.now();

    this.cache.forEach((value, key) => {
      if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`🗑️ LRU eviction: ${oldestKey}`);
    }
  }
}

// Create and export singleton instance
const cacheInstance = new SpeciesCache();

export default cacheInstance;

// Export class for testing purposes
export { SpeciesCache };
