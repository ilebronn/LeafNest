import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { GestureHandlerRootView, PinchGestureHandler } from 'react-native-gesture-handler';
import { recordScan } from '../firestoreService/scanStatsService';
import { auth } from '../firebase';
import { 
  isGuestUser, 
  hasGuestReachedLimit, 
  incrementGuestScanCount,
  getGuestRemainingScans 
} from '../utils/guestScanUtils';

const GOOGLE_VISION_API_KEY = 'AIzaSyCRdWSqZJJcL1PfXK2gBEZzgmN_RqRahGw';

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashMode, setFlashMode] = useState('off');
  const [zoom, setZoom] = useState(0);
  const [autofocus, setAutofocus] = useState('on');
  const cameraRef = useRef(null);

  const onCameraReady = () => setIsCameraReady(true);

  const toggleFlash = () => {
    if (flashMode === 'off') {
      setFlashMode('on');
    } else if (flashMode === 'on') {
      setFlashMode('auto');
    } else {
      setFlashMode('off');
    }
  };

  const toggleAutofocus = () => {
    setAutofocus(prev => prev === 'on' ? 'off' : 'on');
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 1));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0));
  };

  const getFlashIcon = () => {
    if (flashMode === 'off') return 'flash-off';
    if (flashMode === 'on') return 'flash';
    return 'flash-outline';
  };

  const handlePinchGesture = (event) => {
    const scale = event.nativeEvent.scale;
    
    if (scale > 1) {
      setZoom(prev => Math.min(prev + 0.02, 1));
    } else if (scale < 1) {
      setZoom(prev => Math.max(prev - 0.02, 0));
    }
  };

  const handleCapture = async () => {
    if (!isCameraReady || !cameraRef.current || isProcessing) {
      return;
    }

    const user = auth.currentUser;
    if (isGuestUser(user)) {
      const reachedLimit = await hasGuestReachedLimit();
      if (reachedLimit) {
        Alert.alert(
          "Oops! You've Reached Your Free Scan Limit",
          "You've used your 1 free scan as a guest. Sign up for more scans!",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "Sign Up", 
              onPress: () => navigation.navigate('SignUp'),
              style: "default"
            }
          ]
        );
        return;
      }
    }

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1.0,
        base64: true,
        skipProcessing: false,
        exif: true,
      });
      
      await analyzeImage(photo.base64, photo.uri);
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert("Error", "There was an issue capturing the photo.");
      setIsProcessing(false);
    }
  };

  const analyzeImage = async (base64Image, photoUri) => {
    try {
      console.log('🔍 Starting multi-stage identification...');
      
      const iNatResult = await tryVisualRecognition(base64Image);
      
      if (iNatResult && iNatResult.confidence >= 70) {
        console.log('✓ High confidence iNat match:', iNatResult);
        await processSuccessfulMatch(iNatResult, photoUri);
        return;
      }

      console.log('🔍 Running enhanced Google Vision analysis...');
      const visionResponse = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [
                { type: 'LABEL_DETECTION', maxResults: 20 },
                { type: 'WEB_DETECTION', maxResults: 15 },
                { type: 'IMAGE_PROPERTIES' },
                { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
              ],
            },
          ],
        },
        { timeout: 20000 }
      );

      const visionData = visionResponse?.data?.responses?.[0] || {};
      
      const candidates = extractBestCandidates(visionData);
      
      if (candidates.length === 0) {
        Alert.alert("No Results", "Could not identify the species. Please try again with:\n• Better lighting\n• Closer focus\n• Clear view of key features");
        setIsProcessing(false);
        return;
      }

      console.log('🎯 Top candidates:', candidates.slice(0, 5).join(', '));

      const matchResult = await findBestINaturalistMatch(candidates, iNatResult);

      if (!matchResult) {
        Alert.alert(
          "No Match Found", 
          `Detected possible "${candidates[0]}" but couldn't confirm species. Try:\n• Capturing from a different angle\n• Getting closer to the subject\n• Ensuring good lighting`
        );
        setIsProcessing(false);
        return;
      }

      await processSuccessfulMatch(matchResult, photoUri);
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      setIsProcessing(false);
      Alert.alert("Error", "Could not analyze the image. Please check your internet connection and try again.");
    }
  };

  // ENHANCED CANDIDATE EXTRACTION
  const extractBestCandidates = (visionData) => {
    const labels = visionData.labelAnnotations || [];
    const webEntities = visionData.webDetection?.webEntities || [];
    const webLabels = visionData.webDetection?.bestGuessLabels || [];
    const objects = visionData.localizedObjectAnnotations || [];

    // Only filter truly generic/useless terms
    const genericTerms = new Set([
      'photo', 'image', 'picture', 'camera', 'photography', 'snapshot',
      'outdoor', 'natural', 'environment', 'view', 'scene', 'landscape',
      'closeup', 'close-up', 'macro', 'detail', 'background', 'foreground',
      'blur', 'focus', 'shallow', 'depth', 'subject', 'specimen'
    ]);

    // Specific identifiable groups (keep these as candidates!)
    const specificGroups = new Set([
      'plant', 'animal', 'insect', 'bird', 'tree', 'flower', 'mushroom',
      'fish', 'reptile', 'mammal', 'butterfly', 'beetle', 'spider',
      'amphibian', 'arthropod', 'invertebrate', 'vertebrate', 'fungus',
      'herb', 'shrub', 'moss', 'lichen', 'fern', 'rodent', 'lizard',
      'snake', 'frog', 'toad', 'turtle', 'crab', 'moth', 'bee', 'wasp',
      'dragonfly', 'damselfly', 'orchid', 'succulent', 'cactus', 'palm',
      'vine', 'weed', 'wildflower', 'seedling', 'sapling', 'carnivore',
      'herbivore', 'predator', 'prey', 'pollinator'
    ]);

    // Words that indicate specificity (boost these)
    const specificityIndicators = new Set([
      'species', 'leaf', 'petal', 'wing', 'feather', 'scale', 'fur',
      'botanical', 'flowering', 'evergreen', 'deciduous', 'coniferous',
      'perennial', 'annual', 'aquatic', 'terrestrial', 'arboreal'
    ]);

    const candidates = new Map();

    // Process web guess labels (highest priority)
    webLabels.forEach(item => {
      const text = (item.label || '').trim();
      if (text && text.length > 2 && !genericTerms.has(text.toLowerCase())) {
        candidates.set(text.toLowerCase(), {
          text: text,
          score: 100,
          source: 'web_guess',
          confidence: 0.95
        });
      }
    });

    // Process web entities
    webEntities.forEach(item => {
      const text = (item.description || '').trim();
      const score = (item.score || 0) * 100;
      if (text && text.length > 2 && !genericTerms.has(text.toLowerCase())) {
        const existing = candidates.get(text.toLowerCase());
        const finalScore = score + 80;
        
        if (!existing || existing.score < finalScore) {
          candidates.set(text.toLowerCase(), {
            text: text,
            score: finalScore,
            source: 'web_entity',
            confidence: Math.min((item.score || 0) + 0.3, 1)
          });
        }
      }
    });

    // Process object localization
    objects.forEach(item => {
      const text = (item.name || '').trim();
      const score = (item.score || 0) * 100;
      if (text && text.length > 2 && !genericTerms.has(text.toLowerCase())) {
        const existing = candidates.get(text.toLowerCase());
        const finalScore = score + 70;
        
        if (!existing || existing.score < finalScore) {
          candidates.set(text.toLowerCase(), {
            text: text,
            score: finalScore,
            source: 'object',
            confidence: item.score || 0
          });
        }
      }
    });

    // Process labels with enhanced scoring
    labels.forEach(item => {
      const text = (item.description || '').trim();
      const score = (item.score || 0) * 100;
      const lower = text.toLowerCase();
      
      if (text && text.length > 2 && !genericTerms.has(lower)) {
        let adjustedScore = score;
        let confidence = item.score || 0;
        
        // MAJOR BOOST for scientific name pattern (Genus species)
        if (/^[A-Z][a-z]+\s+[a-z]+/.test(text)) {
          adjustedScore *= 3.5;
          confidence = Math.min(confidence * 1.4, 1);
        }
        // Boost for multi-word specific names (common names like "Monarch Butterfly")
        else if (text.includes(' ') && text.split(' ').length <= 4) {
          const words = text.split(' ');
          const hasCapitalizedWords = words.every(w => /^[A-Z]/.test(w));
          if (hasCapitalizedWords) {
            adjustedScore *= 2.0;
            confidence *= 1.2;
          } else {
            adjustedScore *= 1.3;
          }
        }
        
        // Boost for specific group terms
        if (specificGroups.has(lower)) {
          adjustedScore *= 1.4;
        }
        
        // Boost for specificity indicators
        if (Array.from(specificityIndicators).some(kw => lower.includes(kw))) {
          adjustedScore *= 1.3;
          confidence *= 1.1;
        }
        
        // Reduce score for very short generic terms
        if (text.length < 4 && !specificGroups.has(lower)) {
          adjustedScore *= 0.6;
        }

        const existing = candidates.get(lower);
        if (!existing || existing.score < adjustedScore) {
          candidates.set(lower, {
            text: text,
            score: adjustedScore,
            source: 'label',
            confidence: Math.min(confidence, 0.95)
          });
        }
      }
    });

    // Sort by score and confidence
    const sortedCandidates = Array.from(candidates.values())
      .sort((a, b) => {
        const scoreComparison = b.score - a.score;
        if (Math.abs(scoreComparison) > 10) return scoreComparison;
        return b.confidence - a.confidence;
      })
      .map(c => c.text);

    console.log('📋 Extracted candidates:', 
      sortedCandidates.slice(0, 10).map((name, idx) => {
        const cand = candidates.get(name.toLowerCase());
        return `${idx + 1}. ${name} (${Math.round(cand.score)}, ${(cand.confidence * 100).toFixed(0)}%)`;
      }).join(' | ')
    );

    return sortedCandidates;
  };

  // ENHANCED VISUAL RECOGNITION
  const tryVisualRecognition = async (base64Image, retryCount = 0) => {
    try {
      const response = await axios.post(
        'https://api.inaturalist.org/v1/computervision/score_image',
        {
          image: base64Image,
        },
        { 
          timeout: 18000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const results = response?.data?.results || [];
      
      if (results.length > 0) {
        const topResults = results.slice(0, 10).map(r => ({
          taxonId: r.taxon.id,
          name: r.taxon.name,
          commonName: r.taxon.preferred_common_name,
          confidence: Math.round(r.score * 100),
          rank: r.taxon.rank,
          score: r.score,
        }));

        console.log('📷 iNat CV Results:', topResults.slice(0, 5).map(r => 
          `${r.name}${r.commonName ? ` (${r.commonName})` : ''} - ${r.confidence}% [${r.rank}]`
        ).join(' | '));

        // HIGH CONFIDENCE SPECIES - Use immediately
        if (topResults[0].confidence >= 70 && topResults[0].rank === 'species') {
          console.log('✓ High confidence species match from iNat CV');
          return topResults[0];
        }

        // GOOD CONFIDENCE SPECIES - Use with caution
        if (topResults[0].rank === 'species' && topResults[0].confidence >= 50) {
          console.log('✓ Good confidence species match from iNat CV');
          return topResults[0];
        }

        // LOOK FOR SPECIES IN TOP 10 (even if first result is higher taxon)
        const speciesResult = topResults.find(r => 
          r.rank === 'species' && r.confidence >= 40
        );
        if (speciesResult) {
          console.log(`✓ Found species in top results: ${speciesResult.name} (${speciesResult.confidence}%)`);
          return speciesResult;
        }

        // SUBSPECIES/VARIETY as fallback
        const subspeciesResult = topResults.find(r => 
          (r.rank === 'subspecies' || r.rank === 'variety') && r.confidence >= 45
        );
        if (subspeciesResult) {
          console.log(`✓ Found subspecies/variety: ${subspeciesResult.name} (${subspeciesResult.confidence}%)`);
          return subspeciesResult;
        }

        // Return top result even if genus (will be used as fallback)
        console.log(`⚠ Using top result as fallback: ${topResults[0].name} [${topResults[0].rank}] (${topResults[0].confidence}%)`);
        return topResults[0];
      }
    } catch (error) {
      console.warn('⚠ Visual recognition attempt failed:', error.message);
      if (retryCount === 0) {
        console.log('🔄 Retrying visual recognition...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        return tryVisualRecognition(base64Image, 1);
      }
    }
    return null;
  };

  // ENHANCED iNATURALIST MATCHING
  const findBestINaturalistMatch = async (possibleNames, iNatFallback) => {
    const matches = [];
    const searchedTerms = new Set();
    
    // Prioritize first 20 candidates for better coverage
    const candidatesToSearch = possibleNames.slice(0, 20);

    for (const name of candidatesToSearch) {
      const normalized = name.toLowerCase().trim();
      if (searchedTerms.has(normalized)) continue;
      searchedTerms.add(normalized);

      try {
        // Fetch more results per query for better matching
        const response = await axios.get(
          `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(name)}&per_page=15`,
          { timeout: 8000 }
        );
        
        const results = response?.data?.results || [];
        
        for (const result of results) {
          if (!result.id || !result.name) continue;

          const resultNameLower = result.name.toLowerCase();
          const commonNameLower = result.preferred_common_name?.toLowerCase() || '';
          const isExactMatch = resultNameLower === normalized;
          const isCommonNameMatch = commonNameLower === normalized;
          const matchedTermLower = result.matched_term?.toLowerCase() || '';
          const isMatchedTermExact = matchedTermLower === normalized;
          
          // Check for partial matches
          const scientificNameContains = resultNameLower.includes(normalized) && normalized.length > 4;
          const commonNameContains = commonNameLower.includes(normalized) && normalized.length > 4;
          const searchTermContains = normalized.includes(resultNameLower.split(' ')[0]) && resultNameLower.split(' ')[0].length > 3;
          
          let score = 20;

          // EXACT MATCHES get highest priority
          if (isExactMatch) score += 80;
          else if (isCommonNameMatch) score += 75;
          else if (isMatchedTermExact) score += 70;
          else if (scientificNameContains) score += 45;
          else if (commonNameContains) score += 40;
          else if (searchTermContains) score += 30;
          else score += 10; // Base score for any match

          // CRITICAL: Strong preference for species and subspecies
          if (result.rank === 'species') score += 50;
          else if (result.rank === 'subspecies' || result.rank === 'variety') score += 40;
          else if (result.rank === 'genus') score += 10;
          else if (result.rank === 'family') score -= 10;
          else if (result.rank === 'order' || result.rank === 'class') score -= 20;

          // Photo availability (indicates well-documented species)
          if (result.default_photo?.medium_url) score += 25;

          // Observation count scoring (indicates common/well-known species)
          const obsCount = result.observations_count || 0;
          if (obsCount > 100000) score += 35;
          else if (obsCount > 50000) score += 30;
          else if (obsCount > 10000) score += 25;
          else if (obsCount > 5000) score += 20;
          else if (obsCount > 1000) score += 15;
          else if (obsCount > 500) score += 12;
          else if (obsCount > 100) score += 10;
          else if (obsCount > 10) score += 5;
          else if (obsCount < 5) score -= 5; // Penalize very rare species

          // Atlas data indicates well-documented species
          if (result.atlas_id) score += 15;

          // Iconic taxon reliability boost
          if (result.iconic_taxon_name && result.iconic_taxon_name !== 'Unknown') score += 8;

          // Boost for active taxa (recently observed)
          if (result.is_active !== false) score += 5;

          matches.push({
            taxonId: result.id,
            name: result.name,
            commonName: result.preferred_common_name,
            score: score,
            rank: result.rank,
            obsCount: obsCount,
            searchTerm: name,
            matchQuality: isExactMatch ? 'exact' : isCommonNameMatch ? 'common' : scientificNameContains || commonNameContains ? 'partial' : 'weak',
          });
        }

        await new Promise(resolve => setTimeout(resolve, 250));
        
      } catch (error) {
        console.warn(`Failed to match "${name}":`, error.message);
        continue;
      }
    }
    
    if (matches.length === 0 && iNatFallback) {
      console.warn('No iNat matches found, using iNat fallback:', iNatFallback.name);
      return {
        taxonId: iNatFallback.taxonId,
        name: iNatFallback.name,
        confidence: iNatFallback.confidence,
      };
    }

    if (matches.length === 0) {
      console.error('No matches found after searching candidates');
      return null;
    }
    
    // PRIORITIZE species-level matches
    const speciesMatches = matches.filter(m => 
      m.rank === 'species' || m.rank === 'subspecies' || m.rank === 'variety'
    );
    
    // Only use non-species if we have NO species matches
    const bestMatches = speciesMatches.length > 0 ? speciesMatches : matches;
    
    bestMatches.sort((a, b) => {
      // Primary sort by score
      if (b.score !== a.score) return b.score - a.score;
      
      // Secondary sort by match quality
      const qualityOrder = { exact: 4, common: 3, partial: 2, weak: 1 };
      const qualityDiff = (qualityOrder[b.matchQuality] || 0) - (qualityOrder[a.matchQuality] || 0);
      if (qualityDiff !== 0) return qualityDiff;
      
      // Tertiary sort by observation count
      return b.obsCount - a.obsCount;
    });
    
    const bestMatch = bestMatches[0];
    
    let confidence = Math.min(bestMatch.score * 0.9, 95);
    
    // Boost confidence if iNat CV also identified the same species
    if (iNatFallback && iNatFallback.name === bestMatch.name) {
      confidence = Math.min((confidence + iNatFallback.confidence) / 2 + 20, 98);
    }
    
    // Adjust confidence based on match quality
    if (bestMatch.matchQuality === 'exact' || bestMatch.matchQuality === 'common') {
      confidence = Math.min(confidence * 1.1, 97);
    } else if (bestMatch.matchQuality === 'weak' && confidence > 70) {
      confidence *= 0.75;
    } else if (bestMatch.matchQuality === 'partial' && confidence > 75) {
      confidence *= 0.85;
    }
    
    // Reduce confidence for higher-level taxa
    if (bestMatch.rank === 'genus') {
      confidence *= 0.8;
    } else if (bestMatch.rank === 'family' || bestMatch.rank === 'order') {
      confidence *= 0.65;
    }

    console.log(`✓ Best match: ${bestMatch.name} (${bestMatch.commonName || 'no common name'}) | Rank: ${bestMatch.rank} | Obs: ${bestMatch.obsCount.toLocaleString()} | Quality: ${bestMatch.matchQuality} | Score: ${bestMatch.score} | Confidence: ${Math.round(confidence)}%`);
    
    return {
      taxonId: bestMatch.taxonId,
      name: bestMatch.name,
      commonName: bestMatch.commonName,
      confidence: Math.round(confidence),
    };
  };

  const processSuccessfulMatch = async (matchResult, photoUri) => {
    const [taxonDetails, gbifData, obsCount] = await Promise.all([
      fetchTaxonDetails(matchResult.taxonId),
      fetchGBIF(matchResult.name),
      fetchObservationCount(matchResult.taxonId),
    ]);

    const user = auth.currentUser;
    
    if (isGuestUser(user)) {
      await incrementGuestScanCount();
      const remaining = await getGuestRemainingScans();
      
      console.log(`ℹ️ Guest scan completed. Remaining scans: ${remaining}`);
      
      if (remaining === 0) {
        setTimeout(() => {
          Alert.alert(
            "🎉 Oops! You've Reached Your Free Scan Limit",
            "Want more scans? Sign up now!",
            [
              { text: "Maybe Later", style: "cancel" },
              { 
                text: "Sign Up Now", 
                onPress: () => navigation.navigate('SignUp'),
              }
            ]
          );
        }, 2000);
      }
    } 
    else if (user) {
      try {
        // Record scan stats
        await recordScan(user.uid, {
          speciesName: matchResult.name,
          plantName: matchResult.commonName || matchResult.name,
          confidence: matchResult.confidence,
          taxonId: matchResult.taxonId,
          scanType: 'camera',
        });
        console.log('✅ Scan recorded for user:', user.uid);
        
        // Increment global observation count
        const { addToHistory, incrementGlobalObservation } = require('../firestoreService');
        const globalObsResult = await incrementGlobalObservation({
          taxonId: matchResult.taxonId,
          name: matchResult.name,
          scientificName: matchResult.name,
          commonName: matchResult.commonName,
        });
        
        // Add to history with deduplication - INCLUDE ALL RELEVANT DATA
        await addToHistory(user.uid, {
          plantName: matchResult.commonName || matchResult.name,
          name: matchResult.name,
          scientificName: matchResult.name,
          commonName: matchResult.commonName,
          taxonId: matchResult.taxonId, // CRITICAL for deduplication
          rank: taxonDetails?.rank,
          iconicTaxon: taxonDetails?.iconic_taxon_name,
          imageUri: photoUri, // Local URI for upload
          imageUrl: taxonDetails?.default_photo?.medium_url,
          conservation: gbifData?.threatStatus,
          about: taxonDetails?.wikipedia_summary,
          iNatObsCount: obsCount,
          globalObsCount: globalObsResult.success ? globalObsResult.count : 0,
          type: 'history',
        });
        console.log('✅ Added to history with deduplication');
        
      } catch (error) {
        console.warn('⚠️ Failed to record scan or add to history:', error);
      }
    }

    setIsProcessing(false);
    navigation.navigate('SpeciesLandingPage', {
      photoUri: photoUri,
      speciesData: gbifData,
      iNaturalistData: taxonDetails,
      iNatObsCount: obsCount,
      confidence: matchResult.confidence,
    });
  };

  const fetchTaxonDetails = async (taxonId) => {
    try {
      const response = await axios.get(
        `https://api.inaturalist.org/v1/taxa/${taxonId}`,
        { timeout: 6000 }
      );
      return response?.data?.results?.[0] || null;
    } catch (error) {
      console.error('Failed to fetch taxon details:', error);
      return null;
    }
  };

  const fetchGBIF = async (speciesName) => {
    try {
      const response = await axios.get(
        `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(speciesName)}`,
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      console.warn('GBIF fetch failed:', error.message);
      return null;
    }
  };

  const fetchObservationCount = async (taxonId) => {
    try {
      const response = await axios.get(
        `https://api.inaturalist.org/v1/observations?taxon_id=${taxonId}&per_page=1`,
        { timeout: 4000 }
      );
      return response?.data?.total_results ?? 0;
    } catch (error) {
      console.warn('Observation count fetch failed:', error.message);
      return 0;
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>We need your permission to show the camera</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PinchGestureHandler onGestureEvent={handlePinchGesture}>
        <View style={styles.container}>
          <CameraView
            style={styles.camera}
            facing="back"
            ref={cameraRef}
            onCameraReady={onCameraReady}
            enableTorch={flashMode === 'on'}
            zoom={zoom}
            autofocus={autofocus}
          />

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.rightControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={toggleFlash}
            >
              <Ionicons name={getFlashIcon()} size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, { marginTop: 10 }]}
              onPress={toggleAutofocus}
            >
              <Ionicons 
                name={autofocus === 'on' ? 'scan' : 'scan-outline'} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.zoomContainer}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomOut}
            >
              <Ionicons name="remove" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.zoomDisplay}>
              <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
            </View>

            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomIn}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <Text style={styles.scanText}>Scan Species</Text>

          {isProcessing && (
            <View style={styles.processingOverlay}>
              <View style={styles.processingCard}>
                <ActivityIndicator size="large" color="#5E936C" />
                <Text style={styles.processingText}>Analyzing...</Text>
                <Text style={styles.processingSubtext}>Identifying species</Text>
              </View>
            </View>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, (!isCameraReady || isProcessing) && styles.buttonDisabled]}
              onPress={handleCapture}
              disabled={!isCameraReady || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size={32} color="#666" />
              ) : (
                <Ionicons name="camera" size={32} color={isCameraReady ? '#000' : '#666'} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </PinchGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  camera: { flex: 1, width: '100%' },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 25,
    zIndex: 10,
  },
  rightControls: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  controlButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 25,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomContainer: {
    position: 'absolute',
    left: 20,
    bottom: 120,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 40,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  zoomDisplay: {
    width: 40,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scanFrame: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    right: '15%',
    height: '30%',
    zIndex: 1,
  },
  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: '#fff',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 10,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 10,
  },
  scanText: {
    position: 'absolute',
    top: '64%',
    alignSelf: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    zIndex: 1,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  processingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  processingText: {
    color: '#1a2e1b',
    fontSize: 20,
    marginTop: 15,
    fontWeight: '700',
  },
  processingSubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
    fontWeight: '500',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    height: 70,
    width: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonDisabled: { backgroundColor: '#ccc', opacity: 0.6 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  loadingText: { color: '#fff', fontSize: 18, textAlign: 'center' },
  permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', paddingHorizontal: 20 },
  permissionText: { color: '#fff', fontSize: 18, textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  permissionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  permissionButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});