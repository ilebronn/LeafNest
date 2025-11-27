import axios from 'axios';
import { PLANTNET_API_KEY, GOOGLE_VISION_API_KEY } from '@env';
import {
  getWithRetry,
  postWithRetry,
  handleApiError,
  validateResponse,
  inaturalistRateLimiter
} from './apiHelpers';
import {
  API_TIMEOUT_MS,
  VISION_MAX_LABELS,
  VISION_MAX_WEB_ENTITIES,
  MAX_CANDIDATES_TO_PROCESS,
  MAX_CANDIDATES_FOR_SEARCH,
  COMMON_SPECIES,
  GENERIC_TERMS,
  PLANT_KEYWORDS,
  ANIMAL_KEYWORDS,
  IRRELEVANT_KEYWORDS,
  SCORE_WEIGHTS,
  RELEVANCE_THRESHOLD,
  INATURALIST_SEARCH_DELAY_MS,
  CONFIDENCE_THRESHOLD,
  MIN_OBSERVATIONS_FOR_BOOST,
  MAX_CONFIDENCE_DISPLAY
} from '@screens/Main/ScanScreen/utils/constants';

// ===========================
// GOOGLE VISION API
// ===========================

/**
 * Analyze image using Google Vision API
 * @param {string} base64Image - Base64 encoded image
 * @returns {Promise<Object>} - Vision API response data
 */
