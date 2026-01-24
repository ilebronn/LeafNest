// ===========================
// INATURALIST HELPER FUNCTIONS
// ===========================
// Note: iNaturalist CV API removed - requires authentication
// Your existing flow using Vision + PlantNet + iNat Search is better!

import { getWithRetry, inaturalistRateLimiter } from './apiHelpers';
import { searchINaturalistByNames } from './speciesIdentification';
import {
  CONFIDENCE_THRESHOLD,
  MIN_OBSERVATIONS_FOR_BOOST,
  MAX_CONFIDENCE_DISPLAY
} from '@screens/Main/ScanScreen/utils/constants';

/**
 * 📊 Get species suggestions based on location and date
 * Useful for showing "commonly seen in your area" suggestions
 * NO AUTHENTICATION REQUIRED
 * 
 * @param {Object} params - Location and date parameters
 * @param {number} params.latitude - User's latitude
 * @param {number} params.longitude - User's longitude
 * @param {number} params.radius - Search radius in km (default: 50)
 * @param {string} params.observedOn - ISO date string
 * @returns {Promise<Array>} - Array of common species in the area
 */
export const getNearbySpecies = async (params) => {
  const { latitude, longitude, radius = 50, observedOn } = params;
  
  if (!latitude || !longitude) {
    throw new Error('Location coordinates required');
  }

  try {
    await inaturalistRateLimiter.acquire();

    const queryParams = new URLSearchParams({
      lat: latitude,
      lng: longitude,
      radius: radius,
      per_page: 20,
      order_by: 'observations_count',
      quality_grade: 'research'
    });

    if (observedOn) {
      queryParams.append('observed_on', observedOn);
    }

    const response = await getWithRetry(
      `https://api.inaturalist.org/v1/observations/species_counts?${queryParams}`,
      { timeout: 5000 }
    );

    const results = response?.data?.results || [];
    
    return results.map(item => ({
      taxonId: item.taxon.id,
      name: item.taxon.name,
      commonName: item.taxon.preferred_common_name,
      count: item.count,
      rank: item.taxon.rank,
      photo: item.taxon.default_photo?.square_url
    }));

  } catch (error) {
    console.error('❌ Error fetching nearby species:', error);
    return [];
  }
};

/**
 * 🔄 FALLBACK METHOD: Use the existing multi-source approach
 * This combines Vision API + PlantNet + iNaturalist search
 * This is your MAIN method - it works great!
 * 
 * @param {string} base64Image - Base64 encoded image
 * @param {string} photoUri - Original photo URI
 * @param {string} category - 'plant' or 'animal'
 * @param {Array} visionCandidates - Candidates from Vision API
 * @returns {Promise<Object|null>} - Species identification result
 */
export const identifyWithMultiSource = async (
  base64Image, 
  photoUri, 
  category, 
  visionCandidates
) => {
  console.log('🔄 Using multi-source identification (Vision + PlantNet + iNat)...');
  
  try {
    let result = null;
    let plantNetScore = null;
    let iNatScore = null;

    if (category === 'plant') {
      console.log('🌿 Running parallel plant identification...');
      
      // Try both PlantNet and iNaturalist in parallel
      const { identifyWithPlantNet } = require('./speciesIdentification');
      
      const [plantNetResult, iNatResult] = await Promise.allSettled([
        identifyWithPlantNet(photoUri),
        searchINaturalistByNames(visionCandidates.slice(0, 5))
      ]);

      if (plantNetResult.status === 'fulfilled' && plantNetResult.value) {
        result = plantNetResult.value;
        plantNetScore = result.score || result.plantNetScore;
      }
      
      if (iNatResult.status === 'fulfilled' && iNatResult.value) {
        if (!result) {
          result = iNatResult.value;
        }
        iNatScore = iNatResult.value.score || iNatResult.value.iNatScore;
      }
    } else {
      console.log('🦎 Searching iNaturalist for animal...');
      result = await searchINaturalistByNames(visionCandidates);
      if (result) {
        iNatScore = result.score || result.iNatScore;
      }
    }

    if (!result) {
      return null;
    }

    // Store scores for confidence calculation
    result.visionScore = visionCandidates[0]?.score;
    result.plantNetScore = plantNetScore;
    result.iNatScore = iNatScore;
    result.source = 'multi_source';

    return result;
    
  } catch (error) {
    console.error('❌ Multi-source identification error:', error);
    return null;
  }
};

