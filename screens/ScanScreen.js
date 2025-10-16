import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { GestureHandlerRootView, PinchGestureHandler } from 'react-native-gesture-handler';
// ✅ ADD THESE IMPORTS
import { recordScan } from '../firestoreService/scanStatsService';
import { auth } from '../firebase';

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
      console.log('Starting multi-stage identification...');
      
      const iNatResult = await tryVisualRecognition(base64Image);
      
      if (iNatResult && iNatResult.confidence >= 70) {
        console.log('High confidence iNat match:', iNatResult);
        await processSuccessfulMatch(iNatResult, photoUri);
        return;
      }

      console.log('Running enhanced Google Vision analysis...');
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

      console.log('Top candidates:', candidates.slice(0, 5));

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

  const extractBestCandidates = (visionData) => {
    const labels = visionData.labelAnnotations || [];
    const webEntities = visionData.webDetection?.webEntities || [];
    const webLabels = visionData.webDetection?.bestGuessLabels || [];
    const objects = visionData.localizedObjectAnnotations || [];

    const genericTerms = [
      'photo', 'image', 'picture', 'camera', 'photography', 'snapshot',
      'nature', 'wildlife', 'organism', 'outdoor', 'natural', 'environment',
      'wild', 'fauna', 'flora', 'ecosystem', 'view', 'scene', 'landscape',
      'closeup', 'close-up', 'macro', 'detail', 'background', 'foreground'
    ];

    const biologicalKeywords = [
      'species', 'plant', 'animal', 'insect', 'bird', 'tree', 'flower', 
      'mushroom', 'fish', 'reptile', 'mammal', 'butterfly', 'beetle',
      'spider', 'leaf', 'petal', 'wing', 'feather', 'scale', 'fur',
      'amphibian', 'arthropod', 'invertebrate', 'vertebrate', 'botanical'
    ];

    const candidates = new Map();

    webLabels.forEach(item => {
      const text = (item.label || '').trim();
      if (text && text.length > 2 && !genericTerms.includes(text.toLowerCase())) {
        candidates.set(text.toLowerCase(), {
          text: text,
          score: 100,
          source: 'web_guess'
        });
      }
    });

    webEntities.forEach(item => {
      const text = (item.description || '').trim();
      const score = (item.score || 0) * 100;
      if (text && text.length > 2 && !genericTerms.includes(text.toLowerCase())) {
        const existing = candidates.get(text.toLowerCase());
        if (!existing || existing.score < score + 80) {
          candidates.set(text.toLowerCase(), {
            text: text,
            score: score + 80,
            source: 'web_entity'
          });
        }
      }
    });

    objects.forEach(item => {
      const text = (item.name || '').trim();
      const score = (item.score || 0) * 100;
      if (text && text.length > 2 && !genericTerms.includes(text.toLowerCase())) {
        const existing = candidates.get(text.toLowerCase());
        if (!existing || existing.score < score + 60) {
          candidates.set(text.toLowerCase(), {
            text: text,
            score: score + 60,
            source: 'object'
          });
        }
      }
    });

    labels.forEach(item => {
      const text = (item.description || '').trim();
      const score = (item.score || 0) * 100;
      const lower = text.toLowerCase();
      
      if (text && text.length > 2 && !genericTerms.includes(lower)) {
        let adjustedScore = score;
        
        if (biologicalKeywords.some(kw => lower.includes(kw))) {
          adjustedScore *= 1.4;
        }
        
        if (/^[A-Z][a-z]+\s+[a-z]+/.test(text)) {
          adjustedScore *= 2.0;
        }
        
        if (text.includes(' ') && !biologicalKeywords.includes(lower)) {
          adjustedScore *= 1.3;
        }

        const existing = candidates.get(lower);
        if (!existing || existing.score < adjustedScore) {
          candidates.set(lower, {
            text: text,
            score: adjustedScore,
            source: 'label'
          });
        }
      }
    });

    const sortedCandidates = Array.from(candidates.values())
      .sort((a, b) => b.score - a.score)
      .map(c => c.text);

    return sortedCandidates;
  };

  const tryVisualRecognition = async (base64Image, retryCount = 0) => {
    try {
      const response = await axios.post(
        'https://api.inaturalist.org/v1/computervision/score_image',
        {
          image: base64Image,
        },
        { 
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const results = response?.data?.results || [];
      
      if (results.length > 0) {
        const topResults = results.slice(0, 3).map(r => ({
          taxonId: r.taxon.id,
          name: r.taxon.name,
          commonName: r.taxon.preferred_common_name,
          confidence: Math.round(r.score * 100),
          rank: r.taxon.rank,
        }));

        if (topResults[0].confidence >= 70) {
          return topResults[0];
        }

        if (topResults[0].rank === 'species' && topResults[0].confidence >= 50) {
          return topResults[0];
        }

        return topResults[0];
      }
    } catch (error) {
      console.warn('Visual recognition attempt failed:', error.message);
      if (retryCount === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return tryVisualRecognition(base64Image, 1);
      }
    }
    return null;
  };

  const findBestINaturalistMatch = async (possibleNames, iNatFallback) => {
    const matches = [];
    const searchedTerms = new Set();
    
    const candidatesToSearch = possibleNames.slice(0, 10);

    for (const name of candidatesToSearch) {
      const normalized = name.toLowerCase().trim();
      if (searchedTerms.has(normalized)) continue;
      searchedTerms.add(normalized);

      try {
        const response = await axios.get(
          `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(name)}&per_page=5`,
          { timeout: 6000 }
        );
        
        const results = response?.data?.results || [];
        
        for (const result of results) {
          if (!result.id || !result.name) continue;

          const resultNameLower = result.name.toLowerCase();
          const isExactMatch = resultNameLower === normalized;
          const isCommonNameMatch = result.preferred_common_name?.toLowerCase() === normalized;
          const matchedTermLower = result.matched_term?.toLowerCase() || '';
          const isMatchedTermExact = matchedTermLower === normalized;
          
          let score = 30;

          if (isExactMatch) score += 50;
          else if (isCommonNameMatch) score += 45;
          else if (isMatchedTermExact) score += 40;
          else if (resultNameLower.includes(normalized)) score += 25;
          else if (matchedTermLower.includes(normalized)) score += 20;

          if (result.rank === 'species') score += 30;
          else if (result.rank === 'subspecies') score += 25;
          else if (result.rank === 'genus') score += 15;
          else if (result.rank === 'family') score += 5;

          if (result.default_photo?.medium_url) score += 15;

          const obsCount = result.observations_count || 0;
          if (obsCount > 10000) score += 20;
          else if (obsCount > 1000) score += 15;
          else if (obsCount > 100) score += 10;
          else if (obsCount > 10) score += 5;

          if (result.atlas_id) score += 10;

          matches.push({
            taxonId: result.id,
            name: result.name,
            commonName: result.preferred_common_name,
            score: score,
            rank: result.rank,
            obsCount: obsCount,
            searchTerm: name,
          });
        }

        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        console.warn(`Failed to match "${name}":`, error.message);
        continue;
      }
    }
    
    if (matches.length === 0 && iNatFallback) {
      return {
        taxonId: iNatFallback.taxonId,
        name: iNatFallback.name,
        confidence: iNatFallback.confidence,
      };
    }

    if (matches.length === 0) return null;
    
    matches.sort((a, b) => b.score - a.score);
    
    const bestMatch = matches[0];
    
    let confidence = Math.min(bestMatch.score, 90);
    
    if (iNatFallback && iNatFallback.name === bestMatch.name) {
      confidence = Math.min((confidence + iNatFallback.confidence) / 2 + 10, 95);
    }

    console.log('Best match:', bestMatch.name, 'Score:', bestMatch.score, 'Confidence:', confidence);
    
    return {
      taxonId: bestMatch.taxonId,
      name: bestMatch.name,
      confidence: Math.round(confidence),
    };
  };

  // ✅ UPDATED FUNCTION - Record scan only for authenticated users
  const processSuccessfulMatch = async (matchResult, photoUri) => {
    const [taxonDetails, gbifData, obsCount] = await Promise.all([
      fetchTaxonDetails(matchResult.taxonId),
      fetchGBIF(matchResult.name),
      fetchObservationCount(matchResult.taxonId),
    ]);

    // ✅ Record scan ONLY for authenticated users (not guests)
    const user = auth.currentUser;
    if (user && user.email !== 'guest@leafnest.app') {
      try {
        await recordScan(user.uid, {
          speciesName: matchResult.name,
          plantName: matchResult.commonName || matchResult.name,
          confidence: matchResult.confidence,
          taxonId: matchResult.taxonId,
          scanType: 'camera',
        });
        console.log('✅ Scan recorded for user:', user.uid);
      } catch (error) {
        console.warn('⚠️ Failed to record scan:', error);
        // Don't block the user flow if recording fails
      }
    } else {
      console.log('ℹ️ Guest user - scan not recorded');
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