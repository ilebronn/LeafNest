import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { auth } from '@config/firebase';
import { recordScan } from '@services/scanning/scanStatsService';
import { isGuestUser } from '@utils/guest';
import { isOnline } from '@utils/network/networkUtils';
import { addToHistory, incrementGlobalObservation } from '@services/firebase';

// API Services
import {
  analyzeWithVisionAPI,
  extractCandidatesWithScores,
  isPlantOrAnimal,
  detectCategoryFromLabels,
  identifyWithPlantNet,
  identifyWithINaturalistCV, // 🆕 NEW: Animal identification API
  searchINaturalistByNames,
  fetchTaxonDetails,
  fetchObservationCount,
  fetchGBIF,
  extractBestCommonName,
  validateAndEnrichResult
} from '@services/api/speciesIdentification';

// iNaturalist Helper Functions
import {
  calculateEnhancedConfidence,
  calculateAdaptiveConfidence,
  identifyWithMultiSource as identifyWithFallbackMethod,
  detectHuman
} from '@services/api/inaturalistHelpers';

// Utils
import cacheManager from '@screens/Main/ScanScreen/utils/cacheManager';
import { processCameraImage, processGalleryImage, performPreScanQualityCheck } from '@screens/Main/ScanScreen/utils/imageOptimizer';
import {
  ERROR_MESSAGES,
  PROCESSING_STAGES,
  FEEDBACK_STORAGE_PREFIX,
  CONFIDENCE_THRESHOLD
} from '@screens/Main/ScanScreen/utils/constants';

/**
 * ✅ UPDATED: Assess match quality based on how well sources agree
 */
const assessMatchQuality = (visionName, plantNetName, iNatName, iNatCVName, candidateScores) => {
  const normalize = (str) => str?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
  
  const visionNorm = normalize(visionName);
  const plantNetNorm = normalize(plantNetName);
  const iNatNorm = normalize(iNatName);
  const iNatCVNorm = normalize(iNatCVName);
  
  let matchCount = 0;
  let sources = [visionNorm, plantNetNorm, iNatNorm, iNatCVNorm].filter(Boolean);
  
  // Count how many sources agree
  sources.forEach(source => {
    const matches = sources.filter(s => s === source).length;
    matchCount = Math.max(matchCount, matches);
  });
  
  // Check if top candidate has high score
  const topScore = candidateScores?.[0]?.score || 0;
  
  // If iNat CV provided a result, give it higher weight
  if (iNatCVNorm && matchCount >= 2) {
    return 'high';
  }
  
  // NOTE: candidate scores are on a 0-100 scale in this app.
  if (matchCount >= 3 || topScore >= 90) {
    return 'high';
  } else if (matchCount >= 2 || topScore >= 75) {
    return 'medium';
  }
  
  return 'low';
};

const useImageProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState('');
  const isProcessingRef = useRef(false);
  const decrementScanCountRef = useRef(null);

  const setDecrementScanCount = useCallback((fn) => {
    decrementScanCountRef.current = fn;
  }, []);

  const initializeCache = useCallback(async () => {
    await cacheManager.initialize();
  }, []);

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
   * 🌍 Get user's location for better species identification
   */
  const getUserLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('⚠️ Location permission not granted');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
        distanceInterval: 0,
      });

      console.log(`📍 Location obtained: ${location.coords.latitude}, ${location.coords.longitude}`);
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (error) {
      console.warn('⚠️ Could not get location:', error.message);
      return null;
    }
  }, []);

  /**
   * 🎯 SMART CONFIDENCE: Process successful match with intelligent confidence
   */
  const processSuccessfulMatch = useCallback(async (matchResult, photoUri, navigation, onGuestPostScan) => {
    try {
      setProcessingStage(PROCESSING_STAGES.LOADING_DETAILS);

      console.log('🔧 Processing match result:', {
        name: matchResult.name,
        commonName: matchResult.commonName,
        taxonId: matchResult.taxonId,
        rank: matchResult.rank,
        confidence: matchResult.confidence
      });

      // Fetch additional data in parallel
      const [taxonDetails, gbifData, obsCount] = await Promise.allSettled([
        matchResult.taxonId ? fetchTaxonDetails(matchResult.taxonId) : Promise.resolve(null),
        fetchGBIF(matchResult.name),
        matchResult.taxonId ? fetchObservationCount(matchResult.taxonId) : Promise.resolve(0),
      ]);

      const taxonData = taxonDetails.status === 'fulfilled' ? taxonDetails.value : null;
      const gbif = gbifData.status === 'fulfilled' ? gbifData.value : null;
      const obs = obsCount.status === 'fulfilled' ? obsCount.value : 0;

      // ✅ Ensure rank is never undefined
      const finalRank = matchResult.rank || taxonData?.rank || gbif?.rank || 'species';
      
      console.log('📊 Additional data fetched:', {
        hasTaxonData: !!taxonData,
        hasGBIF: !!gbif,
        obsCount: obs,
        finalRank: finalRank
      });

      // 🎯 SMART CONFIDENCE CALCULATION
      console.log('🎯 Applying smart confidence rules...');
      let finalConfidence = matchResult.confidence || 50;
      
      // RULE 1: Family level = 60%
      if (finalRank === 'family') {
        finalConfidence = 60;
        console.log('   📏 Family level → 60%');
      }
      // RULE 2: Genus level = 70-90%
      else if (finalRank === 'genus') {
        finalConfidence = 70; // Base
        
        // Add quality bonuses
        if (matchResult.commonName && matchResult.commonName !== matchResult.name) {
          finalConfidence += 5;
          console.log('   ✅ Has common name → +5%');
        }
        if (obs > 1000) {
          finalConfidence += 5;
          console.log('   ✅ Well documented (>1000 obs) → +5%');
        }
        if (['plantnet', 'inaturalist_cv'].includes(matchResult.source)) {
          finalConfidence += 10;
          console.log('   ✅ From specialized API → +10%');
        }
        
        finalConfidence = Math.min(finalConfidence, 90); // Cap at 90%
        console.log(`   📏 Genus level → ${finalConfidence}%`);
      }
      // RULE 3: Species level - Check completeness
      else if (finalRank === 'species' || !finalRank) {
        const hasCommonName = matchResult.commonName && matchResult.commonName !== matchResult.name;
        const hasScientificName = matchResult.name && matchResult.name.includes(' ');
        const hasVerifiedSource = ['plantnet', 'inaturalist_cv', 'inaturalist_search'].includes(matchResult.source);
        const isWellDocumented = obs > 100;
        
        // Count quality indicators
        let qualityScore = 0;
        
        if (hasCommonName) {
          qualityScore++;
          console.log('   ✅ Has common name');
        }
        if (hasScientificName) {
          qualityScore++;
          console.log('   ✅ Has scientific name');
        }
        if (hasVerifiedSource) {
          qualityScore++;
          console.log('   ✅ From verified source');
        }
        if (isWellDocumented) {
          qualityScore++;
          console.log('   ✅ Well documented');
        }
        
        // Apply confidence based on quality
        if (qualityScore === 4) {
          // COMPLETE INFO: 95-98%
          finalConfidence = Math.max(finalConfidence, 95);
          finalConfidence = Math.min(finalConfidence, 98);
          console.log(`   🌟 Complete info (4/4) → ${finalConfidence}%`);
        } else if (qualityScore === 3) {
          // GOOD INFO: 85-95%
          finalConfidence = Math.max(finalConfidence, 85);
          finalConfidence = Math.min(finalConfidence, 95);
          console.log(`   ✨ Good info (3/4) → ${finalConfidence}%`);
        } else if (qualityScore === 2) {
          // MODERATE INFO: 75-85%
          finalConfidence = Math.max(finalConfidence, 75);
          finalConfidence = Math.min(finalConfidence, 85);
          console.log(`   ⭐ Moderate info (2/4) → ${finalConfidence}%`);
        } else if (qualityScore === 1) {
          // LIMITED INFO: 65-75%
          finalConfidence = Math.max(finalConfidence, 65);
          finalConfidence = Math.min(finalConfidence, 75);
          console.log(`   💫 Limited info (1/4) → ${finalConfidence}%`);
        } else {
          // MINIMAL INFO: 50-65%
          finalConfidence = Math.min(finalConfidence, 65);
          console.log(`   ⚠️ Minimal info (0/4) → ${finalConfidence}%`);
        }
      }
      
      finalConfidence = Math.round(finalConfidence);
      console.log(`🎯 FINAL CONFIDENCE: ${matchResult.confidence}% → ${finalConfidence}%`);

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
          // Decrement scan count
          if (decrementScanCountRef.current) {
            await decrementScanCountRef.current();
            console.log('✅ Scan count decremented');
          }

          await recordFeedback([], 'unknown', true);

          // Record scan with final confidence
          await recordScan(user.uid, {
            speciesName: matchResult.name,
            plantName: matchResult.commonName || matchResult.name,
            confidence: finalConfidence,
            taxonId: matchResult.taxonId,
            scanType: 'camera',
          });

          // Increment global observation
          const globalObsResult = await incrementGlobalObservation({
            taxonId: matchResult.taxonId,
            name: matchResult.name,
            scientificName: matchResult.name,
            commonName: matchResult.commonName || matchResult.name,
          });

          console.log(`✅ Global observation count: ${globalObsResult.success ? globalObsResult.count : 'failed'}`);

          // Prepare history data
          const historyData = {
            name: matchResult.name,
            scientificName: matchResult.name,
            commonName: matchResult.commonName || matchResult.name,
            taxonId: matchResult.taxonId || null,
            rank: finalRank,
            iconicTaxon: taxonData?.iconic_taxon_name || null,
            imageUri: photoUri,
            imageUrl: taxonData?.default_photo?.medium_url || null,
            conservation: gbif?.threatStatus || null,
            about: taxonData?.wikipedia_summary || null,
            iNatObsCount: obs || 0,
            globalObsCount: globalObsResult.success ? globalObsResult.count : 0,
            confidence: finalConfidence,
            type: 'history',
          };

          await addToHistory(user.uid, historyData);
          console.log('✅ Scan recorded to user history');
        } catch (error) {
          console.warn('⚠️ Failed to record scan:', error);
        }
      }

      // Navigation params with final confidence
      const navigationParams = {
        photoUri: photoUri,
        speciesData: gbif || {
          scientificName: matchResult.name,
          commonName: matchResult.commonName || matchResult.name,
          rank: finalRank
        },
        iNaturalistData: taxonData || null,
        iNatObsCount: obs || 0,
        confidence: finalConfidence, // 🎯 Use smart confidence
        alternativeSuggestions: matchResult.alternativeSuggestions || [],
        imageQuality: matchResult.imageQuality || null
      };

      console.log('🧭 Navigating with confidence:', finalConfidence);

      // Navigate
      setIsProcessing(false);
      setProcessingStage('');

      if (navigation && navigation.navigate) {
        navigation.navigate('SpeciesLandingPage', {
          ...navigationParams,
          // History already saved in this flow; avoid duplicate entries.
          skipHistorySave: true,
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
   * 🆕 UPDATED: Main image analysis with animal API support
   */
  const analyzeImage = useCallback(async (base64Image, photoUri, navigation, onGuestPostScan) => {
    if (isProcessingRef.current) {
      console.warn('⚠️ Image processing already in progress');
      return;
    }

    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      console.log('🔍 Starting enhanced species identification...');
      setProcessingStage('Analyzing image...');

      // Check network connection
      const online = await isOnline();
      if (!online) {
        Alert.alert(ERROR_MESSAGES.NO_INTERNET, ERROR_MESSAGES.CHECK_CONNECTION);
        setIsProcessing(false);
        setProcessingStage('');
        isProcessingRef.current = false;
        return;
      }

      // STEP 0: Pre-scan quality check
      console.log('🔍 Step 0/8: Quality check...');
      const qualityCheck = await performPreScanQualityCheck(photoUri);

      // Show warning if quality is questionable - FIXED: Only show "Retake Photo" button
      if (!qualityCheck.shouldProceed) {
        const issuesList = qualityCheck.issues.join('\n• ');
        Alert.alert(
          "Image Quality Issues Detected",
          `The image quality may affect identification accuracy:\n\n• ${issuesList}\n\nPlease retake the photo for better results.`,
          [
            {
              text: "Retake Photo",
              style: "default",
              onPress: () => {
                setIsProcessing(false);
                setProcessingStage('');
                isProcessingRef.current = false;
              }
            }
          ]
        );
        return;
      } else if (qualityCheck.needsWarning && qualityCheck.warnings.length > 0) {
        console.log(`⚠️ Quality warnings: ${qualityCheck.warnings.join(', ')}`);
      }

      const proceedWithAnalysis = async () => {
        // Get user location (optional, improves accuracy)
        const location = await getUserLocation();
        console.log(`📍 Location: ${location ? 'available' : 'not available'}`);

        // STEP 1: Analyze with Google Vision API
        console.log('📡 Step 1/8: Vision API analysis...');
        setProcessingStage('Analyzing with AI...');
        const visionData = await analyzeWithVisionAPI(base64Image);

        // STEP 2: Extract candidate species names
        console.log('🎯 Step 2/8: Extracting candidates...');
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

        console.log('🎯 Top candidates:', candidates.slice(0, 5).map(c => `${c.name} (${c.score.toFixed(1)}%)`).join(', '));

        // STEP 3: Detect category (plant or animal)
        console.log('📋 Step 3/8: Category detection...');
        const category = detectCategoryFromLabels(visionData);
        console.log(`   Category: ${category}`);

        // STEP 4: Validate it's a plant or animal
        const isValidSubject = isPlantOrAnimal(visionData);
        if (!isValidSubject) {
          Alert.alert("Unidentified Species", ERROR_MESSAGES.NOT_PLANT_OR_ANIMAL);
          setIsProcessing(false);
          setProcessingStage('');
          isProcessingRef.current = false;
          return;
        }

        // STEP 5: Check for human detection (only if it's an animal)
        if (category === 'animal') {
          console.log('👤 Step 5/8: Checking for human detection...');
          const humanResult = detectHuman(candidates);
          
          const hasStrongAnimalIndicator = candidates.some(c => {
            const name = c.name.toLowerCase();
            return (
              name.includes('cat') || name.includes('dog') || name.includes('bird') ||
              name.includes('fur') || name.includes('whiskers') || name.includes('paw') ||
              name.includes('tail') || name.includes('beak') || name.includes('feather')
            ) && c.score > 50;
          });

          if (humanResult && !hasStrongAnimalIndicator) {
            console.log('👤 Human detected! Processing as successful identification');
            setProcessingStage(PROCESSING_STAGES.FOUND_MATCH);
            humanResult.imageQuality = qualityCheck.details;
            await processSuccessfulMatch(humanResult, photoUri, navigation, onGuestPostScan);
            isProcessingRef.current = false;
            return;
          } else if (humanResult && hasStrongAnimalIndicator) {
            console.log('🐾 Human detection overridden - strong animal indicators present');
          }
        }

        // STEP 6: Check cache (skip for plants to ensure fresh API results)
        if (category !== 'plant') {
          const cachedResult = cacheManager.checkCandidates(candidates);
          if (cachedResult) {
            console.log('⚡ Found in cache:', cachedResult.name);
            
            const enrichedCachedResult = validateAndEnrichResult(
              {
                ...cachedResult,
                name: cachedResult.name || candidates[0]?.name || 'Unknown',
                commonName: cachedResult.commonName || 'Unknown',
                confidence: cachedResult.confidence || 85,
                rank: cachedResult.rank || 'species',
                imageQuality: qualityCheck.details
              },
              candidates,
              category
            ) || cachedResult;
            
            console.log('✅ Validated cached result:', enrichedCachedResult);
            
            setProcessingStage(PROCESSING_STAGES.FOUND_MATCH);
            await processSuccessfulMatch(enrichedCachedResult, photoUri, navigation, onGuestPostScan);
            isProcessingRef.current = false;
            return;
          }
        } else {
          console.log('🌿 Skipping cache for plants - using fresh API results');
        }

        // 🆕 STEP 7: Use appropriate API based on category
      console.log('🔎 Step 7/8: Identifying species...');
let result = null;

setProcessingStage('Identifying species...');
console.log('🦁 Using iNaturalist CV API for identification...');

// ✅ PASS photoUri instead of base64Image
result = await identifyWithINaturalistCV(photoUri);  // ← CHANGED

// PLANT-SPECIFIC FALLBACK: Try PlantNet if iNat CV fails
if (!result && category === 'plant') {
  console.log('🌿 iNaturalist CV failed, trying PlantNet...');
  setProcessingStage('Identifying plant...');
  result = await identifyWithPlantNet(photoUri);
}

// FINAL FALLBACK: Search by name if both CV and PlantNet fail
if (!result && candidates.length > 0) {
  console.log('🔍 CV and specialized APIs failed, searching iNaturalist by name...');
  setProcessingStage(PROCESSING_STAGES.SEARCHING);
  result = await searchINaturalistByNames(candidates);
}

        // Fallback to Vision API candidate if all else fails
        if (!result) {
          console.log('⚠️ No verified result found, using Vision API candidate as fallback');

          const genericTerms = new Set([
            'plant', 'plants', 'animal', 'animals', 'flower', 'flowers', 'tree', 'trees',
            'grass', 'bird', 'birds', 'insect', 'insects', 'fish', 'fishes',
            'mammal', 'mammals', 'reptile', 'reptiles', 'amphibian', 'amphibians',
            'vegetation', 'flora', 'fauna', 'creature', 'creatures', 'wildlife',
            'nature', 'organism', 'organisms', 'leaf', 'leaves', 'petal', 'petals',
            'stem', 'root', 'branch', 'branches'
          ]);

          const specificCandidate = candidates.find(candidate => 
            !genericTerms.has(candidate.name.toLowerCase())
          );

          const topCandidate = specificCandidate || candidates[0];

          if (topCandidate && !genericTerms.has(topCandidate.name.toLowerCase())) {
            const detectedName = topCandidate.name;
            
            // ✅ FIXED: Realistic fallback confidence
            const fallbackResult = {
              taxonId: null,
              name: detectedName,
              commonName: detectedName,
              confidence: Math.min(Math.round(topCandidate.score * 0.6), 60), // More conservative
              source: 'vision_fallback',
              rank: 'species',
              visionScore: topCandidate.score,
              plantNetScore: null,
              iNatScore: null,
              inatCVScore: null,
              matchQuality: 'low',
              imageQuality: qualityCheck.details
            };

            result = validateAndEnrichResult(fallbackResult, candidates, category) || fallbackResult;
            
            console.log(`✅ Validated fallback result: ${result.name} (${result.confidence}% confidence)`);
          } else {
            Alert.alert(
              "Unable to Identify",
              "Could not identify the specific species.\n\nTips for better results:\n• Get closer to the subject\n• Capture distinctive features\n• Ensure good lighting\n• Try a different angle",
              [{ text: "Try Again", style: "default" }]
            );
            setIsProcessing(false);
            setProcessingStage('');
            isProcessingRef.current = false;
            return;
          }
        }

        // STEP 8: Validate and enrich result
        result = validateAndEnrichResult(
          {
            taxonId: result.taxonId || null,
            name: result.name || candidates[0]?.name || 'Unknown Species',
            commonName: result.commonName || 'Unknown Species',
            confidence: result.confidence || 50,
            source: result.source || 'unknown',
            rank: result.rank || 'species',
            visionScore: result.visionScore || null,
            plantNetScore: result.plantNetScore || null,
            iNatScore: result.iNatScore || null,
            inatCVScore: result.inatCVScore || null,
            matchQuality: result.matchQuality || 'low',
            alternativeSuggestions: result.alternativeSuggestions || [],
            imageQuality: qualityCheck.details
          },
          candidates,
          category
        ) || result;

        console.log('✅ Validated and enriched result:', result);

        // Cache successful result (only if verified)
        if (result.source !== 'vision_fallback') {
          console.log('💾 Caching result...');
          cacheManager.set(result.name, result, {
            alternateKeys: result.commonName ? [result.commonName] : [],
            persist: false
          });
        }

        // Process successful match
        setProcessingStage(PROCESSING_STAGES.LOADING_DETAILS);
        await processSuccessfulMatch(result, photoUri, navigation, onGuestPostScan);
      };

      await proceedWithAnalysis();

    } catch (error) {
      console.error('❌ Error analyzing image:', error);
      Alert.alert("Error", ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
      isProcessingRef.current = false;
    }
  }, [processSuccessfulMatch, recordFeedback, getUserLocation]);

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

  const cancelProcessing = useCallback(() => {
    setIsProcessing(false);
    setProcessingStage('');
    isProcessingRef.current = false;
    console.log('🛑 Processing cancelled');
  }, []);

  const getCacheStats = useCallback(() => {
    return cacheManager.getStats();
  }, []);

  const clearCache = useCallback(async () => {
    await cacheManager.clear();
    console.log('🧹 Cache cleared');
  }, []);

  return {
    isProcessing,
    processingStage,
    initializeCache,
    analyzeImage,
    handleCameraCapture,
    handleGalleryImage,
    cancelProcessing,
    recordFeedback,
    setDecrementScanCount,
    getCacheStats,
    clearCache,
  };
};

export default useImageProcessing;