/**
 * 🎯 ENHANCED: Calculate confidence from multiple sources
 * 
 * @param {Object} sources - Confidence scores from various sources
 * @returns {number} - Final confidence score (0-100)
 */
export const calculateEnhancedConfidence = (sources) => {
  const {
    visionScore = null,        // 0-1 scale from Vision API
    plantNetScore = null,      // 0-1 scale from PlantNet
    iNatScore = null,          // Quality score from iNaturalist search
    matchQuality = 'low',      // 'high', 'medium', 'low'
    hasObservations = false,
    taxonRank = null,
  } = sources;

  // Weights for each source (Vision + PlantNet + iNat Search)
  const weights = {
    vision: 0.20,      // Google Vision - general recognition
    plantnet: 0.35,    // PlantNet - specialized for plants
    inat: 0.30,        // iNaturalist search - community verified
    quality: 0.10,     // Match quality bonus
    verification: 0.05 // Observation verification bonus
  };

  let totalScore = 0;
  let totalWeight = 0;
  let sourceCount = 0;

  // 1. Vision API Score
  if (visionScore !== null && visionScore !== undefined) {
    const normalizedScore = visionScore * 100;
    totalScore += normalizedScore * weights.vision;
    totalWeight += weights.vision;
    sourceCount++;
    console.log(`  Vision: ${normalizedScore.toFixed(1)}% (weight: ${weights.vision})`);
  }

  // 2. PlantNet Score
  if (plantNetScore !== null && plantNetScore !== undefined) {
    const normalizedScore = plantNetScore * 100;
    totalScore += normalizedScore * weights.plantnet;
    totalWeight += weights.plantnet;
    sourceCount++;
    console.log(`  PlantNet: ${normalizedScore.toFixed(1)}% (weight: ${weights.plantnet})`);
  }

  // 3. iNaturalist Search Score
  if (iNatScore !== null && iNatScore !== undefined) {
    const normalizedScore = iNatScore > 1 ? iNatScore : iNatScore * 100;
    totalScore += normalizedScore * weights.inat;
    totalWeight += weights.inat;
    sourceCount++;
    console.log(`  iNaturalist: ${normalizedScore.toFixed(1)}% (weight: ${weights.inat})`);
  }

  // 4. Match Quality Bonus
  const qualityBonus = {
    'high': 100,
    'medium': 80,
    'low': 60
  };
  
  const qualityScore = qualityBonus[matchQuality] || 60;
  totalScore += qualityScore * weights.quality;
  totalWeight += weights.quality;

  // 5. Verification Bonus
  if (hasObservations) {
    totalScore += 95 * weights.verification;
    totalWeight += weights.verification;
  }

  // Calculate weighted confidence
  let confidence = totalWeight > 0 ? (totalScore / totalWeight) : 0;

  // Apply rank adjustment
  const rankMultiplier = {
    'species': 1.0,
    'subspecies': 0.98,
    'genus': 0.90,
    'family': 0.80,
    'order': 0.70
  };
  
  const rankAdjustment = rankMultiplier[taxonRank?.toLowerCase()] || 0.85;
  confidence *= rankAdjustment;

  // Multi-source bonus
  if (sourceCount >= 3) {
    confidence = Math.min(confidence * 1.05, 100);
  } else if (sourceCount >= 2) {
    confidence = Math.min(confidence * 1.02, 100);
  }

  const finalConfidence = Math.round(Math.min(Math.max(confidence, 0), 100));
  console.log(`✅ Final Confidence: ${finalConfidence}% (from ${sourceCount} sources)`);
  
  return finalConfidence;
};

export default {
  identifyWithMultiSource,
  getNearbySpecies,
  calculateEnhancedConfidence
};