// ===========================
// INATURALIST HELPER FUNCTIONS
// ===========================
// File: src/services/api/inaturalistHelpers.js

import { getWithRetry, inaturalistRateLimiter } from './apiHelpers';
import { searchINaturalistByNames, identifyWithPlantNet } from './speciesIdentification';

// Scores may come in as 0-1 (unit) or 0-100 (percent). Normalize defensively.
const toUnitScore = (score) => {
  const n = Number(score);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n > 1) return Math.min(n / 100, 1);
  return Math.min(n, 1);
};

const toPercentScore = (score) => Math.round(toUnitScore(score) * 1000) / 10;

/**
 * 🧬 IMPROVED: Detect if image contains a human with stricter criteria
 */
export const detectHuman = (visionCandidates) => {
  if (!Array.isArray(visionCandidates) || visionCandidates.length === 0) {
    return null;
  }

  // Stricter: require strong + supporting human signals
  const strongHumanKeywords = [
    'person', 'people', 'human', 'man', 'woman', 'child', 'boy', 'girl'
  ];

  const supportingHumanKeywords = [
    'selfie', 'portrait', 'face', 'head', 'chin', 'cheek', 'forehead', 'smile',
    'beard', 'mustache', 'eye', 'eyes', 'nose', 'mouth', 'lips', 'ear', 'teeth',
    'hair'
  ];

  // Animal indicators (disqualifiers)
  const animalKeywords = [
    'cat', 'dog', 'bird', 'fish', 'animal', 'pet', 'wildlife',
    'feline', 'canine', 'fur', 'whisker', 'whiskers', 'paw', 'tail', 'beak',
    'feather', 'scale', 'claw', 'snout', 'muzzle', 'wing', 'hoof', 'antler'
  ];

  // Object indicators (avoid false positives on furniture/tools/footwear)
  const objectKeywords = [
    'chair', 'table', 'desk', 'sofa', 'couch', 'furniture',
    'scale', 'tool', 'device', 'machine', 'appliance',
    'instrument', 'equipment', 'gadget', 'clock', 'meter', 'gauge', 'dial',
    'shoe', 'shoes', 'sneaker', 'sneakers', 'footwear', 'boot', 'boots',
    'sock', 'socks', 'lace', 'laces', 'shoelace', 'shoelaces',
    'sole', 'insole', 'insoles', 'tread'
  ];

  const topCandidates = visionCandidates.slice(0, 7);

  let strongScore = 0;
  let supportingScore = 0;
  let strongHits = 0;
  let supportingHits = 0;
  let animalScore = 0;
  let objectScore = 0;

  topCandidates.forEach(candidate => {
    const text = (candidate.name || '').toLowerCase();
    const score = toUnitScore(candidate.score);

    const hasStrongHuman = strongHumanKeywords.some(keyword => text.includes(keyword));
    if (hasStrongHuman && score >= 0.55) {
      strongScore += score;
      strongHits += 1;
    }

    const hasSupportingHuman = supportingHumanKeywords.some(keyword => text.includes(keyword));
    if (hasSupportingHuman && score >= 0.35) {
      supportingScore += score;
      supportingHits += 1;
    }

    if (animalKeywords.some(keyword => text.includes(keyword))) {
      animalScore += score * 2;
    }

    if (objectKeywords.some(keyword => text.includes(keyword))) {
      objectScore += score * 2;
    }
  });

  const hasStrongHumanSignal =
    strongHits >= 1 &&
    supportingHits >= 1 &&
    (strongScore + supportingScore) >= 1.1;

  const isHumanDetected = hasStrongHumanSignal && animalScore < 0.25 && objectScore < 0.3;

  if (isHumanDetected) {
    console.log('Human detected');
    console.log(
      `   strong=${strongScore.toFixed(2)}, supporting=${supportingScore.toFixed(2)}, ` +
      `animal=${animalScore.toFixed(2)}, object=${objectScore.toFixed(2)}`
    );

    return {
      taxonId: 43584, // iNaturalist taxon ID for Homo sapiens
      name: 'Homo sapiens',
      commonName: 'Human',
      confidence: 90,
      source: 'human_detection',
      rank: 'species',
      // Keep raw score shape, normalization happens downstream.
      visionScore: visionCandidates[0]?.score ?? 90,
      plantNetScore: null,
      iNatScore: null
    };
  }

  console.log(
    `Not a human (strong=${strongScore.toFixed(2)}, supporting=${supportingScore.toFixed(2)}, ` +
    `animal=${animalScore.toFixed(2)}, object=${objectScore.toFixed(2)})`
  );
  return null;
};

