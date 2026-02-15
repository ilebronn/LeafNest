// src/screens/Main/HomeScreen/index.js
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import NetInfo from '@react-native-community/netinfo';
import { auth } from '@config/firebase';
import { likePost, getPostStats } from '@services/notifications/postInteractionsService';
import { CommentsModal, PremiumGate } from '@components/modals';
import { useFocusEffect } from '@react-navigation/native';
import { createDownloadNotification, getUnreadNotificationCount } from '@services/notifications/notificationService';
import axios from 'axios';
import useHomeFeed from '@hooks/useHomeFeed';
import FeedPost from '@components/common/Card/FeedPost';
import TrendingCard from '@components/common/Card/TrendingCard';
import { isGuestUser } from '@utils/guest';
import { 
  canDownload, 
  decrementDownloadCount,
  getUsageLimits 
} from '@services/subscription/subscriptionService';

const API_URLS = {
  PDF_GENERATOR: 'https://us-central1-leafnest-98408.cloudfunctions.net/generatePdfAndEmail'
};

// Coerce common timestamp shapes into a valid Date (or null if invalid).
// Examples:
// coerceToDate(1700000000000)
// coerceToDate("2024-01-01T00:00:00Z")
// coerceToDate({ seconds: 1700000000, nanoseconds: 0 })
const coerceToDate = (input) => {
  if (!input) return null;

  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  if (typeof input === 'number') {
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof input === 'string') {
    const date = new Date(input);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof input === 'object') {
    if (typeof input.toDate === 'function') {
      const date = input.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    }

    if (typeof input.toMillis === 'function') {
      const date = new Date(input.toMillis());
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof input.seconds === 'number') {
      const nanos = typeof input.nanoseconds === 'number' ? input.nanoseconds : 0;
      const date = new Date((input.seconds * 1000) + (nanos / 1e6));
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
};

export default function HomeScreen({ route, navigation }) {
  const { t, i18n } = useTranslation();
  const [isGuest, setIsGuest] = useState(true);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [likeAnimations, setLikeAnimations] = useState({});
  const [downloadingPosts, setDownloadingPosts] = useState({});
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [showPremiumGate, setShowPremiumGate] = useState(false);
  const [usageLimits, setUsageLimits] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  
  const hasLoadedInitially = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const downloadingPostIdsRef = useRef(new Set());

  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid || null;
  const fallbackUsername = t('home.feed.unknownUser');
  const currentUsername = currentUser?.displayName || currentUser?.email?.split('@')[0] || fallbackUsername;

  const scanButtonRef = route?.params?.scanButtonRef;
  const notificationButtonRef = route?.params?.notificationButtonRef;

  const {
    publicScans,
    trendingSpecies,
    loading,
    refreshing,
    postStats,
    loadPublicScans,
    loadTrendingSpecies,
    onRefresh,
    updatePostStats,
  } = useHomeFeed();

  useEffect(() => {
    const user = auth.currentUser;
    const guestParam = route?.params?.guest;
    const userIsGuest = !user || guestParam === true;
    setIsGuest(userIsGuest);
  }, [route?.params?.guest]);

  const loadUnreadCount = useCallback(async () => {
    if (!currentUserId) {
      setUnreadNotifCount(0);
      return;
    }

    try {
      const result = await getUnreadNotificationCount(currentUserId);
      if (result.success) {
        setUnreadNotifCount(result.count);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      if (currentUserId) {
        loadUnreadCount();
      }

      if (!hasLoadedInitially.current) {
        loadPublicScans();
        loadTrendingSpecies();
        hasLoadedInitially.current = true;
      }
    }, [currentUserId, loadUnreadCount, loadPublicScans, loadTrendingSpecies])
  );

  useEffect(() => {
    if (!currentUserId) return;

    loadUnreadCount();
    const intervalId = setInterval(() => {
      loadUnreadCount();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [currentUserId, loadUnreadCount]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const syncNetworkStatus = async () => {
      const state = await NetInfo.fetch();
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOffline(!online);
    };

    syncNetworkStatus();
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected && state.isInternetReachable !== false;
      setIsOffline(!online);
    });

    return () => unsubscribe();
  }, []);

  const handleRefresh = useCallback(async () => {
    await onRefresh(loadUnreadCount);
  }, [onRefresh, loadUnreadCount]);

  const formatDate = useCallback((timestamp) => {
    const date = coerceToDate(timestamp);
    if (!date) return ''; // Safeguard against invalid/missing timestamps
    const now = new Date();
    const diffInSeconds = Math.max(0, (now - date) / 1000);

    if (diffInSeconds < 60) return t('home.relativeTime.justNow');
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return t('home.relativeTime.minutes', { count: minutes });
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return t('home.relativeTime.hours', { count: hours });
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return t('home.relativeTime.days', { count: days });
    }

    const locale = i18n?.language && i18n.language !== 'en' ? i18n.language : undefined;
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  }, [t, i18n]);

  const getLikesLabel = useCallback((count) => {
    if (!count) return t('home.feed.beFirst');
    return t('home.feed.likesCount', { count });
  }, [t]);

  const getCommentsLabel = useCallback((count) => {
    return t('home.feed.viewComments', { count });
  }, [t]);

  const handleDownloadPDF = useCallback(async (item) => {
    const postId = item?.id;
    if (!postId) return;

    // Guard early to prevent rapid-tap double starts.
    if (downloadingPostIdsRef.current.has(postId)) return;
    downloadingPostIdsRef.current.add(postId);
    setDownloadingPosts(prev => ({ ...prev, [postId]: true }));

    try {
      if (!currentUser || !currentUser.email) {
        Alert.alert(
          t('home.alerts.authRequiredTitle'),
          t('home.alerts.authRequiredBody'),
          [{ text: t('common.ok') }]
        );
        return;
      }

      if (isGuestUser(currentUser)) {
        Alert.alert(
          t('home.alerts.downloadsUnavailableTitle'),
          t('home.alerts.downloadsUnavailableBody'),
          [{ text: t('common.ok') }]
        );
        return;
      }

      try {
        const limits = await getUsageLimits(currentUser.uid);
        setUsageLimits(limits);

        const downloadCheck = await canDownload(currentUser.uid);

        if (!downloadCheck.success) {
          Alert.alert(t('common.error'), t('home.alerts.downloadLimitCheckErrorBody'));
          return;
        }

        if (!downloadCheck.unlimited && !downloadCheck.canDownload) {
          console.log('❌ Download limit reached');
          setShowPremiumGate(true);
          return;
        }

        console.log(`✅ Download allowed (${downloadCheck.downloadsRemaining || '∞'} remaining)`);
      } catch (error) {
        console.error('❌ Error checking download limit:', error);
        Alert.alert(t('common.error'), t('home.alerts.downloadLimitCheckErrorBody'));
        return;
      }

      const pdfData = {
        email: currentUser.email,
        speciesData: {
          commonName: item.commonName || item.name || t('home.pdf.defaultCommon'),
          scientificName: item.scientificName || item.name || t('home.pdf.defaultScientific'),
          rank: item.rank || t('home.pdf.defaultRank'),
          iconicTaxon: item.iconicTaxon || t('home.pdf.defaultTaxon'),
          taxonomy: item.taxonomy || [],
          fullDescription: item.about || item.description || t('home.pdf.noDescription'),
          habitat: item.habitat || t('home.pdf.infoUnavailable'),
          distribution: item.distribution || t('home.pdf.infoUnavailable'),
          characteristics: item.characteristics || t('home.pdf.infoUnavailable'),
          behavior: item.behavior || t('home.pdf.infoUnavailable'),
          conservation: item.conservation || t('home.pdf.notEvaluated'),
          uses: item.uses || t('home.pdf.infoUnavailable'),
          imageUrl: item.imageUrl || null,
        },
      };

      const response = await axios.post(API_URLS.PDF_GENERATOR, pdfData, {
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.status === 200) {
        const limits = await getUsageLimits(currentUser.uid);
        
        if (!limits.unlimited) {
          const decrementResult = await decrementDownloadCount(currentUser.uid);
          
          if (decrementResult.success) {
            console.log(`✅ Download count decremented (${decrementResult.downloadsRemaining} remaining)`);
            
            setUsageLimits({
              ...limits,
              downloadsRemaining: decrementResult.downloadsRemaining,
            });

            if (decrementResult.downloadsRemaining === 1) {
              Alert.alert(
                t('home.alerts.pdfSuccessTitle'),
                `${t('home.alerts.pdfSuccessBody')}\n\n⚠️ You have 1 download remaining. Resets in ${decrementResult.hoursUntilReset} hours.`,
                [{ text: t('common.ok') }]
              );
            } else if (decrementResult.downloadsRemaining === 0) {
              Alert.alert(
                t('home.alerts.pdfSuccessTitle'),
                `${t('home.alerts.pdfSuccessBody')}\n\n⚠️ You've used all your downloads. Resets in ${decrementResult.hoursUntilReset} hours.`,
                [{ text: t('common.ok') }]
              );
            } else {
              Alert.alert(
                t('home.alerts.pdfSuccessTitle'),
                t('home.alerts.pdfSuccessBody'),
                [{ text: t('common.ok') }]
              );
            }
          } else {
            Alert.alert(
              t('home.alerts.pdfSuccessTitle'),
              t('home.alerts.pdfSuccessBody'),
              [{ text: t('common.ok') }]
            );
          }
        } else {
          Alert.alert(
            t('home.alerts.pdfSuccessTitle'),
            t('home.alerts.pdfSuccessBody'),
            [{ text: t('common.ok') }]
          );
        }

        try {
          const downloaderUsername = currentUser.displayName || currentUser.email?.split('@')[0] || fallbackUsername;
          await createDownloadNotification(
            item.id,
            item.userId,
            currentUserId,
            downloaderUsername,
            item
          );
          console.log('✅ Download notification created');
        } catch (notifError) {
          console.warn('⚠️ Failed to create download notification:', notifError);
        }

      } else {
        throw new Error(t('home.alerts.pdfErrorBody'));
      }
    } catch (error) {
      console.error('❌ PDF generation error:', error);
      Alert.alert(
        t('home.alerts.pdfErrorTitle'),
        t('home.alerts.pdfErrorBody'),
        [{ text: t('common.ok') }]
      );
    } finally {
      downloadingPostIdsRef.current.delete(postId);
      setDownloadingPosts(prev => {
        const newState = { ...prev };
        delete newState[postId];
        return newState;
      });
    }
  }, [currentUser, t, currentUserId, fallbackUsername]);

  const handleLikePress = useCallback(async (postId) => {
    if (!currentUserId) {
      Alert.alert(
        t('home.alerts.signInRequiredTitle'),
        t('home.alerts.signInLikeBody'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    try {
      const result = await likePost(postId, currentUserId);
      const stats = postStats[postId] || { likes: [] };
      
      updatePostStats(postId, {
        likesCount: result.likesCount,
        likes: result.liked 
          ? [...stats.likes, currentUserId]
          : stats.likes.filter(id => id !== currentUserId)
      });
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert(t('common.error'), t('home.feed.likeError'));
    }
  }, [currentUserId, postStats, updatePostStats, t]);

  const handleDoubleTap = useCallback(async (postId) => {
    if (!currentUserId) return;

    const stats = postStats[postId] || { likes: [] };
    const isAlreadyLiked = stats.likes.includes(currentUserId);

    if (!isAlreadyLiked) {
      const anim = new Animated.Value(0);
      setLikeAnimations(prev => ({ ...prev, [postId]: anim }));

      Animated.sequence([
        Animated.spring(anim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 400,
          delay: 300,
          useNativeDriver: true,
        })
      ]).start(() => {
        setLikeAnimations(prev => {
          const newAnims = { ...prev };
          delete newAnims[postId];
          return newAnims;
        });
      });

      try {
        const result = await likePost(postId, currentUserId);
        updatePostStats(postId, {
          likesCount: result.likesCount,
          likes: result.liked 
            ? [...stats.likes, currentUserId]
            : stats.likes.filter(id => id !== currentUserId)
        });
      } catch (error) {
        console.error('Error liking post:', error);
      }
    }
  }, [currentUserId, postStats, updatePostStats]);

  const handleCommentPress = useCallback((postId) => {
    if (!currentUserId) {
      Alert.alert(
        t('home.alerts.signInRequiredTitle'),
        t('home.alerts.signInCommentBody'),
        [{ text: t('common.ok') }]
      );
      return;
    }
    
    setSelectedPostId(postId);
    setCommentsModalVisible(true);
  }, [currentUserId, t]);

  const handleCommentsModalClose = useCallback(async () => {
    setCommentsModalVisible(false);
    
    if (selectedPostId) {
      try {
        const stats = await getPostStats(selectedPostId);
        updatePostStats(selectedPostId, stats);
      } catch (error) {
        console.error('Error refreshing stats:', error);
      }
    }
    
    setSelectedPostId(null);
  }, [selectedPostId, updatePostStats]);

  const togglePostExpansion = useCallback((postId) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  }, []);

  const handleTrendingPress = useCallback((item) => {
    navigation.navigate('SpeciesGalleryScreen', {
      species: {
        name: item.commonName || item.name,
        scientificName: item.scientificName || null,
        taxonId: item.taxonId,
        iconicTaxon: item.iconicTaxon,
        count: item.count,
      },
    });
  }, [navigation]);

  // ✅ PERFORMANCE: Memoized render functions
  const renderTrendingItem = useCallback(({ item, index }) => (
    <TrendingCard
      item={item}
      index={index}
      onPress={() => handleTrendingPress(item)}
      t={t}
    />
  ), [handleTrendingPress, t]);

  const renderFeedItem = useCallback(({ item }) => {
    const stats = postStats[item.id] || { likesCount: 0, commentsCount: 0, likes: [] };
    const isLiked = stats.likes.includes(currentUserId);
    const likeAnim = likeAnimations[item.id];
    const isDownloading = downloadingPosts[item.id];
    const isExpanded = expandedPosts[item.id];

    return (
      <FeedPost
        item={item}
        stats={stats}
        isLiked={isLiked}
        currentUserId={currentUserId}
        likeAnim={likeAnim}
        isDownloading={isDownloading}
        isExpanded={isExpanded}
        onLikePress={handleLikePress}
        onCommentPress={handleCommentPress}
        onDownloadPress={handleDownloadPDF}
        onDoubleTap={handleDoubleTap}
        onToggleExpand={togglePostExpansion}
        formatDate={formatDate}
        getLikesLabel={getLikesLabel}
        getCommentsLabel={getCommentsLabel}
        t={t}
      />
    );
  }, [
    postStats,
    currentUserId,
    likeAnimations,
    downloadingPosts,
    expandedPosts,
    handleLikePress,
    handleCommentPress,
    handleDownloadPDF,
    handleDoubleTap,
    togglePostExpansion,
    formatDate,
    getLikesLabel,
    getCommentsLabel,
    t
  ]);

  // ✅ PERFORMANCE: Memoized header
  const renderHeader = useMemo(() => {
    if (trendingSpecies.length === 0) return null;
    
    return (
      <View style={styles.trendingSection}>
        <View style={styles.trendingHeader}>
          <View style={styles.trendingHeaderLeft}>
            <Ionicons name="flame" size={20} color="#EF4444" />
            <Text style={styles.trendingTitle}>{t('home.trending.title')}</Text>
          </View>
        </View>
        <FlatList
          horizontal
          data={trendingSpecies}
          keyExtractor={(item, index) => `trending-${item.taxonId || item.name}-${index}`}
          renderItem={renderTrendingItem}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trendingList}
          snapToInterval={180}
          decelerationRate="fast"
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={7}
          initialNumToRender={3}
        />
      </View>
    );
  }, [trendingSpecies, renderTrendingItem, t]);

  // ✅ PERFORMANCE: Memoized key extractor
  const keyExtractor = useCallback((item) => item.id, []);

  // ✅ PERFORMANCE: Memoized empty component
  const renderEmptyComponent = useMemo(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name={isOffline ? 'cloud-offline-outline' : 'telescope-outline'} size={80} color="#c7c7c7" />
      <Text style={styles.emptyTitle}>
        {isOffline ? 'You are offline' : t('home.emptyState.title')}
      </Text>
      <Text style={styles.emptyDescription}>
        {isOffline
          ? "Community feed won't load while you're offline. Connect to the internet and refresh."
          : t('home.emptyState.subtitle')}
      </Text>
      {!isOffline && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('ScanScreen')}
        >
          <Text style={styles.emptyButtonText}>{t('home.emptyState.cta')}</Text>
        </TouchableOpacity>
      )}
    </View>
  ), [t, navigation, isOffline]);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        <SafeAreaView edges={['top']} style={styles.headerContainer}>
          <View style={styles.header}>
           <TouchableOpacity 
            ref={scanButtonRef}
            collapsable={false}
            style={styles.headerIcon}
            onPress={() => navigation.navigate('ScanScreen')}
          >
            <Ionicons name="scan-outline" size={28} color="#fff" />
          </TouchableOpacity>
            
            <Image
              source={require('@assets/images/logos/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            
            <TouchableOpacity
            ref={notificationButtonRef} // ✅ ADD THIS
            collapsable={false} 
              style={styles.headerIcon}
              onPress={() => navigation.navigate('NotificationScreen')}
            >
              {unreadNotifCount > 0 && (
                <Animated.View 
                  style={[
                    styles.notificationBadge,
                    {
                      transform: [
                        {
                          scale: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  {unreadNotifCount > 99 ? (
                    <Text style={styles.notificationBadgeText}>99+</Text>
                  ) : (
                    <Text style={styles.notificationBadgeText}>{unreadNotifCount}</Text>
                  )}
                </Animated.View>
              )}
              <Ionicons name="notifications-outline" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5E936C" />
          </View>
        ) : publicScans.length === 0 ? (
          renderEmptyComponent
        ) : (
          <FlatList
            data={publicScans}
            keyExtractor={keyExtractor}
            renderItem={renderFeedItem}
            ListHeaderComponent={renderHeader}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={handleRefresh}
                tintColor="#000"
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.feedContent}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={11}
            initialNumToRender={5}
            updateCellsBatchingPeriod={50}
          />
        )}

        {selectedPostId && (
          <CommentsModal
            visible={commentsModalVisible}
            onClose={handleCommentsModalClose}
            postId={selectedPostId}
            currentUserId={currentUserId}
            currentUsername={currentUsername}
            currentUserProfileImage={currentUser?.photoURL || null}
          />
        )}

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
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  headerContainer: {
    backgroundColor: '#5E936C',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  logo: {
    width: 100,
    height: 50,
    position: 'absolute',
    left: '50%',
    marginLeft: -40,
  },
  headerIcon: {
    position: 'relative',
    zIndex: 1,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#5E936C',
    zIndex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  trendingSection: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 16,
  },
  trendingHeader: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  trendingHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginLeft: 6,
  },
  trendingSubtitle: {
    fontSize: 12,
    color: '#666',
    marginLeft: 26,
  },
  trendingList: {
    paddingHorizontal: 16,
  },
  feedContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#0095f6',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
