// src/hooks/useHomeFeed.js
import { useState, useCallback, useEffect } from 'react';
import { getPublicScans, getTrendingSpecies } from '@services/firebase';
import { getPostStats } from '@services/notifications/postInteractionsService';
import stripHtmlTags from '@utils/text/stripHtmlTags';
import { pickSpeciesName } from '@utils/text/speciesName';
import { subscribePublicFeedUpdates } from '@utils/publicFeedEvents';

export default function useHomeFeed() {
  const [publicScans, setPublicScans] = useState([]);
  const [trendingSpecies, setTrendingSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postStats, setPostStats] = useState({});
  const removeFromFeed = useCallback((historyId) => {
    setPublicScans(prev =>
      prev.filter(post => post.id !== historyId && post.historyId !== historyId)
    );
    setPostStats(prev => {
      if (!prev || !historyId) return prev;
      const next = { ...prev };
      delete next[historyId];
      return next;
    });
  }, []);

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const hasValidMediaAndDescription = (item) => {
    const hasImage = !!item?.imageUrl;
    const cleaned = stripHtmlTags(item?.about || item?.description || '');
    const hasDescription = !!cleaned && !/^no description available/i.test(cleaned);
    return hasImage && hasDescription;
  };

  const getSpeciesKey = (item) => {
    if (item?.taxonId) return `taxon_${item.taxonId}`;
    const fallback = pickSpeciesName(item?.scientificName, item?.commonName, item?.name);
    return fallback ? fallback.toLowerCase().trim().replace(/\s+/g, '_') : null;
  };

  const getTimestamp = (item) => {
    const value = item?.publishedAt || item?.createdAt || item?.timestamp;
    if (typeof value === 'number') return value;
    if (value?.toMillis && typeof value.toMillis === 'function') return value.toMillis();
    if (value?.getTime && typeof value.getTime === 'function') return value.getTime();
    return 0;
  };

  const dedupeByUserAndSpecies = (items) => {
    const sorted = [...items].sort((a, b) => getTimestamp(b) - getTimestamp(a));
    const seen = new Set();
    const deduped = [];
    for (const item of sorted) {
      const userId = item?.userId || 'unknown_user';
      const speciesKey = getSpeciesKey(item) || 'unknown_species';
      const key = `${userId}:${speciesKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }
    return deduped;
  };

  useEffect(() => {
    const unsubscribe = subscribePublicFeedUpdates((event) => {
      if (event?.type === 'remove' && event.historyId) {
        removeFromFeed(event.historyId);
      }
    });
    return unsubscribe;
  }, [removeFromFeed]);

  // ✅ Sort trending species by count (descending)
  const sortTrendingByCount = (species) => {
    return [...species].sort((a, b) => (b.count || 0) - (a.count || 0));
  };

  // ✅ OPTIMIZED: Load stats in parallel (was sequential before!)
  const loadPostStats = async (posts) => {
    try {
      const statsPromises = posts.map(post => getPostStats(post.id));
      const statsResults = await Promise.all(statsPromises);
      
      const stats = {};
      posts.forEach((post, index) => {
        stats[post.id] = statsResults[index];
      });
      setPostStats(stats);
    } catch (error) {
      console.error('Error loading post stats:', error);
    }
  };

  const loadPublicScans = useCallback(async () => {
    try {
      const result = await getPublicScans();
      if (result.success) {
        const filtered = result.data.filter(hasValidMediaAndDescription);
        const deduped = dedupeByUserAndSpecies(filtered);
        const shuffledData = shuffleArray(deduped);
        setPublicScans(shuffledData);
        await loadPostStats(shuffledData);
      }
    } catch (error) {
      console.error('Error loading public scans:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTrendingSpecies = useCallback(async () => {
    try {
      const result = await getTrendingSpecies(10);
      if (result.success) {
        // ✅ Sort by count before setting state
        const sortedSpecies = sortTrendingByCount(result.data);
        setTrendingSpecies(sortedSpecies);
      }
    } catch (error) {
      console.error('Error loading trending species:', error);
    }
  }, []);

  const onRefresh = useCallback(async (loadUnreadCount) => {
    setRefreshing(true);
    try {
      const promises = [
        getPublicScans(),
        getTrendingSpecies(10),
      ];

      if (loadUnreadCount) {
        promises.push(loadUnreadCount());
      }

      const [scansResult, trendingResult] = await Promise.all(promises);

      if (scansResult.success) {
        const filtered = scansResult.data.filter(hasValidMediaAndDescription);
        const deduped = dedupeByUserAndSpecies(filtered);
        const shuffledData = shuffleArray(deduped);
        setPublicScans(shuffledData);
        await loadPostStats(shuffledData);
      }

      if (trendingResult.success) {
        // ✅ Sort by count before setting state
        const sortedSpecies = sortTrendingByCount(trendingResult.data);
        setTrendingSpecies(sortedSpecies);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const updatePostStats = (postId, newStats) => {
    setPostStats(prev => ({
      ...prev,
      [postId]: {
        ...prev[postId],
        ...newStats
      }
    }));
  };

  return {
    publicScans,
    trendingSpecies,
    loading,
    refreshing,
    postStats,
    loadPublicScans,
    loadTrendingSpecies,
    onRefresh,
    updatePostStats,
  };
}
