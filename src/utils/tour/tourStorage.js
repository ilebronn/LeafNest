import AsyncStorage from '@react-native-async-storage/async-storage';

const TOUR_STORAGE_KEY = '@app_tour_completed';

/**
 * Tour Storage Utility
 * Handles persistence of tour completion state using AsyncStorage
 */
export const tourStorage = {
  /**
   * Check if user has completed the tour
   * @returns {Promise<boolean>} - true if tour was completed
   */
  async hasCompletedTour() {
    try {
      const value = await AsyncStorage.getItem(TOUR_STORAGE_KEY);
      return value === 'true';
    } catch (error) {
      console.error('Error reading tour completion status:', error);
      return false;
    }
  },

  /**
   * Mark tour as completed
   * @returns {Promise<boolean>} - true if save was successful
   */
  async markTourCompleted() {
    try {
      await AsyncStorage.setItem(TOUR_STORAGE_KEY, 'true');
      return true;
    } catch (error) {
      console.error('Error saving tour completion status:', error);
      return false;
    }
  },

  /**
   * Reset tour completion (for testing purposes)
   * @returns {Promise<boolean>} - true if reset was successful
   */
  async resetTour() {
    try {
      await AsyncStorage.removeItem(TOUR_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error resetting tour:', error);
      return false;
    }
  }
};