export const analyzeWithVisionAPI = async (base64Image) => {
  if (!base64Image) {
    throw new Error('Base64 image is required');
  }

  if (!GOOGLE_VISION_API_KEY) {
    throw new Error('Google Vision API key is not configured');
  }

  try {
    console.log('🔍 Calling Google Vision API...');

    const response = await postWithRetry(
      `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
      {
        requests: [{
          image: { content: base64Image },
          features: [
            { type: 'LABEL_DETECTION', maxResults: VISION_MAX_LABELS },
            { type: 'WEB_DETECTION', maxResults: VISION_MAX_WEB_ENTITIES },
          ],
        }],
      },
      { timeout: API_TIMEOUT_MS }
    );

    const validation = validateResponse(response, ['responses']);
    if (!validation.valid) {
      throw new Error('Invalid Vision API response structure');
    }

    const visionData = response.data.responses[0] || {};
    console.log('✅ Vision API analysis complete');

    return visionData;
  } catch (error) {
    const errorDetails = handleApiError(error, 'Google Vision API');
    console.error('❌ Vision API failed:', errorDetails);
    throw error;
  }
};

/**
 * Extract candidate species names with confidence scores from Vision API data
 * @param {Object} visionData - Response from Vision API
 * @returns {Array<Object>} - Array of {name, score} objects
 */
export const extractCandidatesWithScores = (visionData) => {
  if (!visionData) return [];

  const labels = visionData.labelAnnotations || [];
  const webEntities = visionData.webDetection?.webEntities || [];
  const webLabels = visionData.webDetection?.bestGuessLabels || [];

  const candidatesMap = new Map();

  // Best guess labels get highest priority
  webLabels.forEach(item => {
    const text = (item.label || '').trim().toLowerCase();
    if (text && text.length > 2 && !GENERIC_TERMS.has(text)) {
      candidatesMap.set(text, { 
        name: text, 
        score: SCORE_WEIGHTS.BEST_GUESS_LABEL_SCORE 
      });
    }
  });

  // Web entities
  webEntities.forEach(item => {
    const text = (item.description || '').trim().toLowerCase();
    if (text && text.length > 2 && !GENERIC_TERMS.has(text)) {
      const score = (item.score || 0.5) * 100 * SCORE_WEIGHTS.WEB_ENTITY_MULTIPLIER;
      if (!candidatesMap.has(text) || candidatesMap.get(text).score < score) {
        candidatesMap.set(text, { name: text, score });
      }
    }
  });

  // Labels
  labels.forEach(item => {
    const text = (item.description || '').trim().toLowerCase();
    if (text && text.length > 2 && !GENERIC_TERMS.has(text)) {
      const score = (item.score || 0.5) * 100 * SCORE_WEIGHTS.LABEL_ANNOTATION_MULTIPLIER;
      if (!candidatesMap.has(text) || candidatesMap.get(text).score < score) {
        candidatesMap.set(text, { name: text, score });
      }
    }
  });

  // Boost common species
  candidatesMap.forEach((value, key) => {
    if (COMMON_SPECIES.has(key)) {
      value.score *= SCORE_WEIGHTS.COMMON_SPECIES_BOOST;
    }
  });

  const candidates = Array.from(candidatesMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES_TO_PROCESS);

  console.log(`🎯 Extracted ${candidates.length} candidates`);
  if (candidates.length > 0) {
    console.log(`   Top 3: ${candidates.slice(0, 3).map(c => `${c.name} (${c.score.toFixed(1)})`).join(', ')}`);
  }

  return candidates;
};

/**
 * Detect if image is a plant or animal based on Vision API labels
 * @param {Object} visionData - Response from Vision API
 * @returns {boolean} - True if plant or animal, false otherwise
 */
export const isPlantOrAnimal = (visionData) => {
  if (!visionData || !visionData.labelAnnotations) return false;

  const labels = visionData.labelAnnotations;
  let relevantScore = 0;
  let irrelevantScore = 0;

  const allKeywords = [...PLANT_KEYWORDS, ...ANIMAL_KEYWORDS];

  for (const label of labels) {
    const desc = label.description.toLowerCase();
    const score = label.score || 0;

    if (allKeywords.some(kw => desc.includes(kw))) {
      relevantScore += score;
    }
    if (IRRELEVANT_KEYWORDS.some(kw => desc.includes(kw))) {
      irrelevantScore += score;
    }
  }

  const isValid = relevantScore > RELEVANCE_THRESHOLD && relevantScore > irrelevantScore;
  console.log(`📊 Plant/Animal check: relevant=${relevantScore.toFixed(2)}, irrelevant=${irrelevantScore.toFixed(2)} → ${isValid ? '✅' : '❌'}`);

  return isValid;
};

/**
 * Detect category (plant or animal) from Vision API labels
 * @param {Object} visionData - Response from Vision API
 * @returns {string} - 'plant' or 'animal'
 */
export const detectCategoryFromLabels = (visionData) => {
  if (!visionData || !visionData.labelAnnotations) return 'animal';

  const labels = visionData.labelAnnotations;
  let plantScore = 0;
  let animalScore = 0;

  for (const label of labels) {
    const desc = label.description.toLowerCase();
    const score = label.score || 0;

    if (PLANT_KEYWORDS.some(kw => desc.includes(kw))) {
      plantScore += score;
    }
    if (ANIMAL_KEYWORDS.some(kw => desc.includes(kw))) {
      animalScore += score;
    }
  }

  const category = plantScore > animalScore ? 'plant' : 'animal';
  console.log(`🏷️ Category: ${category} (plant=${plantScore.toFixed(2)}, animal=${animalScore.toFixed(2)})`);

  return category;
};

// ===========================
// PLANTNET API
// ===========================

/**
 * Identify plant species using PlantNet API
 * @param {string} photoUri - Local photo URI
 * @returns {Promise<Object|null>} - Species data or null if not found
 */
export const identifyWithPlantNet = async (photoUri) => {
  if (!photoUri) {
    throw new Error('Photo URI is required');
  }

  if (!PLANTNET_API_KEY) {
    console.warn('⚠️ PlantNet API key not configured, skipping');
    return null;
  }

  try {
    console.log('🌿 Calling PlantNet API...');

    const formData = new FormData();
    formData.append('images', { 
      uri: photoUri, 
      type: 'image/jpeg', 
      name: 'plant.jpg' 
    });

    const response = await axios.post(
      `https://my-api.plantnet.org/v2/identify/all?api-key=${PLANTNET_API_KEY}`,
      formData,
      { 
        headers: { 'Content-Type': 'multipart/form-data' }, 
        timeout: 20000 
      }
    );

    const results = response?.data?.results || [];
    if (results.length === 0) {
      console.log('❌ PlantNet: No results');
      return null;
    }

    const topResult = results[0];
    const confidence = Math.round(topResult.score * 100);

    console.log(`✅ PlantNet: ${topResult.species.scientificNameWithoutAuthor} (${confidence}%)`);

    // Only fetch iNat details if confidence is reasonable
    let taxonDetails = null;
    if (confidence > CONFIDENCE_THRESHOLD) {
      taxonDetails = await searchINaturalistByName(topResult.species.scientificNameWithoutAuthor);
    }

    return {
      taxonId: taxonDetails?.id || null,
      name: topResult.species.scientificNameWithoutAuthor,
      commonName: topResult.species.commonNames?.[0] || taxonDetails?.preferred_common_name || null,
      confidence: confidence,
      source: 'plantnet',
      rank: taxonDetails?.rank || 'species'
    };
  } catch (error) {
    console.error('❌ PlantNet error:', error.message);
    return null;
  }
};

