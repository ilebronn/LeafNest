// speciesIdentification.js - WITH ANIMAL API SUPPORT, SMART CONFIDENCE & API TOKEN
import axios from 'axios';
import { 
  PLANTNET_API_KEY, 
  GOOGLE_VISION_API_KEY,
  INATURALIST_API_TOKEN // 🔑 ADD YOUR TOKEN
} from '@env';
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
  HUMAN_KEYWORDS,
  WEAK_ANIMAL_KEYWORDS,
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

export const extractCandidatesWithScores = (visionData) => {
  if (!visionData) return [];

  const labels = visionData.labelAnnotations || [];
  const webEntities = visionData.webDetection?.webEntities || [];
  const webLabels = visionData.webDetection?.bestGuessLabels || [];

  const candidatesMap = new Map();

  webLabels.forEach(item => {
    const text = (item.label || '').trim().toLowerCase();
    if (text && text.length > 2 && !GENERIC_TERMS.has(text)) {
      candidatesMap.set(text, { 
        name: text, 
        score: SCORE_WEIGHTS.BEST_GUESS_LABEL_SCORE 
      });
    }
  });

  webEntities.forEach(item => {
    const text = (item.description || '').trim().toLowerCase();
    if (text && text.length > 2 && !GENERIC_TERMS.has(text)) {
      const score = (item.score || 0.5) * 100 * SCORE_WEIGHTS.WEB_ENTITY_MULTIPLIER;
      if (!candidatesMap.has(text) || candidatesMap.get(text).score < score) {
        candidatesMap.set(text, { name: text, score });
      }
    }
  });

  labels.forEach(item => {
    const text = (item.description || '').trim().toLowerCase();
    if (text && text.length > 2 && !GENERIC_TERMS.has(text)) {
      const score = (item.score || 0.5) * 100 * SCORE_WEIGHTS.LABEL_ANNOTATION_MULTIPLIER;
      if (!candidatesMap.has(text) || candidatesMap.get(text).score < score) {
        candidatesMap.set(text, { name: text, score });
      }
    }
  });

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

export const isPlantOrAnimal = (visionData) => {
  if (!visionData) return false;

  const labelAnnotations = visionData.labelAnnotations || [];
  const webEntities = visionData.webDetection?.webEntities || [];
  const bestGuessLabels = visionData.webDetection?.bestGuessLabels || [];

  const combinedSignals = [
    ...labelAnnotations.map(item => ({
      description: (item.description || '').toLowerCase(),
      score: Number(item.score) || 0
    })),
    ...webEntities.map(item => ({
      description: (item.description || '').toLowerCase(),
      score: (Math.min(Number(item.score) || 0, 1)) * 0.85
    })),
    ...bestGuessLabels.map(item => ({
      description: (item.label || '').toLowerCase(),
      // Best-guess labels have no explicit confidence score from Vision API.
      score: 0.7
    }))
  ].filter(signal => signal.description);

  if (combinedSignals.length === 0) return false;

  let plantScore = 0;
  let animalScore = 0;
  let humanScore = 0;
  let weakAnimalScore = 0;
  let irrelevantScore = 0;
  let plantHits = 0;
  let animalHits = 0;
  let humanHits = 0;

  for (const signal of combinedSignals) {
    const desc = signal.description;
    const score = signal.score || 0;

    if (PLANT_KEYWORDS.some(kw => desc.includes(kw))) {
      plantScore += score;
      plantHits += 1;
    }
    if (ANIMAL_KEYWORDS.some(kw => desc.includes(kw))) {
      animalScore += score;
      animalHits += 1;
    }
    if (HUMAN_KEYWORDS.some(kw => desc.includes(kw))) {
      humanScore += score;
      humanHits += 1;
    }
    if (WEAK_ANIMAL_KEYWORDS.some(kw => desc.includes(kw))) {
      weakAnimalScore += score;
    }
    if (IRRELEVANT_KEYWORDS.some(kw => desc.includes(kw))) {
      // Penalize non-biological objects a bit more
      irrelevantScore += score * 1.25;
    }
  }

  const hasStrongPlant = plantScore >= 0.35 && plantHits > 0;
  const hasStrongAnimal = animalScore >= 0.35 && animalHits > 0;
  const hasStrongHuman = humanScore >= 0.6 && humanHits >= 2;
  const strongSignal = hasStrongPlant || hasStrongAnimal || hasStrongHuman;

  const relevantScore =
    plantScore +
    animalScore +
    (hasStrongHuman ? humanScore * 0.6 : 0) +
    (strongSignal ? weakAnimalScore * 0.2 : 0);

  const threshold = Math.max(RELEVANCE_THRESHOLD, irrelevantScore + 0.15);
  const objectDominates = irrelevantScore >= 0.75 && irrelevantScore > relevantScore;
  const isValid = strongSignal && relevantScore > threshold && !objectDominates;

  console.log(
    `Plant/Animal check: plant=${plantScore.toFixed(2)} ` +
    `animal=${animalScore.toFixed(2)} human=${humanScore.toFixed(2)} ` +
    `weak=${weakAnimalScore.toFixed(2)} irrelevant=${irrelevantScore.toFixed(2)} ` +
    `signals=${combinedSignals.length} objectDominates=${objectDominates} ` +
    `-> ${isValid ? 'OK' : 'NO'}`
  );

  return isValid;
};

export const detectCategoryFromLabels = (visionData) => {
  if (!visionData || !visionData.labelAnnotations) return 'animal';

  const labels = visionData.labelAnnotations;
  let plantScore = 0;
  let animalScore = 0;
  let humanScore = 0;
  let weakAnimalScore = 0;

  for (const label of labels) {
    const desc = label.description.toLowerCase();
    const score = label.score || 0;

    if (PLANT_KEYWORDS.some(kw => desc.includes(kw))) {
      plantScore += score;
    }
    if (ANIMAL_KEYWORDS.some(kw => desc.includes(kw))) {
      animalScore += score;
    }
    if (HUMAN_KEYWORDS.some(kw => desc.includes(kw))) {
      humanScore += score;
    }
    if (WEAK_ANIMAL_KEYWORDS.some(kw => desc.includes(kw))) {
      weakAnimalScore += score * 0.2;
    }
  }

  const combinedAnimalScore = animalScore + (humanScore * 0.7) + weakAnimalScore;
  const category = plantScore > combinedAnimalScore ? 'plant' : 'animal';
  console.log(
    `Category: ${category} (plant=${plantScore.toFixed(2)}, ` +
    `animal=${animalScore.toFixed(2)}, human=${humanScore.toFixed(2)})`
  );

  return category;
};

// ===========================
// SMART CONFIDENCE CALCULATOR
// ===========================

/**
 * 🎯 SMART CONFIDENCE: Calculate confidence based on identification quality
 */
export const calculateSmartConfidence = (result, rawConfidence) => {
  console.log('🎯 Calculating smart confidence...');
  console.log('   Input confidence:', rawConfidence);
  console.log('   Rank:', result.rank);
  console.log('   Has common name:', !!result.commonName);
  console.log('   Has scientific name:', !!result.name);
  console.log('   Source:', result.source);
  
  let confidence = rawConfidence;
  
  // FAMILY LEVEL: Always 60%
  if (result.rank === 'family') {
    confidence = 60;
    console.log('   → Family level: Fixed at 60%');
    return confidence;
  }
  
  // GENUS LEVEL: 70-90% based on quality
  if (result.rank === 'genus') {
    confidence = 70;
    
    if (result.commonName && result.commonName !== result.name) {
      confidence += 5;
    }
    if (result.obsCount > 1000) {
      confidence += 5;
    }
    if (result.source === 'plantnet' || result.source === 'inaturalist_cv') {
      confidence += 10;
    }
    
    confidence = Math.min(confidence, 90);
    console.log(`   → Genus level: ${confidence}%`);
    return confidence;
  }
  
  // SPECIES LEVEL: Check completeness
  const hasCommonName = result.commonName && result.commonName !== result.name;
  const hasScientificName = result.name && result.name.includes(' ');
  const hasVerifiedSource = ['plantnet', 'inaturalist_cv', 'inaturalist_search'].includes(result.source);
  const isWellDocumented = result.obsCount > 100;
  
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
    console.log('   ✅ Well documented species');
  }
  
  // Apply confidence based on quality
  if (qualityScore === 4) {
    confidence = Math.max(rawConfidence, 95);
    confidence = Math.min(confidence, 98);
    console.log(`   → Complete info (${qualityScore}/4): ${confidence}%`);
  } else if (qualityScore === 3) {
    confidence = Math.max(rawConfidence, 85);
    confidence = Math.min(confidence, 95);
    console.log(`   → Good info (${qualityScore}/4): ${confidence}%`);
  } else if (qualityScore === 2) {
    confidence = Math.max(rawConfidence, 75);
    confidence = Math.min(confidence, 85);
    console.log(`   → Moderate info (${qualityScore}/4): ${confidence}%`);
  } else if (qualityScore === 1) {
    confidence = Math.max(rawConfidence, 65);
    confidence = Math.min(confidence, 75);
    console.log(`   → Limited info (${qualityScore}/4): ${confidence}%`);
  } else {
    confidence = Math.min(rawConfidence, 65);
    console.log(`   → Minimal info (${qualityScore}/4): ${confidence}%`);
  }
  
  return Math.round(confidence);
};

