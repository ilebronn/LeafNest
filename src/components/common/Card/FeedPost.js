// src/components/common/Card/FeedPost.js
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getGradientForTaxon } from '../../../utils/auth/taxonHelpers';

const { width } = Dimensions.get('window');

export default function FeedPost({
  item,
  stats,
  isLiked,
  currentUserId,
  likeAnim,
  isDownloading,
  isExpanded,
  onLikePress,
  onCommentPress,
  onDownloadPress,
  onDoubleTap,
  onToggleExpand,
  formatDate,
  getLikesLabel,
  getCommentsLabel,
  t,
}) {
  const gradient = getGradientForTaxon(item.iconicTaxon);
  const shouldShowMore = item.about && item.about.length > 100;
  
  // ✅ FIX: Use useRef instead of closure to prevent memory leak
  const lastTapRef = useRef(null);

  const handleImagePress = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (lastTapRef.current && (now - lastTapRef.current) < DOUBLE_TAP_DELAY) {
      onDoubleTap(item.id);
      lastTapRef.current = null;
    } else {
      lastTapRef.current = now;
    }
  };

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
            <Ionicons name="heart" size={100} color="#ff0000ff" />
          </Animated.View>
        )}
      </TouchableOpacity>

      <View style={styles.postActions}>
        <View style={styles.postActionsLeft}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onLikePress(item.id)}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={28} 
              color={isLiked ? "#FF3B30" : "#000"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onCommentPress(item.id)}
          >
            <Ionicons name="chatbubble-outline" size={26} color="#000" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={() => onDownloadPress(item)}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#5E936C" />
          ) : (
            <Ionicons name="download-outline" size={26} color="#000" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.postContent}>
        <Text style={styles.postLikes}>
          {getLikesLabel(stats.likesCount)}
        </Text>
        <View style={styles.postCaption}>
          <Text style={styles.postUsername}>{item.userName || t('home.feed.unknownUser')}</Text>
          <Text style={styles.postCaptionText}>
            {' '}{item.name || t('home.feed.unknownSpecies')}
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
              <TouchableOpacity onPress={() => onToggleExpand(item.id)}>
                <Text style={styles.showMoreText}>
                  {isExpanded ? t('home.feed.showLess') : t('home.feed.showMore')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {stats.commentsCount > 0 && (
          <TouchableOpacity onPress={() => onCommentPress(item.id)}>
            <Text style={styles.viewCommentsText}>
              {getCommentsLabel(stats.commentsCount)}
            </Text>
          </TouchableOpacity>
        )}
        <Text style={styles.postTime}>{formatDate(item.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});