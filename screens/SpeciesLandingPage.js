import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ImageBackground, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { auth } from '../firebase';
import { addToHistory, addToFavorites, removeFromFavorites, isInFavorites } from '../firestoreService';
import axios from 'axios';

// Helper function to strip HTML tags and clean text thoroughly
const stripHtmlTags = (htmlString) => {
  if (!htmlString) return '';
  
  let cleaned = htmlString
    // Remove all HTML tags
    .replace(/<\/?[^>]+(>|$)/g, "")
    // Remove HTML entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, "")
    // Remove extra whitespace
    .replace(/\s+/g, " ")
    // Remove any remaining angle brackets
    .replace(/[<>]/g, "")
    .trim();
  
  return cleaned;
};

export default function SpeciesLandingPage({ route, navigation }) {
  const { photoUri, speciesData, iNaturalistData, iNatObsCount, confidence } = route.params || {};

  // Name & basics
  const commonName = iNaturalistData?.preferred_common_name || null;
  const scientificName =
    iNaturalistData?.name ||
    speciesData?.scientificName ||
    speciesData?.canonicalName ||
    'Unknown';

  const rank = speciesData?.rank || iNaturalistData?.rank || '—';
  const iconicTaxon = iNaturalistData?.iconic_taxon_name || '—';
  const taxonId = iNaturalistData?.id || null;

  // Photo: captured photo first, then iNat default photo, then any taxon photo
  const fallbackPhoto =
    iNaturalistData?.default_photo?.medium_url ||
    iNaturalistData?.default_photo?.square_url ||
    (Array.isArray(iNaturalistData?.taxon_photos) && iNaturalistData.taxon_photos[0]?.photo?.medium_url) ||
    null;

  const displayImageUri = photoUri || fallbackPhoto || null;

  // GBIF taxonomy rows
  const taxonomy = [
    { label: 'Kingdom', value: speciesData?.kingdom },
    { label: 'Phylum', value: speciesData?.phylum },
    { label: 'Class', value: speciesData?.class },
    { label: 'Order', value: speciesData?.order },
    { label: 'Family', value: speciesData?.family },
    { label: 'Genus', value: speciesData?.genus },
    { label: 'Species', value: speciesData?.species || speciesData?.canonicalName },
  ].filter(x => !!x.value);

  // Conservation + About (if present from iNat show)
  const conservation =
    iNaturalistData?.conservation_status?.status_name ||
    iNaturalistData?.conservation_status?.iucn_status ||
    iNaturalistData?.conservation_status?.status ||
    null;

  const about =
    iNaturalistData?.wikipedia_summary ||
    null;

  // Clean up HTML tags in the About section
  const cleanAboutText = about ? stripHtmlTags(about) : 'No description available for this species.';

  // State for controlling the TTS and favorite
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  
  // NEW: State for additional data
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [fullDescription, setFullDescription] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState({
    habitat: null,
    distribution: null,
    characteristics: null,
    behavior: null,
    threats: null,
    uses: null,
    similarSpecies: [],
    alternativeNames: [],
  });

  // Save to history when component mounts
  useEffect(() => {
    saveToHistory();
    checkIfFavorited();
    fetchAdditionalDetails();
  }, []);

  const fetchAdditionalDetails = async () => {
    setIsLoadingDetails(true);
    try {
      // Fetch Wikipedia data for comprehensive info
      const wikiData = await fetchWikipediaData(scientificName);
      
      // Also try common name if available
      let wikiDataCommon = null;
      if (commonName && commonName !== scientificName) {
        wikiDataCommon = await fetchWikipediaData(commonName);
      }
      
      // Fetch GBIF occurrence data for distribution
      const gbifOccurrence = speciesData?.usageKey 
        ? await fetchGBIFOccurrence(speciesData.usageKey)
        : null;

      // Fetch EOL (Encyclopedia of Life) data
      const eolData = await fetchEOLData(scientificName);

      // Use the longest/most complete description available, prioritize fullness
      let fullDesc = '';
      
      // Strategy 1: Use the longest description available
      const descriptions = [
        wikiData?.fullDescription,
        wikiDataCommon?.fullDescription,
        about
      ].filter(d => d && d.length > 100);
      
      // Sort by length and take the longest
      descriptions.sort((a, b) => b.length - a.length);
      fullDesc = descriptions[0] || cleanAboutText;
      
      // Strategy 2: If we have multiple good descriptions, intelligently combine them
      if (descriptions.length > 1 && descriptions[0].length < 2000) {
        // If the first description is less than 2000 chars, try to add unique content from others
        const firstDesc = descriptions[0];
        const secondDesc = descriptions[1];
        
        // Extract unique sentences from second description
        const firstSentences = new Set(firstDesc.split(/[.!?]+/).map(s => s.trim().toLowerCase()));
        const secondSentences = secondDesc.split(/[.!?]+/);
        const uniqueSentences = secondSentences.filter(s => 
          s.trim().length > 20 && !firstSentences.has(s.trim().toLowerCase())
        );
        
        if (uniqueSentences.length > 0) {
          fullDesc = firstDesc + ' ' + uniqueSentences.slice(0, 10).join('. ').trim() + '.';
        }
      }
      
      // Clean the description thoroughly
      fullDesc = stripHtmlTags(fullDesc);
      
      // Remove reference markers like [1], [2], etc.
      fullDesc = fullDesc.replace(/\[\d+\]/g, '');
      fullDesc = fullDesc.replace(/\[citation needed\]/gi, '');
      
      // Remove trailing ellipsis and ensure proper ending
      fullDesc = fullDesc.replace(/\.{3,}/g, '').trim();
      
      // Clean up spacing
      fullDesc = fullDesc.replace(/\s{2,}/g, ' ');
      fullDesc = fullDesc.replace(/\n{3,}/g, '\n\n');
      
      if (fullDesc && !fullDesc.match(/[.!?]$/)) {
        const lastPunctuation = Math.max(
          fullDesc.lastIndexOf('.'),
          fullDesc.lastIndexOf('?'),
          fullDesc.lastIndexOf('!')
        );
        if (lastPunctuation > fullDesc.length - 500) {
          fullDesc = fullDesc.substring(0, lastPunctuation + 1);
        } else {
          fullDesc += '.';
        }
      }
      
      console.log(`Final description length: ${fullDesc.length} characters`);
      setFullDescription(fullDesc);

      // Combine all data sources
      setAdditionalInfo({
        habitat: stripHtmlTags(wikiData?.habitat || wikiDataCommon?.habitat || eolData?.habitat || extractHabitat(fullDesc)),
        distribution: stripHtmlTags(gbifOccurrence?.distribution || wikiData?.distribution || wikiDataCommon?.distribution || extractDistribution(fullDesc)),
        characteristics: stripHtmlTags(wikiData?.characteristics || wikiDataCommon?.characteristics || extractCharacteristics(fullDesc)),
        behavior: stripHtmlTags(wikiData?.behavior || wikiDataCommon?.behavior || eolData?.behavior || extractBehavior(fullDesc)),
        threats: conservation ? `Conservation Status: ${conservation}` : 'Threat information not available',
        uses: stripHtmlTags(wikiData?.uses || wikiDataCommon?.uses || eolData?.uses || extractUses(fullDesc)),
        similarSpecies: iNaturalistData?.ancestors?.slice(0, 3) || [],
        alternativeNames: iNaturalistData?.names || [],
      });
    } catch (error) {
      console.error('Error fetching additional details:', error);
      setFullDescription(stripHtmlTags(cleanAboutText));
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const fetchWikipediaData = async (speciesName) => {
    try {
      // Method 1: Get COMPLETE Wikipedia article (NO sentence limit)
      const fullArticleResponse = await axios.get(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(speciesName)}&prop=extracts&explaintext=true&exsectionformat=plain&format=json&origin=*`,
        { timeout: 20000 }
      );
      
      const pages = fullArticleResponse.data?.query?.pages;
      const pageId = Object.keys(pages)[0];
      let fullExtract = pages[pageId]?.extract || '';
      
      // Clean the text thoroughly
      fullExtract = stripHtmlTags(fullExtract);
      
      // Remove any "..." or truncation markers
      fullExtract = fullExtract.replace(/\.{3,}/g, '');
      
      // Remove reference markers [1], [2], etc.
      fullExtract = fullExtract.replace(/\[\d+\]/g, '');
      fullExtract = fullExtract.replace(/\[citation needed\]/gi, '');
      
      // Remove "See also", "References", "External links" sections and everything after
      fullExtract = fullExtract.replace(/==\s*(See also|References|External links|Further reading|Notes|Citations|Bibliography)[\s\S]*$/gi, '');
      
      // Remove section markers like "== Section Name =="
      fullExtract = fullExtract.replace(/==+\s*.*?\s*==+/g, '');
      
      // Clean up multiple spaces and newlines
      fullExtract = fullExtract.replace(/\n{3,}/g, '\n\n');
      fullExtract = fullExtract.replace(/\s{2,}/g, ' ');
      
      // Ensure text ends with proper punctuation
      if (fullExtract && !fullExtract.match(/[.!?]$/)) {
        const lastPeriod = fullExtract.lastIndexOf('.');
        const lastQuestion = fullExtract.lastIndexOf('?');
        const lastExclamation = fullExtract.lastIndexOf('!');
        const lastPunctuation = Math.max(lastPeriod, lastQuestion, lastExclamation);
        
        if (lastPunctuation > fullExtract.length - 500) {
          fullExtract = fullExtract.substring(0, lastPunctuation + 1);
        } else {
          fullExtract += '.';
        }
      }
      
      // If we got substantial content (at least 500 characters), use it
      if (fullExtract && fullExtract.length > 500) {
        console.log(`Fetched full Wikipedia article: ${fullExtract.length} characters`);
        return {
          fullDescription: fullExtract.trim(),
          habitat: extractHabitat(fullExtract),
          distribution: extractDistribution(fullExtract),
          characteristics: extractCharacteristics(fullExtract),
          behavior: extractBehavior(fullExtract),
          uses: extractUses(fullExtract),
        };
      }
      
      // Method 2: Try alternative Wikipedia API with revisions
      const revisionResponse = await axios.get(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(speciesName)}&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*&formatversion=2`,
        { timeout: 15000 }
      );
      
      const revisionContent = revisionResponse.data?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
      if (revisionContent) {
        // Parse wikitext to plain text (basic parsing)
        let plainText = revisionContent
          .replace(/\{\{[^}]+\}\}/g, '') // Remove templates
          .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, '$2') // Convert links
          .replace(/<[^>]+>/g, '') // Remove HTML tags
          .replace(/'{2,}/g, '') // Remove bold/italic markers
          .replace(/^[=]+.*[=]+$/gm, '') // Remove headers
          .replace(/\[\d+\]/g, ''); // Remove references
        
        plainText = stripHtmlTags(plainText);
        plainText = plainText.replace(/\.{3,}/g, '').trim();
        
        if (plainText.length > 500) {
          console.log(`Fetched Wikipedia revision: ${plainText.length} characters`);
          return {
            fullDescription: plainText,
            habitat: extractHabitat(plainText),
            distribution: extractDistribution(plainText),
            characteristics: extractCharacteristics(plainText),
            behavior: extractBehavior(plainText),
            uses: extractUses(plainText),
          };
        }
      }
      
      // Method 3: Fallback to REST API summary (shorter content)
      const summaryResponse = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(speciesName)}`,
        { timeout: 5000 }
      );
      
      let extract = summaryResponse.data?.extract || '';
      extract = stripHtmlTags(extract);
      extract = extract.replace(/\.{3,}/g, '');
      extract = extract.replace(/\[\d+\]/g, '');
      
      if (extract && !extract.match(/[.!?]$/)) {
        const lastPunctuation = Math.max(
          extract.lastIndexOf('.'),
          extract.lastIndexOf('?'),
          extract.lastIndexOf('!')
        );
        if (lastPunctuation > 0) {
          extract = extract.substring(0, lastPunctuation + 1);
        } else {
          extract += '.';
        }
      }
      
      console.log(`Fetched Wikipedia summary: ${extract.length} characters`);
      return {
        fullDescription: extract.trim(),
        habitat: extractHabitat(extract),
        distribution: extractDistribution(extract),
        characteristics: extractCharacteristics(extract),
        behavior: extractBehavior(extract),
        uses: extractUses(extract),
      };
    } catch (error) {
      console.warn('Wikipedia fetch failed:', error.message);
      return null;
    }
  };

  const fetchGBIFOccurrence = async (usageKey) => {
    try {
      const response = await axios.get(
        `https://api.gbif.org/v1/occurrence/search?taxonKey=${usageKey}&limit=0`,
        { timeout: 5000 }
      );
      
      const count = response.data?.count || 0;
      return {
        distribution: `Recorded in ${count.toLocaleString()} global observations`,
      };
    } catch (error) {
      console.warn('GBIF occurrence fetch failed:', error.message);
      return null;
    }
  };

  const fetchEOLData = async (speciesName) => {
    try {
      // Search for the species in EOL
      const searchResponse = await axios.get(
        `https://eol.org/api/search/1.0.json?q=${encodeURIComponent(speciesName)}&page=1`,
        { timeout: 5000 }
      );
      
      if (searchResponse.data?.results?.length > 0) {
        const eolId = searchResponse.data.results[0].id;
        
        // Fetch detailed info
        const detailResponse = await axios.get(
          `https://eol.org/api/pages/1.0/${eolId}.json?details=true`,
          { timeout: 5000 }
        );
        
        return {
          habitat: detailResponse.data?.dataObjects?.find(obj => obj.dataType === 'http://purl.org/dc/dcmitype/Text')?.description,
        };
      }
    } catch (error) {
      console.warn('EOL fetch failed:', error.message);
    }
    return null;
  };

  // Helper functions to extract info from text - ENHANCED to get more content
  const extractHabitat = (text) => {
    const habitatKeywords = ['habitat', 'found in', 'lives in', 'native to', 'grows in', 'occurs in', 'inhabits', 'dwelling', 'environment'];
    const sentences = text.split(/[.!?]+/);
    const habitatSentences = [];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (habitatKeywords.some(keyword => lowerSentence.includes(keyword))) {
        habitatSentences.push(sentence.trim());
        if (habitatSentences.length >= 3) break; // Get up to 3 relevant sentences
      }
    }
    
    return habitatSentences.length > 0 
      ? habitatSentences.join('. ') + '.'
      : 'Habitat information not available';
  };

  const extractDistribution = (text) => {
    const distKeywords = ['distributed', 'range', 'endemic', 'native to', 'found throughout', 'widespread', 'region', 'continent', 'country', 'geographical'];
    const sentences = text.split(/[.!?]+/);
    const distSentences = [];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (distKeywords.some(keyword => lowerSentence.includes(keyword))) {
        distSentences.push(sentence.trim());
        if (distSentences.length >= 3) break;
      }
    }
    
    return distSentences.length > 0 
      ? distSentences.join('. ') + '.'
      : 'Distribution information not available';
  };

  const extractCharacteristics = (text) => {
    const charKeywords = ['characterized by', 'features', 'appearance', 'measures', 'size', 'color', 'shaped', 'length', 'weight', 'plumage', 'feathers', 'bill', 'wingspan', 'tail'];
    const sentences = text.split(/[.!?]+/);
    const characteristics = [];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (charKeywords.some(keyword => lowerSentence.includes(keyword))) {
        characteristics.push(sentence.trim());
        if (characteristics.length >= 5) break; // Get up to 5 relevant sentences
      }
    }
    
    return characteristics.length > 0 
      ? characteristics.join('. ') + '.'
      : 'Physical characteristics not available';
  };

  const extractBehavior = (text) => {
    const behaviorKeywords = ['behavior', 'feeds on', 'diet', 'active', 'nocturnal', 'diurnal', 'social', 'breeding', 'nesting', 'foraging', 'hunting', 'migration', 'territorial'];
    const sentences = text.split(/[.!?]+/);
    const behaviorSentences = [];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (behaviorKeywords.some(keyword => lowerSentence.includes(keyword))) {
        behaviorSentences.push(sentence.trim());
        if (behaviorSentences.length >= 4) break;
      }
    }
    
    return behaviorSentences.length > 0 
      ? behaviorSentences.join('. ') + '.'
      : 'Behavior information not available';
  };

  const extractUses = (text) => {
    const useKeywords = ['used for', 'medicinal', 'cultivated', 'economic', 'traditional', 'commercial', 'agriculture', 'farming', 'domesticated', 'value', 'important'];
    const sentences = text.split(/[.!?]+/);
    const useSentences = [];
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (useKeywords.some(keyword => lowerSentence.includes(keyword))) {
        useSentences.push(sentence.trim());
        if (useSentences.length >= 3) break;
      }
    }
    
    return useSentences.length > 0 
      ? useSentences.join('. ') + '.'
      : 'Usage information not available';
  };

  const saveToHistory = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        console.log('User not authenticated, skipping history save');
        return;
      }

      // Create history entry
      const historyEntry = {
        plantName: commonName || scientificName,
        name: commonName || scientificName,
        scientificName: scientificName,
        commonName: commonName,
        rank: rank,
        iconicTaxon: iconicTaxon,
        taxonId: taxonId,
        imageUrl: displayImageUri,
        conservation: conservation,
        about: cleanAboutText,
        description: cleanAboutText,
        iNatObsCount: iNatObsCount || 0,
        confidence: confidence,
        type: 'history',
      };

      const result = await addToHistory(uid, historyEntry);
      
      if (result.success) {
        console.log('Successfully saved to history');
      } else {
        console.warn('Failed to save to history:', result.error);
      }
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  };

  const checkIfFavorited = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const result = await isInFavorites(uid, scientificName);
      
      if (result.success) {
        setIsFavorite(result.isFavorite);
        setFavoriteId(result.id);
      }
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  };

  // Function to handle text-to-speech
  const handleSpeech = () => {
    if (isSpeaking) {
      Speech.stop();
    } else {
      const fullText = `${commonName || scientificName}. ${fullDescription}. 
        Habitat: ${additionalInfo.habitat}. 
        Distribution: ${additionalInfo.distribution}.`;
      
      Speech.speak(fullText, {
        language: 'en',
        pitch: 1,
        rate: 0.75,
      });
    }
    setIsSpeaking(!isSpeaking);
  };

  // Function to toggle favorite state
  const toggleFavorite = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        Alert.alert('Authentication Required', 'Please log in to add favorites.');
        return;
      }

      if (isFavorite && favoriteId) {
        // Remove from favorites
        const result = await removeFromFavorites(uid, favoriteId);
        
        if (result.success) {
          setIsFavorite(false);
          setFavoriteId(null);
          Alert.alert('Removed', `${commonName || scientificName} has been removed from favorites.`);
        } else {
          Alert.alert('Error', 'Failed to remove from favorites. Please try again.');
        }
      } else {
        // Add to favorites
        const favoriteData = {
          plantName: commonName || scientificName,
          name: commonName || scientificName,
          scientificName: scientificName,
          commonName: commonName,
          rank: rank,
          iconicTaxon: iconicTaxon,
          taxonId: taxonId,
          imageUrl: displayImageUri,
          type: 'species',
        };

        const result = await addToFavorites(uid, favoriteData);
        
        if (result.success) {
          setIsFavorite(true);
          setFavoriteId(result.id);
          Alert.alert('Added to Favorites', `${commonName || scientificName} has been added to your favorites!`);
        } else {
          Alert.alert('Error', 'Failed to add to favorites. Please try again.');
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      Alert.alert('Error', 'Failed to update favorites. Please try again.');
    }
  };

  // Stop TTS when navigating back
  const handleBackPress = () => {
    Speech.stop();
    navigation.goBack();
  };

  return (
    <ImageBackground
      source={require('../assets/background-result.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.contentContainer}>
            <Text style={styles.title}>Species Details</Text>

            {displayImageUri ? (
              <Image source={{ uri: displayImageUri }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={[styles.heroImage, styles.heroPlaceholder]}>
                <Text style={styles.placeholderText}>No image available</Text>
              </View>
            )}

            <View style={styles.card}>
              {commonName ? <Text style={styles.commonName}>{commonName}</Text> : null}
              <Text style={styles.sciName}>{scientificName}</Text>

              <View style={styles.metaRow}>
                <MetaPill label="Rank" value={rank} />
                <MetaPill label="Type" value={iconicTaxon} />
                {taxonId ? <MetaPill label="ID" value={String(taxonId)} /> : null}
                {confidence ? <MetaPill label="Confidence" value={`${confidence}%`} icon="checkmark-circle" /> : null}
              </View>

              <TouchableOpacity onPress={toggleFavorite} style={styles.favoriteButton}>
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={30}
                  color={isFavorite ? "#ff0000" : "#555"}
                />
              </TouchableOpacity>
            </View>

            {/* Description/About Section - FULL VERSION */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="information-circle" size={24} color="#00695c" />
                <Text style={styles.cardTitle}>Complete Description</Text>
              </View>
              {isLoadingDetails ? (
                <View style={styles.loadingSection}>
                  <ActivityIndicator size="small" color="#00695c" />
                  <Text style={styles.loadingText}>Loading full description...</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.fullDescription}>{fullDescription}</Text>
                  {fullDescription.length > 500 && (
                    <View style={styles.descriptionInfo}>
                      <Ionicons name="book" size={16} color="#00695c" />
                      <Text style={styles.descriptionInfoText}>
                        {Math.ceil(fullDescription.length / 5)} words • {Math.ceil(fullDescription.split('\n\n').length)} sections
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Physical Characteristics */}
            {isLoadingDetails ? (
              <View style={styles.card}>
                <ActivityIndicator size="large" color="#00695c" />
                <Text style={styles.loadingText}>Loading detailed information...</Text>
              </View>
            ) : (
              <>
                {additionalInfo.characteristics && additionalInfo.characteristics !== 'Physical characteristics not available' && (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="eye" size={24} color="#00695c" />
                      <Text style={styles.cardTitle}>Physical Characteristics</Text>
                    </View>
                    <Text style={styles.value}>{additionalInfo.characteristics}</Text>
                  </View>
                )}

                {/* Habitat & Distribution */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="location" size={24} color="#00695c" />
                    <Text style={styles.cardTitle}>Habitat & Distribution</Text>
                  </View>
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>Habitat:</Text>
                    <Text style={styles.value}>{additionalInfo.habitat}</Text>
                  </View>
                  <View style={styles.infoSection}>
                    <Text style={styles.infoLabel}>Distribution:</Text>
                    <Text style={styles.value}>{additionalInfo.distribution}</Text>
                  </View>
                </View>

                {/* Behavior & Ecology */}
                {additionalInfo.behavior && additionalInfo.behavior !== 'Behavior information not available' && (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="flash" size={24} color="#00695c" />
                      <Text style={styles.cardTitle}>Behavior & Ecology</Text>
                    </View>
                    <Text style={styles.value}>{additionalInfo.behavior}</Text>
                  </View>
                )}

                {/* Conservation Status */}
                {conservation && (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="shield-checkmark" size={24} color="#00695c" />
                      <Text style={styles.cardTitle}>Conservation Status</Text>
                    </View>
                    <View style={styles.conservationBadge}>
                      <Text style={styles.conservationText}>{conservation}</Text>
                    </View>
                    <Text style={styles.value}>{additionalInfo.threats}</Text>
                  </View>
                )}

                {/* Uses & Importance */}
                {additionalInfo.uses && additionalInfo.uses !== 'Usage information not available' && (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="leaf" size={24} color="#00695c" />
                      <Text style={styles.cardTitle}>Uses & Importance</Text>
                    </View>
                    <Text style={styles.value}>{additionalInfo.uses}</Text>
                  </View>
                )}

                {/* Alternative Names */}
                {additionalInfo.alternativeNames.length > 0 && (
                  <View style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Ionicons name="language" size={24} color="#00695c" />
                      <Text style={styles.cardTitle}>Alternative Names</Text>
                    </View>
                    <View style={styles.namesList}>
                      {additionalInfo.alternativeNames.slice(0, 5).map((name, idx) => (
                        <View key={idx} style={styles.nameItem}>
                          <Text style={styles.nameLang}>{name.locale || 'Common'}:</Text>
                          <Text style={styles.nameValue}>{name.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Community Observations */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="people" size={24} color="#00695c" />
                <Text style={styles.cardTitle}>Community Data</Text>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statNumber}>{typeof iNatObsCount === 'number' ? iNatObsCount.toLocaleString() : 0}</Text>
                  <Text style={styles.statLabel}>iNaturalist Observations</Text>
                </View>
              </View>
            </View>

            {/* Full Taxonomy */}
            {taxonomy.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="git-branch" size={24} color="#00695c" />
                  <Text style={styles.cardTitle}>Complete Taxonomy</Text>
                </View>
                <View style={styles.taxTable}>
                  {taxonomy.map((row, idx) => (
                    <View key={`${row.label}-${idx}`} style={styles.taxRow}>
                      <Text style={styles.taxLabel}>{row.label}</Text>
                      <Text style={styles.taxValue}>{row.value}</Text>
                    </View>
                  ))}

                  {speciesData?.usageKey && (
                    <View style={styles.taxRow}>
                      <Text style={styles.taxLabel}>GBIF Key</Text>
                      <Text style={styles.taxValue}>{speciesData.usageKey}</Text>
                    </View>
                  )}
                  {speciesData?.status && (
                    <View style={styles.taxRow}>
                      <Text style={styles.taxLabel}>Taxonomic Status</Text>
                      <Text style={styles.taxValue}>{speciesData.status}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Data Sources Footer */}
            <View style={styles.sourcesCard}>
              <Text style={styles.sourcesTitle}>Data Sources</Text>
              <Text style={styles.sourcesText}>
                • iNaturalist - Community observations{'\n'}
                • GBIF - Global biodiversity data{'\n'}
                • Wikipedia - General information{'\n'}
                • Google Vision AI - Image recognition
              </Text>
            </View>

            <View style={{ height: 80 }} />
          </ScrollView>

          <TouchableOpacity
            style={styles.speechButton}
            onPress={handleSpeech}
          >
            <Ionicons name={isSpeaking ? "pause" : "volume-high"} size={30} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

function MetaPill({ label, value, icon }) {
  if (!value) return null;
  return (
    <View style={styles.pill}>
      {icon && <Ionicons name={icon} size={16} color="#00695c" style={{ marginRight: 4 }} />}
      <Text style={styles.pillLabel}>{label}:</Text>
      <Text style={styles.pillValue}> {value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  container: { 
    flex: 1, 
    padding: 16,
  },
  backButton: {
    position: 'absolute', 
    top: 40, 
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 12, 
    borderRadius: 25, 
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  contentContainer: { 
    flexGrow: 1, 
    paddingBottom: 24 
  },
  title: {
    fontSize: 32, 
    fontWeight: '700', 
    textAlign: 'center', 
    marginBottom: 16, 
    color: '#1a2e1b',
    top: 30,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 2 },
  },
  heroImage: { 
    width: '100%', 
    height: 250, 
    borderRadius: 16, 
    marginBottom: 16, 
    backgroundColor: '#eee', 
    top: 30,
  },
  heroPlaceholder: { 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'rgba(238, 238, 238, 0.9)',
  },
  placeholderText: { 
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'rgba(248, 248, 248, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    top: 30,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18, 
    fontWeight: '600', 
    color: '#1a2e1b',
    marginLeft: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  commonName: {
    fontSize: 22, 
    fontWeight: '700', 
    color: '#2d2d2d',
    marginBottom: 4, 
    textAlign: 'center',
  },
  sciName: {
    fontSize: 18, 
    fontStyle: 'italic', 
    color: '#555',
    textAlign: 'center',
  },
  metaRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center', 
    marginTop: 10, 
    gap: 10 
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 247, 250, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    margin: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 121, 107, 0.2)',
  },
  pillLabel: { 
    color: '#00695c',
    fontWeight: '600',
    fontSize: 13,
  },
  pillValue: { 
    color: '#003d35',
    fontWeight: '500',
    fontSize: 13,
  },
  value: { 
    fontSize: 16, 
    color: '#1f1f1f',
    marginTop: 8, 
    lineHeight: 24 
  },
  infoSection: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00695c',
    marginBottom: 4,
  },
  conservationBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  conservationText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e65100',
  },
  namesList: {
    marginTop: 8,
  },
  nameItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(229, 229, 229, 0.8)',
  },
  nameLang: {
    fontSize: 15,
    fontWeight: '600',
    color: '#00695c',
    width: 100,
  },
  nameValue: {
    fontSize: 15,
    color: '#1f1f1f',
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00695c',
  },
  statLabel: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    marginTop: 4,
  },
  taxTable: { marginTop: 12 },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(229, 229, 229, 0.8)',
  },
  taxLabel: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#00695c'
  },
  taxValue: { 
    fontSize: 16, 
    color: '#1f1f1f',
    flexShrink: 1, 
    textAlign: 'right' 
  },
  sourcesCard: {
    backgroundColor: 'rgba(230, 230, 230, 0.85)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    top: 30,
    borderWidth: 1,
    borderColor: 'rgba(200, 200, 200, 0.5)',
  },
  sourcesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
    textAlign: 'center',
  },
  sourcesText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 12,
    color: '#00695c',
    fontSize: 15,
  },
  loadingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  fullDescription: { 
    fontSize: 16, 
    color: '#1f1f1f',
    lineHeight: 26,
    textAlign: 'justify',
    letterSpacing: 0.3,
  },
  descriptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 105, 92, 0.2)',
  },
  descriptionInfoText: {
    fontSize: 13,
    color: '#00695c',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  speechButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: 'rgba(0, 190, 22, 0.9)',
    padding: 15,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  favoriteButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    padding: 8,
  },
});