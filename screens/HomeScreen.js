import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '../firebase';
import { getPublicScans, getTrendingSpecies } from '../firestoreService';
import { likePost, checkIfLiked, getPostStats } from '../firestoreService/postInteractionsService';
import CommentsModal from '../components/CommentsModal';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ route, navigation }) {
  const displayName = route?.params?.displayName ?? '';
  const { t } = useTranslation();
  const [isGuest, setIsGuest] = useState(true);
  const [publicScans, setPublicScans] = useState([]);
  const [trendingSpecies, setTrendingSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState({});
  const [postStats, setPostStats] = useState({});
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [likeAnimations, setLikeAnimations] = useState({});
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid || null;
  const currentUsername = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonymous';

  useEffect(() => {
    const user = auth.currentUser;
    const guestParam = route?.params?.guest;
    const userIsGuest = !user || guestParam === true;
    setIsGuest(userIsGuest);
  }, [route?.params?.guest]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getIconForTaxon = (iconicTaxon) => {
    if (!iconicTaxon) return 'leaf';
    
    const taxon = iconicTaxon.toLowerCase();
    if (taxon.includes('plant') || taxon === 'plantae') return 'leaf';
    if (taxon.includes('bird') || taxon === 'aves') return 'radio-outline';
    if (taxon.includes('mammal') || taxon === 'mammalia') return 'paw';
    if (taxon.includes('insect') || taxon === 'insecta') return 'bug';
    if (taxon.includes('fish') || taxon.includes('actinopterygii')) return 'fish';
    if (taxon.includes('reptil') || taxon === 'reptilia') return 'skull';
    if (taxon.includes('amphibia') || taxon.includes('frog')) return 'water';
    if (taxon.includes('fungi') || taxon.includes('mushroom')) return 'umbrella';
    if (taxon.includes('mollusc') || taxon.includes('shell')) return 'ellipse';
    if (taxon.includes('arachnid') || taxon.includes('spider')) return 'bug-outline';
    return 'leaf';
  };

  const getGradientForTaxon = (iconicTaxon) => {
    if (!iconicTaxon) return ['#10B981', '#059669'];
    
    const taxon = iconicTaxon.toLowerCase();
    if (taxon.includes('plant') || taxon === 'plantae') return ['#10B981', '#059669'];
    if (taxon.includes('bird') || taxon === 'aves') return ['#3B82F6', '#2563EB'];
    if (taxon.includes('mammal') || taxon === 'mammalia') return ['#F59E0B', '#D97706'];
    if (taxon.includes('insect') || taxon === 'insecta') return ['#8B5CF6', '#7C3AED'];
    if (taxon.includes('fish') || taxon.includes('actinopterygii')) return ['#06B6D4', '#0891B2'];
    if (taxon.includes('reptil') || taxon === 'reptilia') return ['#EF4444', '#DC2626'];
    if (taxon.includes('amphibia') || taxon.includes('frog')) return ['#14B8A6', '#0D9488'];
    if (taxon.includes('fungi') || taxon.includes('mushroom')) return ['#F97316', '#EA580C'];
    return ['#10B981', '#059669'];
  };

  const loadPostStats = async (posts) => {
    const stats = {};
    for (const post of posts) {
      try {
        const result = await getPostStats(post.id);
        stats[post.id] = result;
      } catch (error) {
        console.error(`Error loading stats for ${post.id}:`, error);
        stats[post.id] = { likesCount: 0, commentsCount: 0, likes: [] };
      }
    }
    setPostStats(stats);
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
      const result = await getTrendingSpecies(10, 7);
      if (result.success) {
        setTrendingSpecies(result.data);
      }
    } catch (error) {
      console.error('Error loading trending species:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPublicScans();
      loadTrendingSpecies();
    }, [loadPublicScans, loadTrendingSpecies])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [scansResult, trendingResult] = await Promise.all([
        getPublicScans(),
        getTrendingSpecies(10, 7)
      ]);
      
      if (scansResult.success) {
        const shuffledData = shuffleArray(scansResult.data);
        setPublicScans(shuffledData);
        await loadPostStats(shuffledData);
      }
      
      if (trendingResult.success) {
        setTrendingSpecies(trendingResult.data);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleLikePress = async (postId) => {
    if (!currentUserId) {
      Alert.alert('Sign in required', 'Please sign in to like posts');
      return;
    }

    try {
      const result = await likePost(postId, currentUserId);
      
      // Update local state immediately for smooth UX
      setPostStats(prev => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          likesCount: result.likesCount,
          likes: result.liked 
            ? [...(prev[postId]?.likes || []), currentUserId]
            : (prev[postId]?.likes || []).filter(id => id !== currentUserId)
        }
      }));
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleDoubleTap = async (postId) => {
    if (!currentUserId) {
      return; // Silent fail for double tap if not logged in
    }

    const stats = postStats[postId] || { likes: [] };
    const isAlreadyLiked = stats.likes.includes(currentUserId);

    // Only like if not already liked
    if (!isAlreadyLiked) {
      // Trigger like animation
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

      // Perform the like action
      try {
        const result = await likePost(postId, currentUserId);
        
        setPostStats(prev => ({
          ...prev,
          [postId]: {
            ...prev[postId],
            likesCount: result.likesCount,
            likes: result.liked 
              ? [...(prev[postId]?.likes || []), currentUserId]
              : (prev[postId]?.likes || []).filter(id => id !== currentUserId)
          }
        }));
      } catch (error) {
        console.error('Error liking post:', error);
      }
    }
  };

  const handleCommentPress = (postId) => {
    if (!currentUserId) {
      Alert.alert('Sign in required', 'Please sign in to comment');
      return;
    }
    
    setSelectedPostId(postId);
    setCommentsModalVisible(true);
  };

  const handleCommentsModalClose = async () => {
    setCommentsModalVisible(false);
    setSelectedPostId(null);
    
    // Refresh stats after closing comments modal
    if (selectedPostId) {
      try {
        const stats = await getPostStats(selectedPostId);
        setPostStats(prev => ({
          ...prev,
          [selectedPostId]: stats
        }));
      } catch (error) {
        console.error('Error refreshing stats:', error);
      }
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = (now - date) / 1000;
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const togglePostExpansion = (postId) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const renderTrendingItem = ({ item, index }) => {
    const gradient = getGradientForTaxon(item.iconicTaxon);
    
    return (
      <TouchableOpacity style={styles.trendingCard} activeOpacity={0.9}>
        <View style={styles.trendingImageWrapper}>
          {item.imageUrl ? (
            <>
              <Image 
                source={{ uri: item.imageUrl }} 
                style={styles.trendingImage}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.7)']}
                style={styles.trendingGradient}
              />
            </>
          ) : (
            <LinearGradient
              colors={gradient}
              style={styles.trendingImage}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name={getIconForTaxon(item.iconicTaxon)} size={32} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          )}
          
          <View style={styles.trendingBadge}>
            <Ionicons name="flame" size={14} color="#fff" />
            <Text style={styles.trendingBadgeText}>#{index + 1}</Text>
          </View>
          
          <View style={styles.trendingInfo}>
            <Text style={styles.trendingName} numberOfLines={2}>
              {item.commonName || item.name || 'Unknown'}
            </Text>
            <View style={styles.trendingStats}>
              <View style={styles.trendingStat}>
                <Ionicons name="scan-outline" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.trendingStatText}>{item.count} scans</Text>
              </View>
              {item.iconicTaxon && (
                <View style={styles.trendingCategory}>
                  <Text style={styles.trendingCategoryText}>{item.iconicTaxon}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFeedItem = ({ item, index }) => {
    const gradient = getGradientForTaxon(item.iconicTaxon);
    const isExpanded = expandedPosts[item.id];
    const shouldShowMore = item.about && item.about.length > 100;
    
    const stats = postStats[item.id] || { likesCount: 0, commentsCount: 0, likes: [] };
    const isLiked = stats.likes.includes(currentUserId);
    const likeAnim = likeAnimations[item.id];

    const handleImagePress = (() => {
      let lastTap = null;
      
      return () => {
        const now = Date.now();
        const DOUBLE_TAP_DELAY = 300;

        if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
          // Double tap detected
          handleDoubleTap(item.id);
          lastTap = null;
        } else {
          // Single tap
          lastTap = now;
        }
      };
    })();
    
    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <View style={styles.postHeaderLeft}>
            <LinearGradient
              colors={gradient}
              style={styles.postAvatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.postAvatarInner}>
                <Text style={styles.postAvatarText}>
                  {(item.userName || 'A')[0].toUpperCase()}
                </Text>
              </View>
            </LinearGradient>
            <View style={styles.postUserInfo}>
              <Text style={styles.postUsername}>{item.userName || 'Anonymous'}</Text>
              {item.iconicTaxon && (
                <Text style={styles.postLocation}>{item.iconicTaxon}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          activeOpacity={1} 
          onPress={handleImagePress}
          style={styles.imageContainer}
        >
          {item.imageUrl ? (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.postImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['#F3F4F6', '#E5E7EB']}
              style={[styles.postImage, styles.postImagePlaceholder]}
            >
              <Ionicons name="image-outline" size={64} color="#9CA3AF" />
            </LinearGradient>
          )}

          {/* Like Animation Overlay */}
          {likeAnim && (
            <Animated.View
              style={[
                styles.likeAnimationOverlay,
                {
                  opacity: likeAnim,
                  transform: [
                    {
                      scale: likeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                  ],
                },
              ]}
              pointerEvents="none"
            >
              <Ionicons name="heart" size={100} color="#fff" style={{ textShadowRadius: 0 }} />
            </Animated.View>
          )}
        </TouchableOpacity>

        <View style={styles.postActions}>
          <View style={styles.postActionsLeft}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleLikePress(item.id)}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={28} 
                color={isLiked ? "#FF3B30" : "#000"} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleCommentPress(item.id)}
            >
              <Ionicons name="chatbubble-outline" size={26} color="#000" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity>
            <Ionicons name="download-outline" size={26} color="#000" />
          </TouchableOpacity>
        </View>

        <View style={styles.postContent}>
          <Text style={styles.postLikes}>
            {stats.likesCount > 0 ? `${stats.likesCount} ${stats.likesCount === 1 ? 'like' : 'likes'}` : 'Be the first to like this'}
          </Text>
          <View style={styles.postCaption}>
            <Text style={styles.postUsername}>{item.userName || 'Anonymous'}</Text>
            <Text style={styles.postCaptionText}>
              {' '}{item.name || 'Unknown Species'}
              {item.scientificName && item.scientificName !== item.name && (
                <Text style={styles.scientificName}> ({item.scientificName})</Text>
              )}
            </Text>
          </View>
          {item.about && (
            <View>
              <Text style={styles.postDescription} numberOfLines={isExpanded ? undefined : 2}>
                {item.about}
              </Text>
              {shouldShowMore && (
                <TouchableOpacity onPress={() => togglePostExpansion(item.id)}>
                  <Text style={styles.showMoreText}>
                    {isExpanded ? 'Show less' : 'Show more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {stats.commentsCount > 0 && (
            <TouchableOpacity onPress={() => handleCommentPress(item.id)}>
              <Text style={styles.viewCommentsText}>
                View all {stats.commentsCount} {stats.commentsCount === 1 ? 'comment' : 'comments'}
              </Text>
            </TouchableOpacity>
          )}
          <Text style={styles.postTime}>{formatDate(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {trendingSpecies.length > 0 && (
        <View style={styles.trendingSection}>
          <View style={styles.trendingHeader}>
            <View style={styles.trendingHeaderLeft}>
              <Ionicons name="flame" size={20} color="#EF4444" />
              <Text style={styles.trendingTitle}>Trending Species</Text>
            </View>
            <Text style={styles.trendingSubtitle}>Most scanned this week</Text>
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
              source={require('../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            
            <TouchableOpacity 
              style={styles.headerIcon}
              onPress={() => navigation.navigate('NotificationScreen')}
            >
              <View style={styles.notificationBadge} />
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
            <Text style={styles.emptyTitle}>Welcome to the Community</Text>
            <Text style={styles.emptyDescription}>
              Start exploring and sharing your nature discoveries
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => navigation.navigate('ScanScreen')}
            >
              <Text style={styles.emptyButtonText}>Scan Your First Species</Text>
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
                onRefresh={onRefresh}
                tintColor="#000"
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.feedContent}
          />
        )}

        {/* Comments Modal */}
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
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#fff',
    zIndex: 1,
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
  trendingCard: {
    width: 170,
    marginRight: 12,
  },
  trendingImageWrapper: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  trendingImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  trendingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  trendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  trendingInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  trendingName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 18,
  },
  trendingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendingStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendingStatText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  trendingCategory: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trendingCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  feedContent: {
    paddingBottom: 20,
  },
  postContainer: {
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    padding: 2,
  },
  postAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5E936C',
  },
  postUserInfo: {
    marginLeft: 10,
  },
  postUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  postLocation: {
    fontSize: 12,
    color: '#666',
  },
  postImage: {
    width: width,
    height: width,
    backgroundColor: '#f5f5f5',
  },
  imageContainer: {
    position: 'relative',
  },
  likeAnimationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  postImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  postActionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginRight: 16,
  },
  postContent: {
    paddingHorizontal: 16,
  },
  postLikes: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  postCaption: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  postCaptionText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 18,
  },
  scientificName: {
    fontStyle: 'italic',
    color: '#666',
    fontSize: 13,
  },
  postDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginTop: 2,
  },
  viewCommentsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  postTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  showMoreText: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    fontWeight: '500',
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