// ===========================
// INATURALIST API
// ===========================

/**
 * Search iNaturalist by single species name
 * @param {string} scientificName - Scientific name to search
 * @returns {Promise<Object|null>} - Taxon data or null
 */
export const searchINaturalistByName = async (scientificName) => {
  if (!scientificName || typeof scientificName !== 'string') {
    throw new Error('Valid scientific name is required');
  }

  try {
    await inaturalistRateLimiter.acquire();

    const response = await getWithRetry(
      `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(scientificName)}&per_page=1`,
      { timeout: 6000 }
    );

    const result = response?.data?.results?.[0] || null;
    
    if (result) {
      console.log(`✅ iNat search: ${result.name}`);
    }

    return result;
  } catch (error) {
    console.error('❌ iNaturalist search error:', error.message);
    return null;
  }
};

/**
 * Search iNaturalist with multiple candidate names and rank by relevance
 * @param {Array<Object>} candidateNames - Array of {name, score} objects
 * @returns {Promise<Object|null>} - Best match or null
 */
export const searchINaturalistByNames = async (candidateNames) => {
  if (!Array.isArray(candidateNames) || candidateNames.length === 0) {
    return null;
  }

  console.log(`🔍 Searching iNaturalist with ${candidateNames.length} candidates...`);

  const matches = [];
  const processedNames = new Set();

  for (const candidate of candidateNames.slice(0, MAX_CANDIDATES_FOR_SEARCH)) {
    const name = candidate.name;
    if (processedNames.has(name)) continue;
    processedNames.add(name);

    try {
      await inaturalistRateLimiter.acquire();

      const response = await getWithRetry(
        `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(name)}&per_page=3`,
        { timeout: 6000 }
      );

      const results = response?.data?.results || [];

      for (const result of results) {
        if (!result.id || !result.name) continue;

        const score = calculateMatchScore(result, name, candidate.score);

        matches.push({
          taxonId: result.id,
          name: result.name,
          commonName: result.preferred_common_name,
          score: score,
          rank: result.rank,
          obsCount: result.observations_count || 0,
          visionScore: candidate.score,
          photo: result.default_photo?.medium_url || null,
          wikipediaSummary: result.wikipedia_summary || null
        });
      }

      await new Promise(resolve => setTimeout(resolve, INATURALIST_SEARCH_DELAY_MS));
    } catch (error) {
      console.warn(`⚠️ Failed to search "${name}":`, error.message);
      continue;
    }
  }

  if (matches.length === 0) {
    console.log('❌ No iNaturalist matches found');
    return null;
  }

  // Sort by score and get best match
  matches.sort((a, b) => b.score - a.score);
  const bestMatch = matches[0];

  // Calculate final confidence
  let confidence = Math.min(bestMatch.score, 100);
  if (bestMatch.rank === 'species' && bestMatch.obsCount > MIN_OBSERVATIONS_FOR_BOOST) {
    confidence = Math.min(confidence * 1.1, MAX_CONFIDENCE_DISPLAY);
  }

  console.log(`✅ Best match: ${bestMatch.name} (score: ${bestMatch.score.toFixed(1)}, obs: ${bestMatch.obsCount})`);

  return {
    taxonId: bestMatch.taxonId,
    name: bestMatch.name,
    commonName: bestMatch.commonName,
    confidence: Math.min(Math.round(confidence), MAX_CONFIDENCE_DISPLAY),
    source: 'inaturalist_search',
    rank: bestMatch.rank
  };
};

/**
 * Calculate match score for iNaturalist result
 * @private
 * @param {Object} result - iNaturalist taxon result
 * @param {string} searchName - Original search name
 * @param {number} visionScore - Score from Vision API
 * @returns {number} - Calculated score
 */
