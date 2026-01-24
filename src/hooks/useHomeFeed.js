// src/hooks/useHomeFeed.js
import { useState, useCallback } from 'react';
import { getPublicScans, getTrendingSpecies } from '@services/firebase';
import { getPostStats } from '@services/notifications/postInteractionsService';

export default function useHomeFeed() {
  const [publicScans, setPublicScans] = useState([]);
  const [trendingSpecies, setTrendingSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postStats, setPostStats] = useState({});

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

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
        const shuffledData = shuffleArray(result.data);
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
        const shuffledData = shuffleArray(scansResult.data);
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