/**
 * 📊 Get species suggestions based on location and date
 * Useful for showing "commonly seen in your area" suggestions
 * NO AUTHENTICATION REQUIRED
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
 * 🔄 FALLBACK METHOD: Use multi-source approach
 * Combines Vision API + PlantNet + iNaturalist search
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

  // Weights for each source
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
    const normalizedScore = toPercentScore(visionScore);
    totalScore += normalizedScore * weights.vision;
    totalWeight += weights.vision;
    sourceCount++;
    console.log(`  Vision: ${normalizedScore.toFixed(1)}% (weight: ${weights.vision})`);
  }

  // 2. PlantNet Score
  if (plantNetScore !== null && plantNetScore !== undefined) {
    const normalizedScore = toPercentScore(plantNetScore);
    totalScore += normalizedScore * weights.plantnet;
    totalWeight += weights.plantnet;
    sourceCount++;
    console.log(`  PlantNet: ${normalizedScore.toFixed(1)}% (weight: ${weights.plantnet})`);
  }

  // 3. iNaturalist Search Score
  if (iNatScore !== null && iNatScore !== undefined) {
    const normalizedScore = iNatScore > 1 ? Math.min(Number(iNatScore) || 0, 100) : toPercentScore(iNatScore);
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

/**
 * 🎯 NEW: Adaptive confidence calculation with source reliability scoring
 */
