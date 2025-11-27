// src/screens/Main/HomeScreen/index.js
import React, { useRef, useState, useEffect, useCallback } from 'react';
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
import { auth } from '@config/firebase';
import { likePost, getPostStats } from '@services/notifications/postInteractionsService';
import { CommentsModal } from '@components/modals';
import { useFocusEffect } from '@react-navigation/native';
import { createDownloadNotification, getUnreadNotificationCount } from '@services/notifications/notificationService';
import axios from 'axios';
import useHomeFeed from '@hooks/useHomeFeed';
import FeedPost from '@components/common/Card/FeedPost';
import TrendingCard from '@components/common/Card/TrendingCard';

// ✅ Move to config file later
const API_URLS = {
  PDF_GENERATOR: 'https://us-central1-leafnest-98408.cloudfunctions.net/generatePdfAndEmail'
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
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid || null;
  const fallbackUsername = t('home.feed.unknownUser');
  const currentUsername = currentUser?.displayName || currentUser?.email?.split('@')[0] || fallbackUsername;

  // ✅ Use custom hook for data management
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

  // ✅ Notification count management
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
      loadPublicScans();
      loadTrendingSpecies();
    }, [currentUserId, loadUnreadCount, loadPublicScans, loadTrendingSpecies])
  );

  // ✅ Increased to 60 seconds (was 30)
  useEffect(() => {
    if (!currentUserId) return;

    loadUnreadCount();
    const intervalId = setInterval(() => {
      loadUnreadCount();
    }, 60000); // 60 seconds

    return () => clearInterval(intervalId);
  }, [currentUserId, loadUnreadCount]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleRefresh = useCallback(async () => {
    await onRefresh(loadUnreadCount);
  }, [onRefresh, loadUnreadCount]);

  // ✅ Memoized formatter functions
  const formatDate = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = (now - date) / 1000;

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

  const handleDownloadPDF = async (item) => {
    if (!currentUser || !currentUser.email) {
      Alert.alert(
        t('home.alerts.authRequiredTitle'),
        t('home.alerts.authRequiredBody'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    setDownloadingPosts(prev => ({ ...prev, [item.id]: true }));

    try {
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
        try {
          const downloaderUsername = currentUser.displayName || currentUser.email?.split('@')[0] || fallbackUsername;
          await createDownloadNotification(
            item.id,
            item.userId,
            currentUserId,
            downloaderUsername,
            item
          );
        } catch (notifError) {
          console.warn('Failed to create download notification:', notifError);
        }

        Alert.alert(
          t('home.alerts.pdfSuccessTitle'),
          t('home.alerts.pdfSuccessBody'),
          [{ text: t('common.ok') }]
        );
      } else {
        throw new Error(t('home.alerts.pdfErrorBody'));
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      Alert.alert(
        t('home.alerts.pdfErrorTitle'),
        t('home.alerts.pdfErrorBody'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setDownloadingPosts(prev => {
        const newState = { ...prev };
        delete newState[item.id];
        return newState;
      });
    }
  };

  const handleLikePress = async (postId) => {
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
  };

  const handleDoubleTap = async (postId) => {
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
  };

  const handleCommentPress = (postId) => {
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
  };

  const handleCommentsModalClose = async () => {
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
  };

  const togglePostExpansion = (postId) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const renderTrendingItem = ({ item, index }) => (
    <TrendingCard
      item={item}
      index={index}
      onPress={() => {
        navigation.navigate('SpeciesGalleryScreen', {
          species: {
            name: item.commonName || item.name,
            scientificName: item.scientificName || null,
            taxonId: item.taxonId,
            iconicTaxon: item.iconicTaxon,
            count: item.count,
          },
        });
      }}
      t={t}
    />
  );

  const renderFeedItem = ({ item }) => {
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
  };

  const renderHeader = () => (
    <View>
      {trendingSpecies.length > 0 && (
        <View style={styles.trendingSection}>
          <View style={styles.trendingHeader}>
            <View style={styles.trendingHeaderLeft}>
              <Ionicons name="flame" size={20} color="#EF4444" />
              <Text style={styles.trendingTitle}>{t('home.trending.title')}</Text>
            </View>
            <Text style={styles.trendingSubtitle}>{t('home.trending.subtitle')}</Text>
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
          />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        <SafeAreaView edges={['top']} style={styles.headerContainer}>
          <View style={styles.header}>
            <TouchableOpacity 
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
          <View style={styles.emptyContainer}>
            <Ionicons name="telescope-outline" size={80} color="#c7c7c7" />
            <Text style={styles.emptyTitle}>{t('home.emptyState.title')}</Text>
            <Text style={styles.emptyDescription}>
              {t('home.emptyState.subtitle')}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('ScanScreen')}
            >
              <Text style={styles.emptyButtonText}>{t('home.emptyState.cta')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={publicScans}
            keyExtractor={(item) => item.id}
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