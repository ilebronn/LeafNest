import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, 
  Alert, ActivityIndicator, Animated, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Speech from 'expo-speech';
import { auth } from '@config/firebase';
import { addToHistory, addToFavorites, removeFromFavorites, isInFavorites } from '@services/firebase';
import axios from 'axios';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { 
  canDownload, 
  decrementDownloadCount, 
  getUsageLimits 
} from '@services/subscription/subscriptionService';
import { PremiumGate } from '@components/modals';
import { createDownloadNotification } from '@services/notifications/notificationService';
import { isGuestUser } from '@utils/guest';
// ✅ ADD THESE IMPORTS for offline feature
import { useOfflineAccess } from '@hooks/useOfflineAccess';
import { getCachedFullDetails, cacheFullDetails } from '@services/storage/offlineStorage';

const { width, height } = Dimensions.get('window');
const PDF_BACKEND_URL = 'https://us-central1-leafnest-98408.cloudfunctions.net/generatePdfAndEmail';

// Helper Functions
const stripHtmlTags = (htmlString) => {
  if (!htmlString) return '';
  let cleaned = htmlString
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim();
  return cleaned;
};

const buildComprehensiveDescription = (wikiData, wikiCommonData, wikiInfoboxData, fallbackAbout) => {
  const descriptions = [
    wikiData?.fullDescription,
    wikiCommonData?.fullDescription,
    wikiInfoboxData?.description,
    fallbackAbout
  ].filter(d => d && d.length > 100);

  if (descriptions.length === 0) {
    return stripHtmlTags(fallbackAbout || 'No description available.');
  }

  descriptions.sort((a, b) => b.length - a.length);
  let combined = descriptions[0];

  for (let i = 1; i < descriptions.length; i++) {
    const additionalDesc = descriptions[i];
    const firstSentences = new Set(
      combined.split(/[.!?]+/).map(s => s.trim().toLowerCase()).filter(s => s.length > 20)
    );

    const additionalSentences = additionalDesc.split(/[.!?]+/);
    const uniqueSentences = additionalSentences.filter(s => {
      const trimmed = s.trim().toLowerCase();
      return trimmed.length > 20 && !firstSentences.has(trimmed);
    });

    if (uniqueSentences.length > 0) {
      const sentencesToAdd = uniqueSentences.slice(0, 15).map(s => s.trim()).join('. ');
      combined += ` ${sentencesToAdd}`;
    }
  }

  combined = stripHtmlTags(combined);
  combined = combined.replace(/\[\d+\]/g, '');
  combined = combined.replace(/\[citation needed\]/gi, '');
  combined = combined.replace(/\.{3,}/g, '');
  combined = combined.replace(/\s{2,}/g, ' ');
  combined = combined.replace(/\n{3,}/g, '\n\n');
  combined = combined.trim();

  if (combined && !combined.match(/[.!?]$/)) {
    const lastPunctuation = Math.max(
      combined.lastIndexOf('.'),
      combined.lastIndexOf('?'),
      combined.lastIndexOf('!')
    );
    if (lastPunctuation > combined.length - 500) {
      combined = combined.substring(0, lastPunctuation + 1);
    } else {
      combined += '.';
    }
  }

  return combined;
};

const expandDescriptionWithDetails = (description, wikiData, wikiCommonData, eolData) => {
  let expanded = description;

  if (wikiData?.characteristics) {
    expanded += ` Physical characteristics include: ${stripHtmlTags(wikiData.characteristics)}`;
  }

  if (wikiData?.behavior) {
    expanded += ` Behaviorally, ${stripHtmlTags(wikiData.behavior)}`;
  }

  if (wikiData?.habitat) {
    expanded += ` This species inhabits ${stripHtmlTags(wikiData.habitat)}`;
  }

  if (wikiData?.distribution) {
    expanded += ` Geographically, ${stripHtmlTags(wikiData.distribution)}`;
  }

  if (wikiData?.uses) {
    expanded += ` In terms of human interaction and importance, ${stripHtmlTags(wikiData.uses)}`;
  }

  if (wikiCommonData && wikiCommonData !== wikiData) {
    if (wikiCommonData.characteristics) {
      expanded += ` Additional biological details: ${stripHtmlTags(wikiCommonData.characteristics)}`;
    }
    if (wikiCommonData.behavior) {
      expanded += ` Further behavioral observations: ${stripHtmlTags(wikiCommonData.behavior)}`;
    }
  }

  expanded = stripHtmlTags(expanded);
  expanded = expanded.replace(/\s{2,}/g, ' ').trim();

  return expanded;
};

