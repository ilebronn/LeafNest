import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '@config/firebase';
import { recordScan } from '@services/scanning/scanStatsService';
import { isGuestUser } from '@utils/guest';
import { isOnline } from '@utils/network/networkUtils';

// API Services
import {
  analyzeWithVisionAPI,
  extractCandidatesWithScores,
  isPlantOrAnimal,
  detectCategoryFromLabels,
  identifyWithPlantNet,
  searchINaturalistByNames,
  fetchTaxonDetails,
  fetchObservationCount,
  fetchGBIF
} from '@services/api/speciesIdentification';

// Utils
import cacheManager from '@screens/Main/ScanScreen/utils/cacheManager';
import { processCameraImage, processGalleryImage } from '@screens/Main/ScanScreen/utils/imageOptimizer';
import {
  ERROR_MESSAGES,
  PROCESSING_STAGES,
  FEEDBACK_STORAGE_PREFIX
} from '@screens/Main/ScanScreen/utils/constants';

/**
 * Custom hook for image processing and species identification
 * Handles the entire flow from image capture to species identification
 * 
 * @returns {Object} - Processing state and functions
 */
const useImageProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const isProcessingRef = useRef(false); // Prevent race conditions

  /**
   * Initialize cache on mount
   */
  const initializeCache = useCallback(async () => {
    await cacheManager.initialize();
  }, []);

  /**
   * Record user feedback for improvement
   * @param {Array} candidates - Candidate species names
   * @param {string} actualCategory - 'plant' or 'animal'
   * @param {boolean} success - Whether identification was successful
   */
  const recordFeedback = useCallback(async (candidates, actualCategory, success) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const feedbackKey = `${FEEDBACK_STORAGE_PREFIX}${Date.now()}`;
      const feedbackData = {
        candidates: candidates.slice(0, 5),
        actualCategory,
        success,
        timestamp: Date.now(),
        userId: user.uid
      };

      await AsyncStorage.setItem(feedbackKey, JSON.stringify(feedbackData));
      console.log('📝 Feedback recorded for improvement');
    } catch (error) {
      console.error('❌ Error recording feedback:', error);
    }
  }, []);

  /**
   * Process successful species match
   * Fetches additional data and navigates to result screen
   * 
   * @param {Object} matchResult - Matched species data
   * @param {string} photoUri - Photo URI
   * @param {Function} navigation - Navigation object
   * @param {Function} onGuestPostScan - Callback for guest users
   */
  const processSuccessfulMatch = useCallback(async (matchResult, photoUri, navigation, onGuestPostScan) => {
    try {
      setProcessingStage(PROCESSING_STAGES.LOADING_DETAILS);

      // Fetch additional data in parallel
      const [taxonDetails, gbifData, obsCount] = await Promise.allSettled([
        matchResult.taxonId ? fetchTaxonDetails(matchResult.taxonId) : Promise.resolve(null),
        fetchGBIF(matchResult.name),
        matchResult.taxonId ? fetchObservationCount(matchResult.taxonId) : Promise.resolve(0),
      ]);

      const taxonData = taxonDetails.status === 'fulfilled' ? taxonDetails.value : null;
      const gbif = gbifData.status === 'fulfilled' ? gbifData.value : null;
      const obs = obsCount.status === 'fulfilled' ? obsCount.value : 0;

      const user = auth.currentUser;

      // Handle guest users
      if (isGuestUser(user)) {
        if (onGuestPostScan) {
          await onGuestPostScan(navigation);
        }
      } 
      // Handle authenticated users
      else if (user) {
        try {
          // Record successful feedback
          await recordFeedback([], 'unknown', true);

          // Record scan statistics
          await recordScan(user.uid, {
            speciesName: matchResult.name,
            plantName: matchResult.commonName || matchResult.name,
            confidence: matchResult.confidence,
            taxonId: matchResult.taxonId,
            scanType: 'camera',
          });

          // Update global observation count and history
          const { addToHistory, incrementGlobalObservation } = require('@firestoreService');
          
          const globalObsResult = await incrementGlobalObservation({
            taxonId: matchResult.taxonId,
            name: matchResult.name,
            scientificName: matchResult.name,
            commonName: matchResult.commonName,
          });

          await addToHistory(user.uid, {
            plantName: matchResult.commonName || matchResult.name,
            name: matchResult.name,
            scientificName: matchResult.name,
            commonName: matchResult.commonName,
            taxonId: matchResult.taxonId,
            rank: taxonData?.rank,
            iconicTaxon: taxonData?.iconic_taxon_name,
            imageUri: photoUri,
            imageUrl: taxonData?.default_photo?.medium_url,
            conservation: gbif?.threatStatus,
            about: taxonData?.wikipedia_summary,
            iNatObsCount: obs,
            globalObsCount: globalObsResult.success ? globalObsResult.count : 0,
            type: 'history',
          });

          console.log('✅ Scan recorded to user history');
        } catch (error) {
          console.warn('⚠️ Failed to record scan:', error);
          // Continue even if recording fails
        }
      }

      // Navigate to result screen
      setIsProcessing(false);
      setProcessingStage('');

      if (navigation && navigation.navigate) {
        navigation.navigate('SpeciesLandingPage', {
          photoUri: photoUri,
          speciesData: gbif,
          iNaturalistData: taxonData,
          iNatObsCount: obs,
          confidence: matchResult.confidence,
        });
      }
    } catch (error) {
      console.error('❌ Error processing successful match:', error);
      setIsProcessing(false);
      setProcessingStage('');
      Alert.alert('Error', ERROR_MESSAGES.PROCESSING_ERROR);
    }
  }, [recordFeedback]);

  /**
   * Main image analysis function
   * Analyzes image and identifies species
   * 
   * @param {string} base64Image - Base64 encoded image
   * @param {string} photoUri - Photo URI
   * @param {Function} navigation - Navigation object
   * @param {Function} onGuestPostScan - Callback for guest users
   */
  const analyzeImage = useCallback(async (base64Image, photoUri, navigation, onGuestPostScan) => {
    // Prevent multiple simultaneous processing
    if (isProcessingRef.current) {
      console.warn('⚠️ Image processing already in progress');
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      console.log('🔍 Starting optimized species identification...');
      setProcessingStage(PROCESSING_STAGES.ANALYZING);

      // Check network connection
      const online = await isOnline();
      if (!online) {
        Alert.alert(ERROR_MESSAGES.NO_INTERNET, ERROR_MESSAGES.CHECK_CONNECTION);
        setIsProcessing(false);
        setProcessingStage('');
        isProcessingRef.current = false;
        return;
      }

      // Step 1: Analyze with Google Vision API
      const visionData = await analyzeWithVisionAPI(base64Image);

      // Step 2: Extract candidate species names
      const candidates = extractCandidatesWithScores(visionData);

      if (candidates.length === 0) {
        Alert.alert(
          "Unidentified Species",
          ERROR_MESSAGES.UNIDENTIFIED_SPECIES + "\n\nPlease ensure:\n• Clear view of the subject\n• Good lighting\n• Subject is a plant or animal"
        );
        setIsProcessing(false);
        setProcessingStage('');
        isProcessingRef.current = false;
        return;
      }

      console.log('🎯 Top candidates:', candidates.slice(0, 5).map(c => `${c.name} (${c.score.toFixed(1)})`).join(', '));

      // Step 3: Detect category (plant or animal)
      const category = detectCategoryFromLabels(visionData);
      console.log('📋 Detected category:', category);

      // Step 4: Validate it's a plant or animal
      const isValidSubject = isPlantOrAnimal(visionData);
      if (!isValidSubject) {
        Alert.alert("Unidentified Species", ERROR_MESSAGES.NOT_PLANT_OR_ANIMAL);
        setIsProcessing(false);
        setProcessingStage('');
        isProcessingRef.current = false;
        return;
      }

      // Step 5: Check cache first
      const cachedResult = cacheManager.checkCandidates(candidates);
      if (cachedResult) {
        console.log('⚡ Found in cache:', cachedResult.name);
        setProcessingStage(PROCESSING_STAGES.FOUND_MATCH);
        await processSuccessfulMatch(cachedResult, photoUri, navigation, onGuestPostScan);
        isProcessingRef.current = false;
        return;
      }

      // Step 6: Search in databases
      setProcessingStage(PROCESSING_STAGES.SEARCHING);
      let result = null;

      if (category === 'plant') {
        console.log('🌿 Running parallel plant identification...');
        setProcessingStage(PROCESSING_STAGES.OPTIMIZING);

        // Try both PlantNet and iNaturalist in parallel
        const [plantNetResult, iNatResult] = await Promise.allSettled([
          identifyWithPlantNet(photoUri),
          searchINaturalistByNames(candidates.slice(0, 5))
        ]);

        // Prefer PlantNet result if available, otherwise use iNaturalist
        result = plantNetResult.status === 'fulfilled' && plantNetResult.value
          ? plantNetResult.value
          : (iNatResult.status === 'fulfilled' ? iNatResult.value : null);
      } else {
        console.log('🔍 Searching iNaturalist database...');
        result = await searchINaturalistByNames(candidates);
      }

      // Step 7: Handle no results
      if (!result) {
        Alert.alert(
          "Unidentified Species",
          "Could not identify this species.\n\nTips:\n• Try a different angle\n• Ensure better lighting\n• Get closer to the subject\n\nHelp us improve: Was this a plant or animal?",
          [
            { text: "Plant", onPress: () => recordFeedback(candidates, 'plant', false) },
            { text: "Animal", onPress: () => recordFeedback(candidates, 'animal', false) },
            { text: "Cancel", style: "cancel" }
          ]
        );
        setIsProcessing(false);
        setProcessingStage('');
        isProcessingRef.current = false;
        return;
      }

      // Step 8: Cache the successful result
      cacheManager.set(result.name, result, {
        alternateKeys: result.commonName ? [result.commonName] : [],
        persist: false // Will be debounced
      });

      // Step 9: Process successful match
      setProcessingStage(PROCESSING_STAGES.LOADING_DETAILS);
      await processSuccessfulMatch(result, photoUri, navigation, onGuestPostScan);

    } catch (error) {
      console.error('❌ Error analyzing image:', error);
      Alert.alert("Error", ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
      isProcessingRef.current = false;
    }
  }, [processSuccessfulMatch, recordFeedback]);

  /**
   * Handle camera image capture and processing
   * @param {Object} photo - Photo object from camera
   * @param {Function} navigation - Navigation object
   * @param {Function} onGuestPostScan - Callback for guest users
   */
  const handleCameraCapture = useCallback(async (photo, navigation, onGuestPostScan) => {
    if (!photo || !photo.uri) {
      Alert.alert('Error', 'Invalid photo data');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('📸 Processing camera image...');

      const processed = await processCameraImage(photo);
      await analyzeImage(processed.base64, processed.uri, navigation, onGuestPostScan);
    } catch (error) {
      console.error('❌ Error processing camera image:', error);
      Alert.alert('Error', ERROR_MESSAGES.CAPTURE_FAILED);
      setIsProcessing(false);
      setProcessingStage('');
      isProcessingRef.current = false;
    }
  }, [analyzeImage]);

  /**
   * Handle gallery image selection and processing
   * @param {Object} asset - Image asset from gallery
   * @param {Function} navigation - Navigation object
   * @param {Function} onGuestPostScan - Callback for guest users
   */
  const handleGalleryImage = useCallback(async (asset, navigation, onGuestPostScan) => {
    if (!asset || !asset.uri) {
      Alert.alert('Error', 'Invalid image data');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('🖼️ Processing gallery image...');

      const processed = await processGalleryImage(asset);
      await analyzeImage(processed.base64, processed.uri, navigation, onGuestPostScan);
    } catch (error) {
      console.error('❌ Error processing gallery image:', error);
      Alert.alert('Error', ERROR_MESSAGES.GALLERY_FAILED);
      setIsProcessing(false);
      setProcessingStage('');
      isProcessingRef.current = false;
    }
  }, [analyzeImage]);

  /**
   * Cancel current processing
   */
  const cancelProcessing = useCallback(() => {
    setIsProcessing(false);
    setProcessingStage('');
    isProcessingRef.current = false;
    console.log('🛑 Processing cancelled');
  }, []);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return cacheManager.getStats();
  }, []);

  /**
   * Clear cache
   */
  const clearCache = useCallback(async () => {
    await cacheManager.clear();
    console.log('🧹 Cache cleared');
  }, []);

  return {
    // State
    isProcessing,
    processingStage,

    // Actions
    initializeCache,
    analyzeImage,
    handleCameraCapture,
    handleGalleryImage,
    cancelProcessing,
    recordFeedback,
    
    // Cache utilities
    getCacheStats,
    clearCache,
  };
};

export default useImageProcessing;