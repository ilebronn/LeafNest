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
import { getUserSubscription, decrementScanCount, getUsageLimits } from '../firestoreService/subscriptionService';
import PremiumGate from '../components/PremiumGate';

const PLANTNET_API_KEY = '2b109zcNM9jXCMPmFijjfnTCtu';
const GOOGLE_VISION_API_KEY = 'AIzaSyCRdWSqZJJcL1PfXK2gBEZzgmN_RqRahGw';

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashMode, setFlashMode] = useState('off');
  const [zoom, setZoom] = useState(0);
  const [autofocus, setAutofocus] = useState('on');
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [usageLimits, setUsageLimits] = useState(null);
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

  const checkScanLimit = async () => {
    const user = auth.currentUser;
    if (!user) return true; // Allow guest scan

    try {
      const limits = await getUsageLimits(user.uid);
      setUsageLimits(limits);

      // Premium users have unlimited
      if (limits.unlimited) {
        return true;
      }

      // Check if free user has scans remaining
      if (limits.scansRemaining <= 0) {
        setShowPremiumGate(true);
        return false;
      }

      // Decrement scan count
      await decrementScanCount(user.uid);
      return true;
    } catch (error) {
      console.error('Error checking scan limit:', error);
      return true; // Allow on error
    }
  };

  const handleCapture = async () => {
    if (!isCameraReady || !cameraRef.current || isProcessing) {
      return;
    }

    // ✅ CHECK SCAN LIMIT
    const canScan = await checkScanLimit();
    if (!canScan) {
      return; // Premium gate will be shown
    }

    setIsProcessing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7, // Reduced quality to prevent 413 errors
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
      console.log('🔍 Starting species identification...');
      
      // Step 1: Use Google Vision to get possible species names
      console.log('🔍 Analyzing with Google Vision...');
      const visionResponse = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`,
        {
          requests: [
            {
              image: { content: base64Image },
              features: [
                { type: 'LABEL_DETECTION', maxResults: 20 },
                { type: 'WEB_DETECTION', maxResults: 15 },
              ],
            },
          ],
        },
        { timeout: 15000 }
      );

      const visionData = visionResponse?.data?.responses?.[0] || {};
      const candidates = extractCandidates(visionData);
      
      if (candidates.length === 0) {
        Alert.alert(
          "Unidentified Species",
          "Could not identify the species. Our study focuses on plants and animals only.\n\nPlease ensure:\n• Clear view of the subject\n• Good lighting\n• Subject is a plant or animal"
        );
        setIsProcessing(false);
        return;
      }

      console.log('🎯 Top candidates:', candidates.slice(0, 5).join(', '));

      // Step 2: Detect category to choose API
      const category = detectCategoryFromLabels(visionData);
      console.log('📋 Detected category:', category);

      // Check if it's actually a plant or animal
      const isValidSubject = isPlantOrAnimal(visionData);
      if (!isValidSubject) {
        Alert.alert(
          "Unidentified Species",
          "The image does not appear to be a plant or animal.\n\nOur study focuses on plants and animals only. Please scan:\n• Plants (flowers, trees, herbs, etc.)\n• Animals (birds, insects, mammals, etc.)"
        );
        setIsProcessing(false);
        return;
      }

      let result = null;

      // Step 3: Try specialized API first, then fallback to iNaturalist search
      if (category === 'plant') {
        console.log('🌿 Trying PlantNet API for plant identification...');
        result = await identifyWithPlantNet(photoUri);
      }
      
      // If PlantNet failed or it's an animal, search iNaturalist by name
      if (!result) {
        console.log('🔍 Searching iNaturalist database...');
        result = await searchINaturalistByNames(candidates);
      }

      if (!result) {
        Alert.alert(
          "Unidentified Species", 
          "Could not identify this species. Our study focuses on plants and animals only.\n\nTips:\n• Try a different angle\n• Ensure better lighting\n• Get closer to the subject\n• Make sure it's a recognizable plant or animal"
        );
        setIsProcessing(false);
        return;
      }

      await processSuccessfulMatch(result, photoUri);
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      setIsProcessing(false);
      Alert.alert("Error", "Could not analyze the image. Please check your internet connection and try again.");
    }
  };

  // Check if image contains plant or animal
  const isPlantOrAnimal = (visionData) => {
    const labels = visionData.labelAnnotations || [];
    
    const plantAnimalKeywords = [
      'plant', 'flower', 'tree', 'leaf', 'grass', 'herb', 'shrub', 'vegetation', 'flora', 
      'botanical', 'animal', 'bird', 'insect', 'fish', 'mammal', 'reptile', 'amphibian', 
      'wildlife', 'fauna', 'creature', 'pet', 'butterfly', 'beetle', 'spider', 'organism',
      'species', 'living', 'nature', 'wing', 'feather', 'fur', 'petal', 'stem', 'root'
    ];

    const irrelevantKeywords = [
      'person', 'people', 'human', 'man', 'woman', 'child', 'face', 'hand', 'building', 
      'architecture', 'car', 'vehicle', 'furniture', 'food', 'dish', 'meal', 'object',
      'tool', 'device', 'machine', 'electronics', 'clothing', 'indoor', 'room'
    ];

    let relevantScore = 0;
    let irrelevantScore = 0;

    for (const label of labels) {
      const desc = label.description.toLowerCase();
      const score = label.score || 0;

      if (plantAnimalKeywords.some(kw => desc.includes(kw))) {
        relevantScore += score;
      }
      if (irrelevantKeywords.some(kw => desc.includes(kw))) {
        irrelevantScore += score;
      }
    }

    console.log(`🔍 Subject validation - Relevant: ${relevantScore.toFixed(2)}, Irrelevant: ${irrelevantScore.toFixed(2)}`);

    // Must have significant plant/animal content and low irrelevant content
    return relevantScore > 0.5 && relevantScore > irrelevantScore;
  };

  // Extract candidates from Google Vision
  const extractCandidates = (visionData) => {
    const labels = visionData.labelAnnotations || [];
    const webEntities = visionData.webDetection?.webEntities || [];
    const webLabels = visionData.webDetection?.bestGuessLabels || [];

    const genericTerms = new Set([
      'photo', 'image', 'picture', 'camera', 'photography', 
      'outdoor', 'natural', 'environment', 'view', 'scene',
    ]);

    const candidates = new Set();

    // Add web guess labels (highest priority)
    webLabels.forEach(item => {
      const text = (item.label || '').trim();
      if (text && text.length > 2 && !genericTerms.has(text.toLowerCase())) {
        candidates.add(text);
      }
    });

    // Add web entities
    webEntities.forEach(item => {
      const text = (item.description || '').trim();
      if (text && text.length > 2 && !genericTerms.has(text.toLowerCase())) {
        candidates.add(text);
      }
    });

    // Add labels
    labels.forEach(item => {
      const text = (item.description || '').trim();
      if (text && text.length > 2 && !genericTerms.has(text.toLowerCase())) {
        candidates.add(text);
      }
    });

    return Array.from(candidates).slice(0, 15);
  };

  // Detect category from labels
  const detectCategoryFromLabels = (visionData) => {
    const labels = visionData.labelAnnotations || [];
    
    const plantKeywords = ['plant', 'flower', 'tree', 'leaf', 'grass', 'herb', 'shrub', 
      'vegetation', 'flora', 'botanical', 'foliage', 'petal'];
    
    const animalKeywords = ['animal', 'bird', 'insect', 'fish', 'mammal', 'reptile', 
      'amphibian', 'wildlife', 'fauna'];

    let plantScore = 0;
    let animalScore = 0;

    for (const label of labels) {
      const desc = label.description.toLowerCase();
      const score = label.score || 0;

      if (plantKeywords.some(kw => desc.includes(kw))) {
        plantScore += score;
      }
      if (animalKeywords.some(kw => desc.includes(kw))) {
        animalScore += score;
      }
    }

    return plantScore > animalScore ? 'plant' : 'animal';
  };

  // PlantNet API identification - uses image file URI instead of base64
  const identifyWithPlantNet = async (photoUri) => {
    try {
      console.log('📤 Uploading to PlantNet...');
      
      // Create proper FormData for React Native with file URI
      const formData = new FormData();
      
      // Use the actual file URI from the captured photo
      formData.append('images', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'plant.jpg',
      });

      const response = await axios.post(
        `https://my-api.plantnet.org/v2/identify/all?api-key=${PLANTNET_API_KEY}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        }
      );

      const results = response?.data?.results || [];
      
      if (results.length === 0) {
        console.warn('PlantNet returned no results');
        return null;
      }

      const topResult = results[0];
      const confidence = Math.round(topResult.score * 100);

      console.log(`✓ PlantNet match: ${topResult.species.scientificNameWithoutAuthor} (${confidence}%)`);

      // Get additional details from iNaturalist for consistency
      const taxonDetails = await searchINaturalistByName(topResult.species.scientificNameWithoutAuthor);

      return {
        taxonId: taxonDetails?.id || null,
        name: topResult.species.scientificNameWithoutAuthor,
        commonName: topResult.species.commonNames?.[0] || taxonDetails?.preferred_common_name || null,
        confidence: confidence,
        source: 'plantnet',
      };
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error('PlantNet identification failed:', error.response?.status, errorMsg);
      
      // If it's a "Species not found" error, the image might not be a plant
      if (error.response?.status === 404 && errorMsg.includes('Species not found')) {
        console.warn('⚠️ PlantNet could not identify - may not be a plant or image quality issue');
      }
      
      // Fallback to iNaturalist search
      console.log('🔄 Falling back to iNaturalist search...');
      return null;
    }
  };

  // Search iNaturalist by multiple candidate names
  const searchINaturalistByNames = async (candidateNames) => {
    const matches = [];
    
    for (const name of candidateNames.slice(0, 10)) {
      try {
        const response = await axios.get(
          `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(name)}&per_page=5`,
          { timeout: 8000 }
        );
        
        const results = response?.data?.results || [];
        
        for (const result of results) {
          if (!result.id || !result.name) continue;

          const resultNameLower = result.name.toLowerCase();
          const commonNameLower = result.preferred_common_name?.toLowerCase() || '';
          const nameLower = name.toLowerCase();
          
          let score = 10;

          // Exact matches get highest priority
          if (resultNameLower === nameLower) score += 80;
          else if (commonNameLower === nameLower) score += 70;
          else if (resultNameLower.includes(nameLower)) score += 40;
          else if (commonNameLower.includes(nameLower)) score += 30;

          // Prefer species level
          if (result.rank === 'species') score += 50;
          else if (result.rank === 'subspecies') score += 40;
          else if (result.rank === 'genus') score += 10;

          // Boost by observation count
          const obsCount = result.observations_count || 0;
          if (obsCount > 10000) score += 30;
          else if (obsCount > 1000) score += 20;
          else if (obsCount > 100) score += 10;

          if (result.default_photo?.medium_url) score += 15;

          matches.push({
            taxonId: result.id,
            name: result.name,
            commonName: result.preferred_common_name,
            score: score,
            rank: result.rank,
            obsCount: obsCount,
          });
        }

        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.warn(`Failed to search "${name}":`, error.message);
        continue;
      }
    }
    
    if (matches.length === 0) {
      console.error('No matches found in iNaturalist');
      return null;
    }
    
    // Sort by score
    matches.sort((a, b) => b.score - a.score);
    
    const bestMatch = matches[0];
    const confidence = Math.min(bestMatch.score * 0.85, 95);
    
    console.log(`✓ Best match: ${bestMatch.name} (${bestMatch.commonName || 'no common name'}) | Rank: ${bestMatch.rank} | Confidence: ${Math.round(confidence)}%`);
    
    return {
      taxonId: bestMatch.taxonId,
      name: bestMatch.name,
      commonName: bestMatch.commonName,
      confidence: Math.round(confidence),
      source: 'inaturalist_search',
    };
  };

  // Search iNaturalist by scientific name (helper function)
  const searchINaturalistByName = async (scientificName) => {
    try {
      const response = await axios.get(
        `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(scientificName)}&per_page=1`,
        { timeout: 8000 }
      );
      
      return response?.data?.results?.[0] || null;
    } catch (error) {
      console.warn('iNaturalist name search failed:', error.message);
      return null;
    }
  };

  const processSuccessfulMatch = async (matchResult, photoUri) => {
    const [taxonDetails, gbifData, obsCount] = await Promise.all([
      matchResult.taxonId ? fetchTaxonDetails(matchResult.taxonId) : Promise.resolve(null),
      fetchGBIF(matchResult.name),
      matchResult.taxonId ? fetchObservationCount(matchResult.taxonId) : Promise.resolve(0),
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
        
        // Add this before calling addToHistory
        const debugAuth = async () => {
          const user = auth.currentUser;
          console.log('========== AUTH DEBUG ==========');
          console.log('User exists?', !!user);
          console.log('User UID:', user?.uid);
          console.log('User email:', user?.email);

          if (user) {
            try {
              const token = await user.getIdToken(true); // Force refresh
              console.log('Auth token (first 50 chars):', token.substring(0, 50));
            } catch (e) {
              console.error('Failed to get token:', e);
            }
          }
          console.log('================================');
        };

        await debugAuth();

        // Add to history with deduplication
        await addToHistory(user.uid, {
          plantName: matchResult.commonName || matchResult.name,
          name: matchResult.name,
          scientificName: matchResult.name,
          commonName: matchResult.commonName,
          taxonId: matchResult.taxonId,
          rank: taxonDetails?.rank,
          iconicTaxon: taxonDetails?.iconic_taxon_name,
          imageUri: photoUri,
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

          <PremiumGate
            visible={showPremiumGate}
            onClose={() => setShowPremiumGate(false)}
            onUpgrade={() => {
              setShowPremiumGate(false);
              navigation.navigate('PlanScreen');
            }}
            limitType="scan"
            hoursUntilReset={usageLimits?.hoursUntilReset || 0}
            scansRemaining={usageLimits?.scansRemaining || 0}
            downloadsRemaining={usageLimits?.downloadsRemaining || 0}
          />

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