const generateDetailedDescription = (commonName, scientificName, rank, iconicTaxon, taxonomy, about, gbifOccurrence, conservation) => {
  let description = '';

  if (about && about.length > 50) {
    description = stripHtmlTags(about) + ' ';
  } else {
    description = `${commonName || scientificName} is a ${rank} belonging to the ${iconicTaxon} group. `;
  }

  if (taxonomy && taxonomy.length > 0) {
    const taxonomyInfo = taxonomy.map(t => `${t.label}: ${t.value}`).join(', ');
    description += `Taxonomically, this species is classified as follows: ${taxonomyInfo}. `;
  }

  if (iconicTaxon) {
    const taxonDescriptions = {
      'Plantae': 'As a plant, this species plays an important role in ecosystems by producing oxygen, providing food and shelter for fauna, and contributing to nutrient cycling.',
      'Animalia': `This is an animal species. Animals are multicellular organisms that play crucial roles in their ecosystems.`,
      'Fungi': 'As a fungus, this organism plays a critical role in decomposition and nutrient cycling in ecosystems.',
    };

    if (taxonDescriptions[iconicTaxon]) {
      description += taxonDescriptions[iconicTaxon] + ' ';
    }
  }

  if (gbifOccurrence?.distribution) {
    description += `${gbifOccurrence.distribution}. `;
  } else {
    description += `This species has been documented and studied across various regions globally. `;
  }

  if (conservation) {
    description += `Conservation Status: ${conservation}. `;
  }

  description += `This species occupies specific ecological niches and contributes to the biodiversity of its habitat.`;

  description = stripHtmlTags(description);
  description = description.replace(/\s{2,}/g, ' ').trim();

  return description;
};

const extractHabitat = (text) => {
  const habitatKeywords = ['habitat', 'found in', 'lives in', 'native to', 'grows in', 'occurs in', 'inhabits', 'dwelling', 'environment', 'ecosystem'];
  const sentences = text.split(/[.!?]+/);
  const habitatSentences = [];
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (habitatKeywords.some(keyword => lowerSentence.includes(keyword))) {
      habitatSentences.push(sentence.trim());
      if (habitatSentences.length >= 5) break;
    }
  }
  
  return habitatSentences.length > 0 
    ? habitatSentences.join('. ') + '.'
    : 'Habitat information not available';
};

const extractDistribution = (text) => {
  const distKeywords = ['distributed', 'range', 'endemic', 'native to', 'found throughout', 'widespread', 'region', 'continent', 'country', 'geographical', 'tropical', 'temperate', 'arctic'];
  const sentences = text.split(/[.!?]+/);
  const distSentences = [];
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (distKeywords.some(keyword => lowerSentence.includes(keyword))) {
      distSentences.push(sentence.trim());
      if (distSentences.length >= 5) break;
    }
  }
  
  return distSentences.length > 0 
    ? distSentences.join('. ') + '.'
    : 'Distribution information not available';
};

const extractCharacteristics = (text) => {
  const charKeywords = ['characterized by', 'features', 'appearance', 'measures', 'size', 'color', 'shaped', 'length', 'weight', 'plumage', 'feathers', 'bill', 'wingspan', 'tail', 'structure', 'morphology', 'distinct'];
  const sentences = text.split(/[.!?]+/);
  const characteristics = [];
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (charKeywords.some(keyword => lowerSentence.includes(keyword))) {
      characteristics.push(sentence.trim());
      if (characteristics.length >= 7) break;
    }
  }
  
  return characteristics.length > 0 
    ? characteristics.join('. ') + '.'
    : 'Physical characteristics not available';
};

const extractBehavior = (text) => {
  const behaviorKeywords = ['behavior', 'behaves', 'feeds on', 'diet', 'active', 'nocturnal', 'diurnal', 'social', 'breeding', 'nesting', 'foraging', 'hunting', 'migration', 'territorial', 'habits', 'activity'];
  const sentences = text.split(/[.!?]+/);
  const behaviorSentences = [];
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (behaviorKeywords.some(keyword => lowerSentence.includes(keyword))) {
      behaviorSentences.push(sentence.trim());
      if (behaviorSentences.length >= 6) break;
    }
  }
  
  return behaviorSentences.length > 0 
    ? behaviorSentences.join('. ') + '.'
    : 'Behavior information not available';
};

const extractUses = (text) => {
  const useKeywords = ['used for', 'medicinal', 'cultivated', 'economic', 'traditional', 'commercial', 'agriculture', 'farming', 'domesticated', 'value', 'important', 'significance', 'benefit', 'application'];
  const sentences = text.split(/[.!?]+/);
  const useSentences = [];
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    if (useKeywords.some(keyword => lowerSentence.includes(keyword))) {
      useSentences.push(sentence.trim());
      if (useSentences.length >= 5) break;
    }
  }
  
  return useSentences.length > 0 
    ? useSentences.join('. ') + '.'
    : 'Usage information not available';
};

// Animated Glass Card Component
const AnimatedGlassCard = ({ children, delay = 0, style }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      <BlurView intensity={15} tint="light" style={styles.glassCard}>
        {children}
      </BlurView>
    </Animated.View>
  );
};