export const calculateAdaptiveConfidence = (sources, imageQuality = null) => {
  const {
    visionScore = null,
    plantNetScore = null,
    iNatScore = null,
    inatCVScore = null,
    matchQuality = 'low',
    hasObservations = false,
    taxonRank = null,
    observationCount = 0,
  } = sources;

  console.log('🎯 Calculating adaptive confidence...');

  // Dynamic weights based on available sources
  let weights = {
    vision: 0.15,
    plantnet: 0.40,  // PlantNet gets highest weight for plants
    inat: 0.25,
    inatCV: 0.10,
    quality: 0.05,
    verification: 0.05
  };

  // Adjust weights if PlantNet unavailable (animal identification)
  if (plantNetScore === null) {
    weights = {
      vision: 0.30,    // Increase Vision weight
      plantnet: 0,
      inat: 0.50,      // Increase iNat weight significantly
      inatCV: 0.10,
      quality: 0.05,
      verification: 0.05
    };
  }

  let totalScore = 0;
  let totalWeight = 0;
  let sourceCount = 0;
  const sourceScores = {};

  // 1. Vision API Score
  if (visionScore !== null && visionScore !== undefined) {
    const normalizedScore = toPercentScore(visionScore);
    totalScore += normalizedScore * weights.vision;
    totalWeight += weights.vision;
    sourceCount++;
    sourceScores.vision = normalizedScore;
    console.log(`  Vision: ${normalizedScore.toFixed(1)}% (weight: ${weights.vision})`);
  }

  // 2. PlantNet Score
  if (plantNetScore !== null && plantNetScore !== undefined) {
    const normalizedScore = toPercentScore(plantNetScore);
    totalScore += normalizedScore * weights.plantnet;
    totalWeight += weights.plantnet;
    sourceCount++;
    sourceScores.plantnet = normalizedScore;
    console.log(`  PlantNet: ${normalizedScore.toFixed(1)}% (weight: ${weights.plantnet})`);
  }

  // 3. iNaturalist Search Score
  if (iNatScore !== null && iNatScore !== undefined) {
    const normalizedScore = iNatScore > 1 ? Math.min(Number(iNatScore) || 0, 100) : toPercentScore(iNatScore);
    totalScore += normalizedScore * weights.inat;
    totalWeight += weights.inat;
    sourceCount++;
    sourceScores.inat = normalizedScore;
    console.log(`  iNaturalist: ${normalizedScore.toFixed(1)}% (weight: ${weights.inat})`);
  }

  // 4. iNaturalist CV Score (if available)
  if (inatCVScore !== null && inatCVScore !== undefined) {
    const normalizedScore = toPercentScore(inatCVScore);
    totalScore += normalizedScore * weights.inatCV;
    totalWeight += weights.inatCV;
    sourceCount++;
    sourceScores.inatCV = normalizedScore;
    console.log(`  iNat CV: ${normalizedScore.toFixed(1)}% (weight: ${weights.inatCV})`);
  }

  // 5. Match Quality Bonus
  const qualityBonus = {
    'high': 100,
    'medium': 75,
    'low': 50
  };
  
  const qualityScore = qualityBonus[matchQuality] || 50;
  totalScore += qualityScore * weights.quality;
  totalWeight += weights.quality;

  // 6. Verification Bonus (observation count based)
  let verificationBonus = 0;
  if (hasObservations) {
    if (observationCount > 50000) {
      verificationBonus = 100;
    } else if (observationCount > 10000) {
      verificationBonus = 95;
    } else if (observationCount > 1000) {
      verificationBonus = 85;
    } else if (observationCount > 100) {
      verificationBonus = 75;
    } else {
      verificationBonus = 65;
    }
  }
  
  totalScore += verificationBonus * weights.verification;
  totalWeight += weights.verification;

  // Calculate base confidence
  let confidence = totalWeight > 0 ? (totalScore / totalWeight) : 0;

  // Apply rank multiplier
  const rankMultiplier = {
    'species': 1.0,
    'subspecies': 0.98,
    'variety': 0.95,
    'genus': 0.85,
    'family': 0.75,
    'order': 0.65
  };
  
  const rankAdjustment = rankMultiplier[taxonRank?.toLowerCase()] || 0.80;
  confidence *= rankAdjustment;

  // Multi-source agreement bonus
  if (sourceCount >= 3) {
    // Check if sources agree (within 20% of each other)
    const scores = Object.values(sourceScores);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const maxDeviation = Math.max(...scores.map(s => Math.abs(s - avgScore)));
    
    if (maxDeviation < 20) {
      confidence *= 1.08; // Strong agreement bonus
      console.log('  ✅ Strong source agreement detected (+8%)');
    } else {
      confidence *= 1.03; // Moderate agreement
    }
  } else if (sourceCount >= 2) {
    confidence *= 1.02;
  }

  // Image quality adjustment (if provided)
  if (imageQuality) {
    if (imageQuality.overallScore >= 80) {
      confidence *= 1.05;
      console.log('  ✅ High image quality (+5%)');
    } else if (imageQuality.overallScore < 60) {
      confidence *= 0.92;
      console.log('  ⚠️ Low image quality (-8%)');
    }
  }

  // Penalty for single source
  if (sourceCount === 1) {
    confidence *= 0.85;
    console.log('  ⚠️ Single source penalty (-15%)');
  }

  const finalConfidence = Math.round(Math.min(Math.max(confidence, 0), 100));
  
  console.log(`✅ Adaptive Confidence: ${finalConfidence}% (from ${sourceCount} sources, rank: ${taxonRank})`);
  console.log(`   Source scores: ${JSON.stringify(sourceScores)}`);
  
  return finalConfidence;
};

export default {
  identifyWithMultiSource,
  getNearbySpecies,
  calculateEnhancedConfidence,
  calculateAdaptiveConfidence,
  detectHuman
};