const calculateMatchScore = (result, searchName, visionScore) => {
  const resultNameLower = result.name.toLowerCase();
  const commonNameLower = result.preferred_common_name?.toLowerCase() || '';
  const nameLower = searchName.toLowerCase();

  // Start with Vision API score weighted
  let score = visionScore * SCORE_WEIGHTS.VISION_API_WEIGHT;

  // Exact matches
  if (resultNameLower === nameLower) {
    score += SCORE_WEIGHTS.EXACT_MATCH;
  } else if (commonNameLower === nameLower) {
    score += SCORE_WEIGHTS.COMMON_NAME_EXACT;
  } else if (resultNameLower.includes(nameLower)) {
    score += SCORE_WEIGHTS.CONTAINS_MATCH;
  } else if (commonNameLower.includes(nameLower)) {
    score += SCORE_WEIGHTS.COMMON_NAME_CONTAINS;
  } else if (nameLower.includes(resultNameLower)) {
    score += SCORE_WEIGHTS.PARTIAL_MATCH;
  }

  // Taxonomic rank bonus
  if (result.rank === 'species') {
    score += SCORE_WEIGHTS.SPECIES_RANK;
  } else if (result.rank === 'subspecies') {
    score += SCORE_WEIGHTS.SUBSPECIES_RANK;
  } else if (result.rank === 'genus') {
    score += SCORE_WEIGHTS.GENUS_RANK;
  } else {
    score += SCORE_WEIGHTS.OTHER_RANK_PENALTY;
  }

  // Popularity/reliability based on observation count
  const obsCount = result.observations_count || 0;
  if (obsCount > 50000) {
    score += SCORE_WEIGHTS.OBSERVATIONS_50K_PLUS;
  } else if (obsCount > 10000) {
    score += SCORE_WEIGHTS.OBSERVATIONS_10K_PLUS;
  } else if (obsCount > 1000) {
    score += SCORE_WEIGHTS.OBSERVATIONS_1K_PLUS;
  } else if (obsCount > 100) {
    score += SCORE_WEIGHTS.OBSERVATIONS_100_PLUS;
  } else if (obsCount < 10) {
    score += SCORE_WEIGHTS.OBSERVATIONS_UNDER_10_PENALTY;
  }

  // Photo availability
  if (result.default_photo?.medium_url) {
    score += SCORE_WEIGHTS.PHOTO_AVAILABLE;
  }

  // Wikipedia summary available
  if (result.wikipedia_summary) {
    score += SCORE_WEIGHTS.WIKIPEDIA_AVAILABLE;
  }

  return score;
};

/**
 * Fetch detailed taxon information from iNaturalist
 * @param {number} taxonId - iNaturalist taxon ID
 * @returns {Promise<Object|null>} - Detailed taxon data
 */
export const fetchTaxonDetails = async (taxonId) => {
  if (!taxonId) {
    throw new Error('Taxon ID is required');
  }

  try {
    await inaturalistRateLimiter.acquire();

    const response = await getWithRetry(
      `https://api.inaturalist.org/v1/taxa/${taxonId}`,
      { timeout: 5000 }
    );

    const taxonData = response?.data?.results?.[0] || null;
    
    if (taxonData) {
      console.log(`✅ Fetched taxon details: ${taxonData.name}`);
    }

    return taxonData;
  } catch (error) {
    console.error('❌ Error fetching taxon details:', error.message);
    return null;
  }
};

/**
 * Fetch observation count for a taxon
 * @param {number} taxonId - iNaturalist taxon ID
 * @returns {Promise<number>} - Observation count
 */
export const fetchObservationCount = async (taxonId) => {
  if (!taxonId) return 0;

  try {
    await inaturalistRateLimiter.acquire();

    const response = await getWithRetry(
      `https://api.inaturalist.org/v1/observations?taxon_id=${taxonId}&per_page=1`,
      { timeout: 3000 }
    );

    const count = response?.data?.total_results ?? 0;
    console.log(`📊 Observation count for taxon ${taxonId}: ${count}`);

    return count;
  } catch (error) {
    console.error('❌ Error fetching observation count:', error.message);
    return 0;
  }
};

// ===========================
// GBIF API
// ===========================

/**
 * Fetch species data from GBIF
 * @param {string} speciesName - Scientific name
 * @returns {Promise<Object|null>} - GBIF species data
 */
export const fetchGBIF = async (speciesName) => {
  if (!speciesName || typeof speciesName !== 'string') {
    throw new Error('Valid species name is required');
  }

  try {
    const response = await getWithRetry(
      `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(speciesName)}`,
      { timeout: 4000 }
    );

    const gbifData = response.data;
    console.log(`✅ GBIF data fetched for: ${speciesName}`);

    return gbifData;
  } catch (error) {
    console.error('❌ GBIF error:', error.message);
    return null;
  }
};

// ===========================
// EXPORTS
// ===========================

export default {
  analyzeWithVisionAPI,
  extractCandidatesWithScores,
  isPlantOrAnimal,
  detectCategoryFromLabels,
  identifyWithPlantNet,
  searchINaturalistByName,
  searchINaturalistByNames,
  fetchTaxonDetails,
  fetchObservationCount,
  fetchGBIF
};