export default function SpeciesLandingPage({ route, navigation }) {
  const { 
    photoUri, 
    speciesData, 
    iNaturalistData, 
    iNatObsCount, 
    confidence,
    offlineCacheId // ✅ NEW: Offline cache identifier from History/Favorites
  } = route.params || {};
  
  // ✅ NEW: Offline access hook
  const { isOffline, isPremium, canAccessOffline, userId } = useOfflineAccess();

  const commonName = iNaturalistData?.preferred_common_name || null;
  const scientificName = iNaturalistData?.name || speciesData?.scientificName || speciesData?.canonicalName || 'Unknown';
  
  // ✅ UPDATED: Show only specific species name, not family or genus
  const displayCommonName = commonName || scientificName || 'Unknown Species';
  const displayScientificName = scientificName || commonName || 'Unknown';
  const showBothNames = displayCommonName.toLowerCase() !== displayScientificName.toLowerCase();
  
  // ✅ NEW: Determine if we should show scientific name (only if different from common name)
  const shouldShowScientificName = showBothNames && scientificName && scientificName !== 'Unknown';

  const rank = speciesData?.rank || iNaturalistData?.rank || '—';
  const iconicTaxon = iNaturalistData?.iconic_taxon_name || '—';
  const taxonId = iNaturalistData?.id || null;

  const fallbackPhoto =
    iNaturalistData?.default_photo?.medium_url ||
    iNaturalistData?.default_photo?.square_url ||
    (Array.isArray(iNaturalistData?.taxon_photos) && iNaturalistData.taxon_photos[0]?.photo?.medium_url) ||
    null;

  const displayImageUri = photoUri || fallbackPhoto || null;

  const taxonomy = [
    { label: 'Kingdom', value: speciesData?.kingdom },
    { label: 'Phylum', value: speciesData?.phylum },
    { label: 'Class', value: speciesData?.class },
    { label: 'Order', value: speciesData?.order },
    { label: 'Family', value: speciesData?.family },
    { label: 'Genus', value: speciesData?.genus },
    { label: 'Species', value: speciesData?.species || speciesData?.canonicalName },
  ].filter(x => !!x.value);

  const conservation =
    iNaturalistData?.conservation_status?.status_name ||
    iNaturalistData?.conservation_status?.iucn_status ||
    iNaturalistData?.conservation_status?.status ||
    null;

  const about = iNaturalistData?.wikipedia_summary || null;
  const cleanAboutText = about ? stripHtmlTags(about) : 'No description available for this species.';

  // State Management
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [fullDescription, setFullDescription] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
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

  const [isLoading, setIsLoading] = useState(false);
  const [wikiData, setWikiData] = useState(null);
  const [wikiCommonData, setWikiCommonData] = useState(null);
  const [wikiInfoboxData, setWikiInfoboxData] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [usageLimits, setUsageLimits] = useState(null);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  
  // ✅ NEW: Offline-related states
  const [isLoadingFromCache, setIsLoadingFromCache] = useState(false);
  const [showOfflinePremiumGate, setShowOfflinePremiumGate] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const DESCRIPTION_PREVIEW_LENGTH = 500;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    saveToHistory();
    checkIfFavorited();
    
    // ✅ OFFLINE LOGIC: Check if offline and handle accordingly
    handleDataLoading();
  }, []);

  // ✅ NEW: Handle data loading (online or offline)
  const handleDataLoading = async () => {
    // OFFLINE MODE
    if (isOffline) {
      console.log('📴 Offline mode detected');
      
      // Check if premium
      if (!canAccessOffline) {
        console.log('❌ Non-premium user trying to access offline');
        setShowOfflinePremiumGate(true);
        setIsLoadingDetails(false);
        return;
      }
      
      // Premium user - load from cache
      console.log('✅ Premium user - loading from cache');
      setIsLoadingFromCache(true);
      
      try {
        if (offlineCacheId && userId) {
          const cached = await getCachedFullDetails(userId, offlineCacheId);
          
          if (cached) {
            console.log('✅ Loaded data from offline cache');
            
            // Set cached data
            setFullDescription(cached.fullDescription || cleanAboutText);
            setAdditionalInfo({
              habitat: cached.habitat || additionalInfo.habitat,
              distribution: cached.distribution || additionalInfo.distribution,
              characteristics: cached.characteristics || additionalInfo.characteristics,
              behavior: cached.behavior || additionalInfo.behavior,
              threats: cached.threats || additionalInfo.threats,
              uses: cached.uses || additionalInfo.uses,
              similarSpecies: cached.similarSpecies || [],
              alternativeNames: cached.alternativeNames || [],
            });
            
            setIsLoadingDetails(false);
          } else {
            console.log('⚠️ No cached data found');
            Alert.alert(
              'No Offline Data',
              'This species information is not available offline. Please connect to the internet to view details.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
        } else {
          console.log('⚠️ No cache ID provided');
          Alert.alert(
            'No Offline Data',
            'This species information is not available offline.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } catch (error) {
        console.error('❌ Error loading from cache:', error);
        Alert.alert(
          'Error',
          'Failed to load offline data.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } finally {
        setIsLoadingFromCache(false);
      }
      
      return;
    }
    
    // ONLINE MODE - normal fetch
    console.log('🌐 Online mode - fetching fresh data');
    fetchAdditionalDetails();
  };

  // Data Fetching Functions
  const fetchAdditionalDetails = async () => {
    setIsLoadingDetails(true);
    try {
      const gbifOccurrence = speciesData?.usageKey 
        ? await fetchGBIFOccurrence(speciesData.usageKey)
        : null;

      let wikiData = await fetchWikipediaData(scientificName).catch(() => null);
      let wikiDataCommon = null;
      
      if (commonName && commonName !== scientificName) {
        wikiDataCommon = await fetchWikipediaData(commonName).catch(() => null);
      }
      
      const eolData = await fetchEOLData(scientificName).catch(() => null);
      const wikiInfoboxData = await fetchWikipediaInfobox(scientificName).catch(() => null);

      let fullDesc = '';
      
      if (wikiData?.fullDescription || wikiDataCommon?.fullDescription || wikiInfoboxData?.description) {
        fullDesc = buildComprehensiveDescription(
          wikiData,
          wikiDataCommon,
          wikiInfoboxData,
          about
        );
      } else {
        fullDesc = generateDetailedDescription(
          commonName,
          scientificName,
          rank,
          iconicTaxon,
          taxonomy,
          about,
          gbifOccurrence,
          conservation
        );
      }

      if (fullDesc.length < 1500) {
        fullDesc = expandDescriptionWithDetails(fullDesc, wikiData, wikiDataCommon, eolData);
      }

      console.log(`Final description length: ${fullDesc.length} characters`);
      setFullDescription(fullDesc);

      const infoData = {
        habitat: stripHtmlTags(wikiData?.habitat || wikiDataCommon?.habitat || eolData?.habitat || extractHabitat(fullDesc)),
        distribution: stripHtmlTags(gbifOccurrence?.distribution || wikiData?.distribution || wikiDataCommon?.distribution || extractDistribution(fullDesc)),
        characteristics: stripHtmlTags(wikiData?.characteristics || wikiDataCommon?.characteristics || wikiInfoboxData?.characteristics || extractCharacteristics(fullDesc)),
        behavior: stripHtmlTags(wikiData?.behavior || wikiDataCommon?.behavior || eolData?.behavior || extractBehavior(fullDesc)),
        threats: conservation ? `Conservation Status: ${conservation}` : 'Threat information not available',
        uses: stripHtmlTags(wikiData?.uses || wikiDataCommon?.uses || eolData?.uses || extractUses(fullDesc)),
        similarSpecies: iNaturalistData?.ancestors?.slice(0, 3) || [],
        alternativeNames: iNaturalistData?.names || [],
      };
      
      setAdditionalInfo(infoData);
      
      // ✅ CACHE DATA FOR OFFLINE (Premium users only)
      if (isPremium && userId && offlineCacheId) {
        try {
          const cacheData = {
            fullDescription: fullDesc,
            ...infoData,
            commonName,
            scientificName,
            rank,
            iconicTaxon,
            taxonomy,
            conservation,
            displayImageUri,
            cachedAt: Date.now(),
          };
          
          await cacheFullDetails(userId, offlineCacheId, cacheData);
          console.log('✅ Cached full details for offline access');
        } catch (error) {
          console.error('❌ Failed to cache details:', error);
        }
      }
    } catch (error) {
      console.error('Error fetching additional details:', error);
      setFullDescription(stripHtmlTags(cleanAboutText));
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const fetchWikipediaData = async (speciesName) => {
    try {
      const fullArticleResponse = await axios.get(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(speciesName)}&prop=extracts&explaintext=true&exsectionformat=plain&format=json&origin=*`,
        { 
          timeout: 25000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );
      
      const pages = fullArticleResponse.data?.query?.pages;
      const pageId = Object.keys(pages)[0];
      let fullExtract = pages[pageId]?.extract || '';
      
      if (fullExtract && fullExtract.length > 300) {
        fullExtract = stripHtmlTags(fullExtract);
        fullExtract = fullExtract.replace(/\.{3,}/g, '');
        fullExtract = fullExtract.replace(/\[\d+\]/g, '');
        fullExtract = fullExtract.replace(/\[citation needed\]/gi, '');
        fullExtract = fullExtract.replace(/==\s*(See also|References|External links|Further reading|Notes|Citations|Bibliography|Sources)[\s\S]*$/gi, '');
        fullExtract = fullExtract.replace(/==+\s*.*?\s*==+/g, '');
        fullExtract = fullExtract.replace(/\n{3,}/g, '\n\n');
        fullExtract = fullExtract.replace(/\s{2,}/g, ' ');

        if (fullExtract && !fullExtract.match(/[.!?]$/)) {
          const lastPeriod = fullExtract.lastIndexOf('.');
          if (lastPeriod > 0) {
            fullExtract = fullExtract.substring(0, lastPeriod + 1);
          } else {
            fullExtract += '.';
          }
        }

        if (fullExtract.length > 800) {
          console.log(`✓ Fetched comprehensive Wikipedia article: ${fullExtract.length} characters`);
          return {
            fullDescription: fullExtract.trim(),
            habitat: extractHabitat(fullExtract),
            distribution: extractDistribution(fullExtract),
            characteristics: extractCharacteristics(fullExtract),
            behavior: extractBehavior(fullExtract),
            uses: extractUses(fullExtract),
          };
        }
      }

      const revisionResponse = await axios.get(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(speciesName)}&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*&formatversion=2&explaintext=true`,
        { timeout: 20000 }
      );
      
      const revisionContent = revisionResponse.data?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content;
      if (revisionContent && revisionContent.length > 500) {
        let plainText = revisionContent
          .replace(/\{\{[^}]+\}\}/g, '')
          .replace(/\[\[([^|\]]+\|)?([^\]]+)\]\]/g, '$2')
          .replace(/<[^>]+>/g, '')
          .replace(/'{2,}/g, '')
          .replace(/^[=]+.*[=]+$/gm, '')
          .replace(/\[\d+\]/g, '');

        plainText = stripHtmlTags(plainText);
        plainText = plainText.replace(/\.{3,}/g, '').replace(/\n{3,}/g, '\n\n').trim();

        if (plainText.length > 800) {
          console.log(`✓ Fetched Wikipedia revision content: ${plainText.length} characters`);
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

      const summaryResponse = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(speciesName)}`,
        { timeout: 8000 }
      );

      let extract = summaryResponse.data?.extract || '';
      extract = stripHtmlTags(extract);
      extract = extract.replace(/\.{3,}/g, '').replace(/\[\d+\]/g, '');

      if (extract && !extract.match(/[.!?]$/)) {
        extract += '.';
      }

      console.log(`✓ Fetched Wikipedia summary: ${extract.length} characters`);
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

  const fetchWikipediaInfobox = async (speciesName) => {
    try {
      const response = await axios.get(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(speciesName)}&prop=revisions&rvprop=content&rvslots=main&format=json&origin=*&formatversion=2`,
        { 
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      const content = response.data?.query?.pages?.[0]?.revisions?.[0]?.slots?.main?.content || '';
      const infoboxMatch = content.match(/\{\{[^|]*Infobox[^}]*\}\}/s);
      
      if (infoboxMatch) {
        const infoboxText = stripHtmlTags(infoboxMatch[0]).replace(/[{}|=]/g, ' ').trim();
        return {
          description: infoboxText,
          characteristics: extractCharacteristics(infoboxText),
          taxonomy: infoboxText.substring(0, 300),
        };
      }

      return null;
    } catch (error) {
      console.warn('Infobox fetch failed:', error.message);
      return null;
    }
  };

  const fetchGBIFOccurrence = async (usageKey) => {
    try {
      const response = await axios.get(
        `https://api.gbif.org/v1/occurrence/search?taxonKey=${usageKey}&limit=0`,
        { timeout: 5000 }
      );
    } catch (error) {
      console.warn('GBIF occurrence fetch failed:', error.message);
      return null;
    }
  };

  const fetchEOLData = async (speciesName) => {
    try {
      const searchResponse = await axios.get(
        `https://eol.org/api/search/1.0.json?q=${encodeURIComponent(speciesName)}&page=1`,
        { timeout: 8000 }
      );
      
      if (searchResponse.data?.results?.length > 0) {
        const eolId = searchResponse.data.results[0].id;
        
        const detailResponse = await axios.get(
          `https://eol.org/api/pages/1.0/${eolId}.json?details=true`,
          { timeout: 8000 }
        );
        
        const dataObjects = detailResponse.data?.dataObjects || [];
        const descriptions = dataObjects
          .filter(obj => obj.dataType === 'http://purl.org/dc/dcmitype/Text')
          .map(obj => stripHtmlTags(obj.description || obj.richDescription || ''))
          .filter(d => d && d.length > 100);

        return {
          habitat: descriptions.find(d => d.toLowerCase().includes('habitat')) || descriptions[0],
          behavior: descriptions.find(d => d.toLowerCase().includes('behav')) || descriptions[1],
          uses: descriptions.find(d => d.toLowerCase().includes('use')) || descriptions[2],
        };
      }
    } catch (error) {
      console.warn('EOL fetch failed:', error.message);
    }
    return null;
  };

  // User Interaction Functions
  const saveToHistory = async () => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        console.log('User not authenticated, skipping history save');
        return;
      }

      const historyEntry = {
        plantName: commonName || scientificName,
        name: commonName || scientificName,
        scientificName: scientificName,
        commonName: commonName,
        rank: rank,
        iconicTaxon: iconicTaxon,
        taxonId: taxonId,
        imageUri: photoUri,
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

  const toggleFavorite = async () => {
    if (isTogglingFavorite) {
      console.log('Already processing favorite...');
      return;
    }

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        Alert.alert('Authentication Required', 'Please log in to add favorites.');
        return;
      }

      setIsTogglingFavorite(true);

      if (isFavorite && favoriteId) {
        const result = await removeFromFavorites(uid, favoriteId);
        
        if (result.success) {
          setIsFavorite(false);
          setFavoriteId(null);
          Alert.alert('Removed', `${commonName || scientificName} has been removed from favorites.`);
        } else {
          Alert.alert('Error', 'Failed to remove from favorites. Please try again.');
        }
      } else {
        const { getFavorites } = require('@services/firebase');
        const favoritesResult = await getFavorites(uid);
        
        if (favoritesResult.success) {
          const alreadyExists = favoritesResult.data.find(
            fav => (fav.scientificName === scientificName) || 
                  (fav.taxonId && fav.taxonId === taxonId)
          );
          
          if (alreadyExists) {
            setIsFavorite(true);
            setFavoriteId(alreadyExists.id);
            console.log('Already in favorites, not adding again');
            return;
          }
        }

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
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleBackPress = () => {
    Speech.stop();
    navigation.goBack();
  };

  // ✅ DOWNLOAD LIMIT FIX: Improved handleDownloadPDF function
  const handleDownloadPDF = async () => {
    const user = auth.currentUser;

    // ✅ Check 1: User must be authenticated
    if (!user || !user.email) {
      Alert.alert(
        "Authentication Required",
        "Please log in to download PDFs.",
        [{ text: "OK" }]
      );
      return;
    }

    // ✅ Check 2: Guest users cannot download
    if (isGuestUser(user)) {
      Alert.alert(
        "📥 Downloads Unavailable",
        "Please sign up for a free account to download species information!",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      // ✅ Check 3: Get usage limits
      const limits = await getUsageLimits(user.uid);
      setUsageLimits(limits);

      // ✅ Check 4: Check if user can download
      const downloadCheck = await canDownload(user.uid);

      if (!downloadCheck.success) {
        Alert.alert("Error", "Failed to check download limit. Please try again.");
        return;
      }

      // ✅ Check 5: If not unlimited and no downloads remaining, show premium gate
      if (!downloadCheck.unlimited && !downloadCheck.canDownload) {
        console.log('❌ Download limit reached');
        setShowPremiumGate(true);
        return;
      }

      // ✅ Check 6: User can download - show confirmation
      console.log(`✅ Download allowed (${downloadCheck.downloadsRemaining || '∞'} remaining)`);

    } catch (error) {
      console.error('❌ Error checking download limit:', error);
      Alert.alert("Error", "Failed to check download limit. Please try again.");
      return;
    }

    // ✅ START DOWNLOAD PROCESS
    setIsGeneratingPDF(true);

    try {
      const pdfData = {
        email: user.email,
        speciesData: {
          commonName: commonName || 'N/A',
          scientificName: scientificName || 'N/A',
          rank: rank || 'N/A',
          iconicTaxon: iconicTaxon || 'N/A',
          taxonomy: taxonomy || [],
          fullDescription: fullDescription || 'No description available.',
          habitat: additionalInfo.habitat || 'N/A',
          distribution: additionalInfo.distribution || 'N/A',
          characteristics: additionalInfo.characteristics || 'N/A',
          behavior: additionalInfo.behavior || 'N/A',
          conservation: conservation || 'N/A',
          uses: additionalInfo.uses || 'N/A',
          imageUrl: displayImageUri || null,
        },
      };

      const response = await axios.post(PDF_BACKEND_URL, pdfData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 200) {
        // ✅ SUCCESS! Now decrement download count
        const limits = await getUsageLimits(user.uid);
        
        if (!limits.unlimited) {
          const decrementResult = await decrementDownloadCount(user.uid);
          
          if (decrementResult.success) {
            console.log(`✅ Download count decremented (${decrementResult.downloadsRemaining} remaining)`);
            
            // Update local state
            setUsageLimits({
              ...limits,
              downloadsRemaining: decrementResult.downloadsRemaining,
            });

            // ✅ Show warning if low on downloads
            if (decrementResult.downloadsRemaining === 1) {
              Alert.alert(
                'Success',
                `The PDF has been generated and sent to your email!\n\n⚠️ You have ${decrementResult.downloadsRemaining} download remaining. Resets in ${decrementResult.hoursUntilReset} hours.`,
                [{ text: 'OK' }]
              );
            } else if (decrementResult.downloadsRemaining === 0) {
              Alert.alert(
                'Success',
                `The PDF has been generated and sent to your email!\n\n⚠️ You've used all your downloads. Resets in ${decrementResult.hoursUntilReset} hours.`,
                [{ text: 'OK' }]
              );
            } else {
              Alert.alert('Success', 'The PDF has been generated and sent to your email!');
            }
          } else {
            Alert.alert('Success', 'The PDF has been generated and sent to your email!');
          }
        } else {
          Alert.alert('Success', 'The PDF has been generated and sent to your email!');
        }

        // ✅ Create download notification
        try {
          const downloaderUsername = user.displayName ||
            user.email?.split('@')[0] || 'User';

          const itemData = {
            name: commonName || scientificName,
            scientificName: scientificName,
            imageUrl: displayImageUri,
            iconicTaxon: iconicTaxon,
          };

          const postId = route.params?.postId || null;
          const originalUserId = route.params?.originalUserId || null;

          if (postId && originalUserId && originalUserId !== user.uid) {
            await createDownloadNotification(
              postId,
              originalUserId,
              user.uid,
              downloaderUsername,
              itemData
            );
            console.log('✅ Download notification created');
          }
        } catch (notifError) {
          console.warn('⚠️ Failed to create download notification:', notifError);
        }

      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getDescriptionPreview = () => {
    if (fullDescription.length <= DESCRIPTION_PREVIEW_LENGTH) {
      return fullDescription;
    }
    
    const preview = fullDescription.substring(0, DESCRIPTION_PREVIEW_LENGTH);
    const lastPeriod = preview.lastIndexOf('.');
    const lastQuestion = preview.lastIndexOf('?');
    const lastExclamation = preview.lastIndexOf('!');
    
    const lastPunctuation = Math.max(lastPeriod, lastQuestion, lastExclamation);
    
    if (lastPunctuation > DESCRIPTION_PREVIEW_LENGTH * 0.7) {
      return fullDescription.substring(0, lastPunctuation + 1);
    }
    
    return preview + '...';
  };

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2D5016', '#4A7C59', '#6B8E23']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ✅ NEW: Offline Mode Banner */}
      {isOffline && canAccessOffline && (
        <View style={styles.offlineBanner}>
          <BlurView intensity={60} tint="dark" style={styles.offlineBannerBlur}>
            <Ionicons name="cloud-offline" size={16} color="#FFA726" />
            <Text style={styles.offlineBannerText}>Offline Mode - Cached Data</Text>
          </BlurView>
        </View>
      )}

      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          {displayImageUri ? (
            <Image source={{ uri: displayImageUri }} style={styles.heroImage} />
          ) : (
            <View style={[styles.heroImage, styles.heroPlaceholder]}>
              <Ionicons name="leaf" size={80} color="rgba(255,255,255,0.3)" />
            </View>
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(45,80,22,0.9)']}
            style={styles.heroGradient}
          />

          <View style={styles.heroContent}>
            <Text style={styles.speciesName}>{displayCommonName}</Text>
            {showBothNames && (
              <Text style={styles.speciesScientific}>{displayScientificName}</Text>
            )}
            
            <View style={styles.badges}>
              {confidence && (
                <View style={styles.badge}>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={styles.badgeText}>{confidence}% Match</Text>
                </View>
              )}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{iconicTaxon}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{rank}</Text>
              </View>
            </View>
          </View>

         
        </View>

        {/* Stats Card */}
        <AnimatedGlassCard delay={100} style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {confidence ? `${confidence}%` : '—'}
              </Text>
              <Text style={styles.statLabel}>CONFIDENCE</Text>
            </View>
          </View>
        </AnimatedGlassCard>

        {/* Description Card */}
        <AnimatedGlassCard delay={200} style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={styles.iconBadge}>
              <Ionicons name="book" size={20} color="#6B8E23" />
            </View>
            <Text style={styles.sectionTitle}>Overview</Text>
          </View>
          {isLoadingDetails ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.loadingText}>Loading description...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.descriptionText}>
                {isDescriptionExpanded ? fullDescription : getDescriptionPreview()}
              </Text>
              {fullDescription.length > DESCRIPTION_PREVIEW_LENGTH && (
                <TouchableOpacity
                  style={styles.expandButton}
                  onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                >
                  <Text style={styles.expandText}>
                    {isDescriptionExpanded ? 'Show Less' : 'Read More'}
                  </Text>
                  <Ionicons
                    name={isDescriptionExpanded ? "chevron-up" : "chevron-down"}
                    size={16}
                    color="#6B8E23"
                  />
                </TouchableOpacity>
              )}
            </>
          )}
        </AnimatedGlassCard>

        {/* Characteristics */}
        {additionalInfo.characteristics && additionalInfo.characteristics !== 'Physical characteristics not available' && (
          <AnimatedGlassCard delay={300} style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(139, 195, 74, 0.2)' }]}>
                <Ionicons name="eye" size={20} color="#8BC34A" />
              </View>
              <Text style={styles.sectionTitle}>Physical Characteristics</Text>
            </View>
            <Text style={styles.descriptionText}>{additionalInfo.characteristics}</Text>
          </AnimatedGlassCard>
        )}

        {/* Habitat & Distribution */}
        <AnimatedGlassCard delay={400} style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconBadge, { backgroundColor: 'rgba(102, 187, 106, 0.2)' }]}>
              <Ionicons name="location" size={20} color="#66BB6A" />
            </View>
            <Text style={styles.sectionTitle}>Habitat & Distribution</Text>
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Habitat:</Text>
            <Text style={styles.descriptionText}>{additionalInfo.habitat}</Text>
          </View>
          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>Distribution:</Text>
            <Text style={styles.descriptionText}>{additionalInfo.distribution}</Text>
          </View>
        </AnimatedGlassCard>

        {/* Behavior */}
        {additionalInfo.behavior && additionalInfo.behavior !== 'Behavior information not available' && (
          <AnimatedGlassCard delay={500} style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(205, 220, 57, 0.2)' }]}>
                <Ionicons name="flash" size={20} color="#CDDC39" />
              </View>
              <Text style={styles.sectionTitle}>Behavior & Ecology</Text>
            </View>
            <Text style={styles.descriptionText}>{additionalInfo.behavior}</Text>
          </AnimatedGlassCard>
        )}

        {/* Conservation */}
        {conservation && (
          <AnimatedGlassCard delay={600} style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(129, 199, 132, 0.2)' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#81C784" />
              </View>
              <Text style={styles.sectionTitle}>Conservation Status</Text>
            </View>
            <View style={styles.conservationBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#81C784" />
              <Text style={styles.conservationText}>{conservation}</Text>
            </View>
          </AnimatedGlassCard>
        )}

        {/* Uses */}
        {additionalInfo.uses && additionalInfo.uses !== 'Usage information not available' && (
          <AnimatedGlassCard delay={700} style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(156, 204, 101, 0.2)' }]}>
                <Ionicons name="information-circle-outline" size={20} color="#9CCC65" />
              </View>
              <Text style={styles.sectionTitle}>Uses & Importance</Text>
            </View>
            <Text style={styles.descriptionText}>{additionalInfo.uses}</Text>
          </AnimatedGlassCard>
        )}

        {/* Alternative Names */}
        {additionalInfo.alternativeNames.length > 0 && (
          <AnimatedGlassCard delay={800} style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(174, 213, 129, 0.2)' }]}>
                <Ionicons name="language" size={20} color="#AED581" />
              </View>
              <Text style={styles.sectionTitle}>Alternative Names</Text>
            </View>
            <View style={styles.namesList}>
              {additionalInfo.alternativeNames.slice(0, 5).map((name, idx) => (
                <View key={idx} style={styles.nameItem}>
                  <Text style={styles.nameLabel}>{name.locale || 'Common'}:</Text>
                  <Text style={styles.nameValue}>{name.name}</Text>
                </View>
              ))}
            </View>
          </AnimatedGlassCard>
        )}

        {/* Taxonomy */}
        {taxonomy.length > 0 && (
          <AnimatedGlassCard delay={900} style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBadge, { backgroundColor: 'rgba(124, 179, 66, 0.2)' }]}>
                <Ionicons name="git-branch" size={20} color="#7CB342" />
              </View>
              <Text style={styles.sectionTitle}>Taxonomy</Text>
            </View>
            <View style={styles.taxonomyList}>
              {taxonomy.map((item, idx) => (
                <View key={idx} style={styles.taxonomyItem}>
                  <Text style={styles.taxonomyLabel}>{item.label}</Text>
                  <Text style={styles.taxonomyValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </AnimatedGlassCard>
        )}

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      <Animated.View style={[styles.fixedHeader, { opacity: headerOpacity }]}>
        <BlurView intensity={80} tint="dark" style={styles.fixedHeaderBlur}>
          <Text style={styles.fixedHeaderText} numberOfLines={1}>
            {displayCommonName}
          </Text>
        </BlurView>
      </Animated.View>

      <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
        <BlurView intensity={60} tint="dark" style={styles.backButtonBlur}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </BlurView>
      </TouchableOpacity>

     <Animated.View 
  style={[
    styles.fabContainer,
    { transform: [{ scale: scaleAnim }] }
  ]}
>
  {/* ✅ NEW: Favorite Button */}
  <TouchableOpacity
    style={[styles.fab, isFavorite && styles.fabFavoriteActive]}
    onPress={toggleFavorite}
    disabled={isTogglingFavorite}
  >
    <LinearGradient
      colors={isFavorite ? ['#ef4444', '#dc2626'] : ['#6B8E23', '#556B2F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fabGradient}
    >
      {isTogglingFavorite ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Ionicons 
          name={isFavorite ? "heart" : "heart-outline"} 
          size={24} 
          color="#fff" 
        />
      )}
    </LinearGradient>
  </TouchableOpacity>

  {/* Download Button */}
  <TouchableOpacity
    style={[styles.fab, styles.fabSecondary]}
    onPress={handleDownloadPDF}
    disabled={isGeneratingPDF}
  >
    <LinearGradient
      colors={['#6B8E23', '#556B2F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fabGradient}
    >
      {isGeneratingPDF ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Ionicons name="download" size={24} color="#fff" />
      )}
    </LinearGradient>
  </TouchableOpacity>

  {/* Text-to-Speech Button */}
  <TouchableOpacity
    style={styles.fab}
    onPress={handleSpeech}
  >
    <LinearGradient
      colors={['#6B8E23', '#556B2F']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fabGradient}
    >
      <Ionicons name={isSpeaking ? "pause" : "volume-high"} size={24} color="#fff" />
    </LinearGradient>
  </TouchableOpacity>
</Animated.View>

      {/* ✅ DOWNLOAD LIMIT FIX: Premium Gate with correct props */}
      <PremiumGate
        visible={showPremiumGate}
        onClose={() => setShowPremiumGate(false)}
        onUpgrade={() => {
          setShowPremiumGate(false);
          navigation.navigate('PlanScreen');
        }}
        limitType="download"
        hoursUntilReset={usageLimits?.hoursUntilReset || 0}
        scansRemaining={usageLimits?.scansRemaining || 0}
        downloadsRemaining={usageLimits?.downloadsRemaining || 0}
      />
      
      {/* ✅ NEW: Offline Premium Gate */}
      <PremiumGate
        visible={showOfflinePremiumGate}
        onClose={() => {
          setShowOfflinePremiumGate(false);
          navigation.goBack();
        }}
        onUpgrade={() => {
          setShowOfflinePremiumGate(false);
          navigation.navigate('PlanScreen');
        }}
        limitType="offline"
        hoursUntilReset={0}
        scansRemaining={0}
        downloadsRemaining={0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A2E0A',
  },
  // ✅ NEW: Offline banner styles
  offlineBanner: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  offlineBannerBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  offlineBannerText: {
    color: '#FFA726',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroSection: {
    height: 500,
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2D5016',
  },
  heroPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 250,
  },
  heroContent: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  speciesName: {
    fontSize: 36,
    bottom: 15,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  speciesScientific: {
    fontSize: 18,
    bottom: 15,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    bottom: 18,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 142, 35, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.4)',
    gap: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  heroActions: {
    position: 'absolute',
    top: 60,
    right: 20,
    gap: 12,
  },

  
  glassCard: {
    borderRadius: 24,
    padding: 24,
    backgroundColor: 'rgba(107, 142, 35, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.25)',
    overflow: 'hidden',
  },
  statsCard: {
    marginHorizontal: 20,
    marginTop: -40,
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
    letterSpacing: 1,
  },
  sectionCard: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(107, 142, 35, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.3)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.2,
  },
  loadingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 10,
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    gap: 6,
  },
  expandText: {
    color: '#8BC34A',
    fontSize: 15,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  conservationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(129, 199, 132, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(129, 199, 132, 0.4)',
  },
  conservationText: {
    color: '#81C784',
    fontSize: 16,
    fontWeight: '700',
  },
  namesList: {
    gap: 12,
  },
  nameItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 195, 74, 0.2)',
  },
  nameLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
    width: 100,
  },
  nameValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  taxonomyList: {
    gap: 12,
  },
  taxonomyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 195, 74, 0.2)',
  },
  taxonomyLabel: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '500',
  },
  taxonomyValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 10,
  },
  fixedHeaderBlur: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 12,
    paddingHorizontal: 60,
  },
  fixedHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 11,
  },
  backButtonBlur: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139, 195, 74, 0.3)',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    gap: 16,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabSecondary: {
    shadowColor: '#6B8E23',
  },
  fabFavoriteActive: {
  shadowColor: '#ef4444',
},
  fabGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

});