// ===========================
// PLANTNET API
// ===========================

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
    const rawConfidence = Math.round(topResult.score * 100);

    console.log(`✅ PlantNet raw: ${topResult.species.scientificNameWithoutAuthor} (${rawConfidence}%)`);

    let taxonDetails = null;
    if (rawConfidence > CONFIDENCE_THRESHOLD) {
      taxonDetails = await searchINaturalistByName(topResult.species.scientificNameWithoutAuthor);
    }

    const result = {
      taxonId: taxonDetails?.id || null,
      name: topResult.species.scientificNameWithoutAuthor,
      commonName: topResult.species.commonNames?.[0] || taxonDetails?.preferred_common_name || null,
      confidence: rawConfidence,
      source: 'plantnet',
      rank: taxonDetails?.rank || 'species',
      obsCount: taxonDetails?.observations_count || 0
    };

    result.confidence = calculateSmartConfidence(result, rawConfidence);
    
    console.log(`✅ PlantNet final: ${result.name} (${result.confidence}%)`);

    return result;
  } catch (error) {
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      console.warn('⏰ PlantNet API timeout');
      return null;
    }

    if (error.response) {
      const status = error.response.status;
      if (status === 429) {
        console.warn('🚦 PlantNet API rate limited');
      } else if (status >= 500) {
        console.warn('🛠️ PlantNet API server error');
      }
    }

    return null;
  }
};

