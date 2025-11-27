// utils/networkUtils.js
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
 * Get current network state
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
    };
  } catch (error) {
    console.error('Error getting network state:', error);
    return {
      isConnected: true,
      isInternetReachable: true,
      type: 'unknown',
      details: null,
    };
  }
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
    });
  });

  return unsubscribe;
};

/**
 * Wait for internet connection
 * @param {number} timeout - Maximum time to wait in milliseconds (default: 5000)
 * @returns {Promise<boolean>} - True if connected within timeout, false otherwise
 */
export const waitForConnection = (timeout = 5000) => {
  return new Promise((resolve) => {
    const checkConnection = async () => {
      const online = await isOnline();
      if (online) {
        resolve(true);
        return;
      }
    };

    checkConnection();

    const interval = setInterval(checkConnection, 500);
    
    setTimeout(() => {
      clearInterval(interval);
      resolve(false);
    }, timeout);
  });
};

export default {
  isOnline,
  getNetworkState,
  subscribeToNetworkChanges,
  waitForConnection,
};