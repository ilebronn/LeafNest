// screens/PostDetailScreen.js - NEW FILE FOR VIEWING INDIVIDUAL POSTS
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '@config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@config/firebase';
import { likePost, getPostStats } from '@firestoreService/notifications/postInteractionsService';
import CommentsModal from '@components/CommentsModal';

const { width } = Dimensions.get('window');

export default function PostDetailScreen({ route, navigation }) {
  const { postId } = route.params;
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postStats, setPostStats] = useState({ likesCount: 0, commentsCount: 0, likes: [] });
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [likeAnimation, setLikeAnimation] = useState(null);
  const [expandedAbout, setExpandedAbout] = useState(false);

  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid || null;
  const currentUsername = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Anonymous';

  useEffect(() => {
    loadPost();
  }, [postId]);

  const loadPost = async () => {
    try {
      setLoading(true);
      
      // Load post data
      const postRef = doc(db, 'publicScans', postId);
      const postDoc = await getDoc(postRef);
      
      if (!postDoc.exists()) {
        Alert.alert('Error', 'Post not found');
        navigation.goBack();
        return;
      }

      const postData = {
        id: postDoc.id,
        ...postDoc.data(),
        createdAt: postDoc.data().publishedAt?.toMillis() || postDoc.data().createdAt?.toMillis() || Date.now(),
      };
      
      setPost(postData);

      // Load post stats
      const stats = await getPostStats(postId);
      setPostStats(stats);

    } catch (error) {
      console.error('Error loading post:', error);
      Alert.alert('Error', 'Failed to load post');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleLikePress = async () => {
    if (!currentUserId) {
      Alert.alert('Sign in required', 'Please sign in to like posts');
      return;
    }

    try {
      const result = await likePost(postId, currentUserId);
      
      setPostStats(prev => ({
        ...prev,
        likesCount: result.likesCount,
        likes: result.liked 
          ? [...prev.likes, currentUserId]
          : prev.likes.filter(id => id !== currentUserId)
      }));
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleDoubleTap = async () => {
    if (!currentUserId) return;

    const isAlreadyLiked = postStats.likes.includes(currentUserId);

    if (!isAlreadyLiked) {
      const anim = new Animated.Value(0);
      setLikeAnimation(anim);

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
        setLikeAnimation(null);
      });

      try {
        const result = await likePost(postId, currentUserId);
        
        setPostStats(prev => ({
          ...prev,
          likesCount: result.likesCount,
          likes: result.liked 
            ? [...prev.likes, currentUserId]
            : prev.likes.filter(id => id !== currentUserId)
        }));
      } catch (error) {
        console.error('Error liking post:', error);
      }
    }
  };

  const handleCommentPress = () => {
    if (!currentUserId) {
      Alert.alert('Sign in required', 'Please sign in to comment');
      return;
    }
    
    setCommentsModalVisible(true);
  };

  const handleCommentsModalClose = async () => {
    setCommentsModalVisible(false);
    
    try {
      const stats = await getPostStats(postId);
      setPostStats(stats);
    } catch (error) {
      console.error('Error refreshing stats:', error);
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
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
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

  const handleImagePress = (() => {
    let lastTap = null;
    
    return () => {
      const now = Date.now();
      const DOUBLE_TAP_DELAY = 300;

      if (lastTap && (now - lastTap) < DOUBLE_TAP_DELAY) {
        handleDoubleTap();
        lastTap = null;
      } else {
        lastTap = now;
      }
    };
  })();

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={28} color="#111" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5E936C" />
        </View>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={80} color="#E0E0E0" />
          <Text style={styles.emptyTitle}>Post not found</Text>
        </View>
      </View>
    );
  }

  const gradient = getGradientForTaxon(post.iconicTaxon);
  const isLiked = postStats.likes.includes(currentUserId);
  const shouldShowMore = post.about && post.about.length > 150;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#111" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Post Header */}
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
                  {(post.userName || 'A')[0].toUpperCase()}
                </Text>
              </View>
            </LinearGradient>
            <View style={styles.postUserInfo}>
              <Text style={styles.postUsername}>{post.userName || 'Anonymous'}</Text>
              {post.iconicTaxon && (
                <Text style={styles.postLocation}>{post.iconicTaxon}</Text>
              )}
            </View>
          </View>
          <Text style={styles.postTime}>{formatDate(post.createdAt)}</Text>
        </View>

        {/* Post Image */}
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={handleImagePress}
          style={styles.imageContainer}
        >
          {post.imageUrl ? (
            <Image 
              source={{ uri: post.imageUrl }} 
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

          {likeAnimation && (
            <Animated.View
              style={[
                styles.likeAnimationOverlay,
                {
                  opacity: likeAnimation,
                  transform: [
                    {
                      scale: likeAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 1],
                      }),
                    },
                  ],
                },
              ]}
              pointerEvents="none"
            >
              <Ionicons name="heart" size={100} color="#fff" />
            </Animated.View>
          )}
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.postActions}>
          <View style={styles.postActionsLeft}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleLikePress}
            >
              <Ionicons 
                name={isLiked ? "heart" : "heart-outline"} 
                size={28} 
                color={isLiked ? "#FF3B30" : "#000"} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleCommentPress}
            >
              <Ionicons name="chatbubble-outline" size={26} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.postContent}>
          <Text style={styles.postLikes}>
            {postStats.likesCount > 0 
              ? `${postStats.likesCount} ${postStats.likesCount === 1 ? 'like' : 'likes'}` 
              : 'Be the first to like this'}
          </Text>
          
          <View style={styles.speciesInfo}>
            <Text style={styles.speciesName}>{post.name || 'Unknown Species'}</Text>
            {post.scientificName && post.scientificName !== post.name && (
              <Text style={styles.scientificName}>{post.scientificName}</Text>
            )}
          </View>

          {post.about && (
            <View style={styles.aboutSection}>
              <Text style={styles.aboutLabel}>About</Text>
              <Text 
                style={styles.aboutText} 
                numberOfLines={expandedAbout ? undefined : 3}
              >
                {post.about}
              </Text>
              {shouldShowMore && (
                <TouchableOpacity 
                  onPress={() => setExpandedAbout(!expandedAbout)}
                  style={styles.showMoreButton}
                >
                  <Text style={styles.showMoreText}>
                    {expandedAbout ? 'Show less' : 'Show more'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {postStats.commentsCount > 0 && (
            <TouchableOpacity onPress={handleCommentPress}>
              <Text style={styles.viewCommentsText}>
                View all {postStats.commentsCount} {postStats.commentsCount === 1 ? 'comment' : 'comments'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Comments Modal */}
      {commentsModalVisible && (
        <CommentsModal
          visible={commentsModalVisible}
          onClose={handleCommentsModalClose}
          postId={postId}
          currentUserId={currentUserId}
          currentUsername={currentUsername}
          currentUserProfileImage={currentUser?.photoURL || null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
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
    color: '#333',
    marginTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  postHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
  },
  postAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#5E936C',
  },
  postUserInfo: {
    marginLeft: 12,
    flex: 1,
  },
  postUsername: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  postLocation: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  postTime: {
    fontSize: 13,
    color: '#999',
  },
  imageContainer: {
    position: 'relative',
  },
  postImage: {
    width: width,
    height: width,
    backgroundColor: '#f5f5f5',
  },
  postImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
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
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    paddingBottom: 20,
  },
  postLikes: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  speciesInfo: {
    marginBottom: 16,
  },
  speciesName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  scientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
  },
  aboutSection: {
    marginBottom: 16,
  },
  aboutLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  showMoreButton: {
    paddingVertical: 6,
    paddingTop: 8,
  },
  showMoreText: {
    fontSize: 15,
    color: '#5E936C',
    fontWeight: '600',
  },
  viewCommentsText: {
    fontSize: 15,
    color: '#999',
    marginTop: 8,
  },
});