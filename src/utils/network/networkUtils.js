// src/utils/network/networkUtils.js
// ✅ COMPLETE NETWORK UTILITIES for slow connection handling

import NetInfo from '@react-native-community/netinfo';

/**
 * Check if device is connected to the internet
 * @returns {Promise<boolean>} - True if online, false if offline
 */
export const isOnline = async () => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected && state.isInternetReachable !== false;
  } catch (error) {
    console.error('Error checking network status:', error);
    // Default to online if check fails (fail-safe)
    return true;
  }
};

/**
 * Get current network state with detailed information
 * @returns {Promise<Object>} - Network state object
 */
export const getNetworkState = async () => {
  try {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type, // wifi, cellular, ethernet, etc.
      details: state.details,
      effectiveType: state.details?.cellularGeneration || state.type, // 2g, 3g, 4g, 5g
    };
  } catch (error) {
    console.error('Error getting network state:', error);
    return {
      isConnected: true,
      isInternetReachable: true,
      type: 'unknown',
      details: null,
      effectiveType: 'unknown',
    };
  }
};

/**
 * Estimate connection speed based on network type
 * @param {Object} networkState - Network state from getNetworkState()
 * @returns {string} - 'slow', 'moderate', 'fast', or 'unknown'
 */
export const estimateConnectionSpeed = (networkState) => {
  if (!networkState || !networkState.isConnected) {
    return 'offline';
  }

  const { type, effectiveType } = networkState;

  // WiFi is generally fast
  if (type === 'wifi') {
    return 'fast';
  }

  // Ethernet is very fast
  if (type === 'ethernet') {
    return 'fast';
  }

  // Cellular - depends on generation
  if (type === 'cellular') {
    if (effectiveType === '5g') return 'fast';
    if (effectiveType === '4g') return 'moderate';
    if (effectiveType === '3g') return 'slow';
    if (effectiveType === '2g') return 'slow';
    return 'moderate'; // Unknown cellular, assume moderate
  }

  return 'unknown';
};

/**
 * Subscribe to network state changes
 * @param {Function} callback - Function to call when network state changes
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToNetworkChanges = (callback) => {
  const unsubscribe = NetInfo.addEventListener(state => {
    callback({
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      effectiveType: state.details?.cellularGeneration || state.type,
    });
  });
  return unsubscribe;
};

/**
 * Wait for internet connection with timeout
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 10000)
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<boolean>} - True if connected within timeout, false otherwise
 */
export const waitForConnection = (timeout = 10000, onProgress = null) => {
  return new Promise((resolve) => {
    let elapsed = 0;
    const interval = 500;

    const checkConnection = async () => {
      if (onProgress) {
        onProgress(Math.min((elapsed / timeout) * 100, 100));
      }

      const online = await isOnline();
      if (online) {
        resolve(true);
        return true;
      }
      return false;
    };

    checkConnection();

    const intervalId = setInterval(async () => {
      elapsed += interval;
      
      if (await checkConnection()) {
        clearInterval(intervalId);
      }
    }, interval);
    
    setTimeout(() => {
      clearInterval(intervalId);
      resolve(false);
    }, timeout);
  });
};

/**
 * Measure actual connection speed with a ping test
 * @param {string} url - URL to ping (default: Google's generate_204)
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} - { speed: 'slow'|'moderate'|'fast', latency: number }
 */
export const measureConnectionSpeed = async (
  url = 'https://www.google.com/generate_204',
  timeout = 5000
) => {
  try {
    const startTime = Date.now();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache',
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    let speed;
    if (latency < 500) {
      speed = 'fast';
    } else if (latency < 2000) {
      speed = 'moderate';
    } else {
      speed = 'slow';
    }

    console.log(`🌐 Connection speed: ${speed} (${latency}ms)`);

    return { speed, latency };
  } catch (error) {
    console.error('Error measuring connection speed:', error);
    return { speed: 'unknown', latency: -1 };
  }
};

/**
 * Get optimal timeout based on connection quality
 * @param {string} connectionSpeed - 'slow', 'moderate', 'fast'
 * @returns {number} - Timeout in milliseconds
 */
export const getOptimalTimeout = (connectionSpeed) => {
  const timeouts = {
    slow: 45000, // 45 seconds for slow connections
    moderate: 25000, // 25 seconds for moderate
    fast: 15000, // 15 seconds for fast
    unknown: 30000, // 30 seconds default
    offline: 5000, // 5 seconds for offline (quick fail)
  };

  return timeouts[connectionSpeed] || timeouts.unknown;
};

/**
 * Check if connection is metered (cellular data)
 * @returns {Promise<boolean>} - True if metered, false otherwise
 */
export const isMeteredConnection = async () => {
  try {
    const state = await NetInfo.fetch();
    return state.type === 'cellular';
  } catch (error) {
    console.error('Error checking metered connection:', error);
    return false;
  }
};

/**
 * Get network diagnostics for debugging
 * @returns {Promise<Object>} - Detailed network diagnostics
 */
export const getNetworkDiagnostics = async () => {
  try {
    const state = await getNetworkState();
    const speed = await measureConnectionSpeed();
    const isMetered = await isMeteredConnection();

    const diagnostics = {
      ...state,
      measuredSpeed: speed.speed,
      latency: speed.latency,
      estimatedSpeed: estimateConnectionSpeed(state),
      isMetered,
      recommendedTimeout: getOptimalTimeout(speed.speed),
      timestamp: new Date().toISOString(),
    };

    console.log('🔍 Network Diagnostics:', diagnostics);
    return diagnostics;
  } catch (error) {
    console.error('Error getting network diagnostics:', error);
    return null;
  }
};

/**
 * Retry function with exponential backoff for network requests
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>} - Result of the function
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry = null,
  } = options;

  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries - 1) {
        throw error;
      }

      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      
      if (onRetry) {
        onRetry(attempt + 1, delay, error);
      }

      console.log(`⚠️ Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

/**
 * Check if connection quality is suitable for large uploads
 * @returns {Promise<boolean>} - True if suitable, false otherwise
 */
export const isSuitableForUpload = async () => {
  try {
    const { speed } = await measureConnectionSpeed();
    return speed !== 'slow' && speed !== 'offline';
  } catch (error) {
    console.error('Error checking upload suitability:', error);
    return true; // Assume it's fine if we can't check
  }
};

/**
 * Wait for suitable connection for uploads
 * @param {number} timeout - Maximum wait time in ms
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<boolean>} - True if suitable connection found
 */
export const waitForSuitableConnection = async (timeout = 15000, onProgress = null) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const suitable = await isSuitableForUpload();
    
    if (suitable) {
      return true;
    }

    if (onProgress) {
      const elapsed = Date.now() - startTime;
      onProgress((elapsed / timeout) * 100);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return false;
};

export default {
  isOnline,
  getNetworkState,
  estimateConnectionSpeed,
  subscribeToNetworkChanges,
  waitForConnection,
  measureConnectionSpeed,
  getOptimalTimeout,
  isMeteredConnection,
  getNetworkDiagnostics,
  retryWithBackoff,
  isSuitableForUpload,
  waitForSuitableConnection,
};