// ===========================
// 🔑 INATURALIST CV API WITH TOKEN
// ===========================

export const identifyWithINaturalistCV = async (photoUri) => {
  if (!photoUri) {
    throw new Error('Photo URI is required');
  }

  try {
    console.log('🦁 Calling iNaturalist Computer Vision API...');

    const formData = new FormData();
    formData.append('image', {
      uri: photoUri,
      type: 'image/jpeg',
      name: 'photo.jpg'
    });

    const headers = {
      'Content-Type': 'multipart/form-data',
      'User-Agent': 'LeafNestApp/1.0'
    };

    // ✅ ADD TOKEN BACK
    if (INATURALIST_API_TOKEN) {
      headers['Authorization'] = `Bearer ${INATURALIST_API_TOKEN}`;
      console.log('   🔑 Using authenticated API');
    } else {
      console.warn('   ⚠️ No API token - may fail with 401');
    }

    const response = await axios.post(
      'https://api.inaturalist.org/v1/computervision/score_image',
      formData,
      {
        headers: headers,
        timeout: 15000
      }
    );

    const results = response?.data?.results || [];
    if (results.length === 0) {
      console.log('❌ iNaturalist CV: No results');
      return null;
    }

    const topResult = results[0];
    const rawScore = topResult.combined_score || topResult.vision_score || 0;
    const rawConfidence = Math.round(rawScore * 100);

    console.log(`✅ iNaturalist CV raw: ${topResult.taxon.name} (${rawConfidence}%)`);

    let taxonDetails = null;
    if (topResult.taxon.id) {
      taxonDetails = await fetchTaxonDetails(topResult.taxon.id);
    }

    const result = {
      taxonId: topResult.taxon.id,
      name: topResult.taxon.name,
      commonName: topResult.taxon.preferred_common_name || taxonDetails?.preferred_common_name || null,
      confidence: rawConfidence,
      source: 'inaturalist_cv',
      rank: topResult.taxon.rank || 'species',
      iconicTaxon: topResult.taxon.iconic_taxon_name,
      obsCount: topResult.taxon.observations_count || 0,
    };

    result.confidence = calculateSmartConfidence(result, rawConfidence);
    
    console.log(`✅ iNaturalist CV final: ${result.name} (${result.confidence}%)`);

    return result;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('❌ Authentication required (401)');
      console.error('   Token missing or expired');
      console.error('   Get new token: https://www.inaturalist.org/users/api_token');
    } else if (error.response?.status === 422) {
      console.error('❌ Invalid image format (422)');
      console.error('   Response:', error.response?.data);
    } else if (error.response?.status === 429) {
      console.error('❌ Rate limit exceeded');
    } else {
      console.error('❌ iNaturalist CV error:', error.message);
    }
    return null;
  }
};

