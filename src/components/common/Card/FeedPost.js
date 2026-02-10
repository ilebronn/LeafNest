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
import ProfileBorder from '@components/common/ProfileBorder/ProfileBorder';
import stripHtmlTags from '@utils/text/stripHtmlTags';
import { pickSpeciesName } from '@utils/text/speciesName';

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
  const cleanedDescription = stripHtmlTags(item.about || item.description || '');
  const shouldShowMore = cleanedDescription.length > 100;
  const displayName = pickSpeciesName(item.commonName, item.name, item.scientificName);
  const displayScientific = pickSpeciesName(item.scientificName);
  // Prefer publishedAt when available; fall back to createdAt/timestamp.
  const preferredTimestamp = item?.publishedAt ?? item?.createdAt ?? item?.timestamp ?? null;
  
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
          <View style={styles.postAvatarWrapper}>
            {item.userActiveBorder ? (
              <ProfileBorder
                border={item.userActiveBorder}
                size={36}
                showGlow={false}
                borderScale={1.25}
                glowPadding={0}
              >
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
              </ProfileBorder>
            ) : (
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
            )}
          </View>
          <View style={styles.postUserInfo}>
            <View style={styles.postUserNameRow}>
              <Text style={styles.postUsername}>{item.userName || 'Anonymous'}</Text>
              {item.userActiveBadge && (
                <View
                  style={[
                    styles.badgeTag,
                    {
                      backgroundColor: item.userActiveBadge.backgroundColor || '#E8F5E9',
                      borderColor: item.userActiveBadge.color || '#4CAF50',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeTagText,
                      { color: item.userActiveBadge.color || '#2E7D32' },
                    ]}
                  >
                    {item.userActiveBadge.name}
                  </Text>
                </View>
              )}
            </View>
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
          {displayName ? (
            <Text style={styles.postCaptionText}>
              {' '}{displayName}
              {displayScientific && displayScientific !== displayName && (
                <Text style={styles.scientificName}> ({displayScientific})</Text>
              )}
            </Text>
          ) : null}
        </View>
        {cleanedDescription ? (
          <View>
            <Text
              style={styles.postDescription}
              numberOfLines={isExpanded ? undefined : 2}
              ellipsizeMode="clip" // Avoid trailing "..."
            >
              {cleanedDescription}
            </Text>
            {shouldShowMore && (
              <TouchableOpacity onPress={() => onToggleExpand(item.id)}>
                <Text style={styles.showMoreText}>
                  {isExpanded ? t('home.feed.showLess') : t('home.feed.showMore')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}
        {stats.commentsCount > 0 && (
          <TouchableOpacity onPress={() => onCommentPress(item.id)}>
            <Text style={styles.viewCommentsText}>
              {getCommentsLabel(stats.commentsCount)}
            </Text>
          </TouchableOpacity>
        )}
        <Text style={styles.postTime}>{formatDate(preferredTimestamp)}</Text>
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
    overflow: 'visible',
  },
  postAvatarWrapper: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
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
    marginLeft: 6,
  },
  postUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  badgeTag: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  badgeTagText: {
    fontSize: 11,
    fontWeight: '700',
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