// ===========================
// 🔑 INATURALIST SEARCH WITH TOKEN
// ===========================

export const searchINaturalistByName = async (scientificName) => {
  if (!scientificName || typeof scientificName !== 'string') {
    throw new Error('Valid scientific name is required');
  }

  try {
    await inaturalistRateLimiter.acquire();

    const headers = {
      'User-Agent': 'LeafNestApp/1.0'
    };

    if (INATURALIST_API_TOKEN) {
  headers['Authorization'] = `Bearer ${INATURALIST_API_TOKEN}`;
}

    const response = await getWithRetry(
      `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(scientificName)}&per_page=1`,
      { 
        timeout: 6000,
        headers: headers
      }
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

export const searchINaturalistByNames = async (candidateNames) => {
  if (!Array.isArray(candidateNames) || candidateNames.length === 0) {
    return null;
  }

  console.log(`🔍 Searching iNaturalist with ${candidateNames.length} candidates...`);

  const matches = [];
  const processedNames = new Set();

  const headers = {
    'User-Agent': 'LeafNestApp/1.0'
  };

  if (INATURALIST_API_TOKEN) {
  headers['Authorization'] = `Bearer ${INATURALIST_API_TOKEN}`;
    console.log('   🔑 Using authenticated search');
  }

  for (const candidate of candidateNames.slice(0, MAX_CANDIDATES_FOR_SEARCH)) {
    const name = candidate.name;
    if (processedNames.has(name)) continue;
    processedNames.add(name);

    try {
      await inaturalistRateLimiter.acquire();

      const response = await getWithRetry(
        `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(name)}&per_page=3`,
        { 
          timeout: 6000,
          headers: headers
        }
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

  matches.sort((a, b) => b.score - a.score);
  const bestMatch = matches[0];

  let rawConfidence = Math.min(bestMatch.score * 0.7, 85);

  const result = {
    taxonId: bestMatch.taxonId,
    name: bestMatch.name,
    commonName: bestMatch.commonName,
    confidence: rawConfidence,
    source: 'inaturalist_search',
    rank: bestMatch.rank,
    obsCount: bestMatch.obsCount
  };

  result.confidence = calculateSmartConfidence(result, rawConfidence);

  console.log(`✅ Best match: ${result.name} (${result.confidence}%)`);

  return result;
};

const calculateMatchScore = (result, searchName, visionScore) => {
  const resultNameLower = result.name.toLowerCase();
  const commonNameLower = result.preferred_common_name?.toLowerCase() || '';
  const nameLower = searchName.toLowerCase();

  let score = visionScore * SCORE_WEIGHTS.VISION_API_WEIGHT;

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

  if (result.rank === 'species') {
    score += SCORE_WEIGHTS.SPECIES_RANK;
  } else if (result.rank === 'subspecies') {
    score += SCORE_WEIGHTS.SUBSPECIES_RANK;
  } else if (result.rank === 'genus') {
    score += SCORE_WEIGHTS.GENUS_RANK;
  } else {
    score += SCORE_WEIGHTS.OTHER_RANK_PENALTY;
  }

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

  if (result.default_photo?.medium_url) {
    score += SCORE_WEIGHTS.PHOTO_AVAILABLE;
  }

  if (result.wikipedia_summary) {
    score += SCORE_WEIGHTS.WIKIPEDIA_AVAILABLE;
  }

  return score;
};

export const fetchTaxonDetails = async (taxonId) => {
  if (!taxonId) {
    throw new Error('Taxon ID is required');
  }

  try {
    await inaturalistRateLimiter.acquire();

    const headers = {
      'User-Agent': 'LeafNestApp/1.0'
    };

    if (INATURALIST_API_TOKEN) {
  headers['Authorization'] = `Bearer ${INATURALIST_API_TOKEN}`;
}

    const response = await getWithRetry(
      `https://api.inaturalist.org/v1/taxa/${taxonId}`,
      { 
        timeout: 5000,
        headers: headers
      }
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

export const extractBestCommonName = (result) => {
  const candidates = [
    result.commonName,
    result.preferred_common_name,
    result.name,
    result.scientificName
  ].filter(Boolean);

  if (candidates.length === 0) {
    return 'Unknown Species';
  }

  const commonNameCandidates = candidates.filter(name => {
    const lower = name.toLowerCase();
    
    if (lower.includes(' sp.') || lower.includes(' spp.')) return false;
    if (lower === lower.toLowerCase() && !lower.includes(' ')) return false;
    if (/^[a-z]+aceae$/i.test(lower)) return false;
    if (/^[a-z]+idae$/i.test(lower)) return false;
    
    return true;
  });

  const bestName = commonNameCandidates[0] || candidates[0];
  
  return bestName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const validateAndEnrichResult = (result, visionCandidates, category) => {
  if (!result) return null;

  const enrichedResult = {
    ...result,
    commonName: extractBestCommonName(result),
    name: result.name || result.scientificName || 'Unknown',
    rank: result.rank || 'species',
    confidence: result.confidence || 50
  };

  if (!result.source || !['plantnet', 'inaturalist_cv', 'inaturalist_search'].includes(result.source)) {
    enrichedResult.confidence = calculateSmartConfidence(enrichedResult, enrichedResult.confidence);
  }

  if (enrichedResult.rank === 'genus' && enrichedResult.confidence > 90) {
    enrichedResult.confidence = Math.min(enrichedResult.confidence, 90);
    console.log('  ⚠️ Confidence capped for genus-level identification');
  } else if (enrichedResult.rank === 'family' && enrichedResult.confidence > 60) {
    enrichedResult.confidence = Math.min(enrichedResult.confidence, 60);
    console.log('  ⚠️ Confidence capped for family-level identification');
  }

  const genericTerms = ['plantae', 'animalia', 'unknown', 'unidentified'];
  if (genericTerms.some(term => enrichedResult.commonName.toLowerCase().includes(term))) {
    const betterCandidate = visionCandidates.find(c => 
      !genericTerms.some(term => c.name.toLowerCase().includes(term))
    );
    
    if (betterCandidate) {
      enrichedResult.commonName = extractBestCommonName({ name: betterCandidate.name });
      enrichedResult.confidence = Math.min(enrichedResult.confidence, 60);
      console.log(`  ✅ Used better candidate: ${enrichedResult.commonName}`);
    }
  }

  console.log(`✅ Result validated and enriched: ${enrichedResult.commonName} (${enrichedResult.confidence}%)`);
  
  return enrichedResult;
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
  identifyWithINaturalistCV,
  searchINaturalistByName,
  searchINaturalistByNames,
  fetchTaxonDetails,
  fetchObservationCount,
  fetchGBIF,
  extractBestCommonName,
  validateAndEnrichResult,
  calculateSmartConfidence
};



