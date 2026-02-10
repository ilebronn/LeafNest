import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { addComment, getComments, likeComment, deleteComment } from '@services/notifications/postInteractionsService';

const CommentsModal = ({ 
  visible, 
  onClose, 
  postId, 
  currentUserId, 
  currentUsername,
  currentUserProfileImage 
}) => {
  const { t, i18n } = useTranslation();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && postId) {
      loadComments();
    }
  }, [visible, postId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const fetchedComments = await getComments(postId);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert(
        t('commentsModal.alerts.loadErrorTitle'),
        t('commentsModal.alerts.loadErrorBody')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    // ✅ Check if user is logged in
    if (!currentUserId) {
      Alert.alert(
        t('commentsModal.alerts.loginRequiredTitle'),
        t('commentsModal.alerts.loginRequiredCommentBody')
      );
      return;
    }

    setSubmitting(true);
    try {
      const result = await addComment(
        postId,
        currentUserId,
        currentUsername,
        commentText.trim(),
        currentUserProfileImage
      );

      // Add new comment to the list
      setComments([result.comment, ...comments]);
      setCommentText('');
      Keyboard.dismiss(); // ✅ Dismiss keyboard after sending
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert(
        t('commentsModal.alerts.addErrorTitle'),
        error?.message || t('commentsModal.alerts.addErrorBody')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId) => {
    // ✅ Check if user is logged in
    if (!currentUserId) {
      Alert.alert(
        t('commentsModal.alerts.loginRequiredTitle'),
        t('commentsModal.alerts.loginRequiredLikeBody')
      );
      return;
    }

    try {
      await likeComment(postId, commentId, currentUserId);
      
      // Update local state
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          const likes = comment.likes || {};
          
          // ✅ Handle both object and array formats
          let isLiked, newLikes, newLikesCount;
          
          if (Array.isArray(likes)) {
            // Array format
            isLiked = likes.includes(currentUserId);
            newLikes = isLiked 
              ? likes.filter(id => id !== currentUserId)
              : [...likes, currentUserId];
            newLikesCount = newLikes.length;
          } else {
            // Object format
            isLiked = likes[currentUserId] === true;
            newLikes = { ...likes };
            if (isLiked) {
              delete newLikes[currentUserId];
            } else {
              newLikes[currentUserId] = true;
            }
            newLikesCount = Object.keys(newLikes).length;
          }
          
          return {
            ...comment,
            likes: newLikes,
            likesCount: newLikesCount
          };
        }
        return comment;
      }));
    } catch (error) {
      console.error('Error liking comment:', error);
      Alert.alert(
        t('commentsModal.alerts.likeErrorTitle'),
        t('commentsModal.alerts.likeErrorBody')
      );
    }
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      t('commentsModal.alerts.deleteTitle'),
      t('commentsModal.alerts.deleteConfirmBody'),
      [
        { text: t('commentsModal.actions.cancel'), style: 'cancel' },
        {
          text: t('commentsModal.actions.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComment(postId, commentId, currentUserId);
              setComments(comments.filter(c => c.id !== commentId));
            } catch (error) {
              Alert.alert(
                t('commentsModal.alerts.deleteErrorTitle'),
                t('commentsModal.alerts.deleteErrorBody')
              );
            }
          }
        }
      ]
    );
  };

  const renderComment = ({ item }) => {
    // ✅ Check if liked - handle both object and array formats
    const likes = item.likes || {};
    const isLiked = Array.isArray(likes) 
      ? likes.includes(currentUserId)
      : likes[currentUserId] === true;
    
    const isOwnComment = item.userId === currentUserId;

    return (
      <View style={styles.commentItem}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>{item.username}</Text>
          {isOwnComment && (
            <TouchableOpacity onPress={() => handleDeleteComment(item.id)}>
              <Ionicons name="trash-outline" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.commentText}>{item.text}</Text>
        
        <View style={styles.commentFooter}>
          <TouchableOpacity 
            style={styles.likeButton}
            onPress={() => handleLikeComment(item.id)}
          >
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={16} 
              color={isLiked ? "#FF6B6B" : "#666"} 
            />
            {item.likesCount > 0 && (
              <Text style={styles.likesCount}>{item.likesCount}</Text>
            )}
          </TouchableOpacity>
          
          <Text style={styles.commentTime}>
            {item.createdAt ? formatTime(item.createdAt) : t('home.relativeTime.justNow')}
          </Text>
        </View>
      </View>
    );
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMins = Math.floor(diffInMs / 60000);
    
    if (diffInMins < 1) return t('home.relativeTime.justNow');
    if (diffInMins < 60) return t('home.relativeTime.minutes', { count: diffInMins });
    
    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return t('home.relativeTime.hours', { count: diffInHours });
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t('home.relativeTime.days', { count: diffInDays });

    const locale = i18n?.language && i18n.language !== 'en' ? i18n.language : undefined;
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.flex1}
        keyboardVerticalOffset={0}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{t('commentsModal.title')}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
              </View>
            ) : (
              <FlatList
                data={comments}
                renderItem={renderComment}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.commentsList}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>{t('commentsModal.empty.title')}</Text>
                    <Text style={styles.emptySubtext}>{t('commentsModal.empty.subtitle')}</Text>
                  </View>
                }
                keyboardShouldPersistTaps="handled"
              />
            )}

            {/* Input Area - Fixed to bottom */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('commentsModal.inputPlaceholder')}
                value={commentText}
                onChangeText={setCommentText}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={handleAddComment}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!commentText.trim() || submitting) && styles.sendButtonDisabled
                ]}
                onPress={handleAddComment}
                disabled={!commentText.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  commentsList: {
    padding: 16,
    flexGrow: 1,
  },
  commentItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  commentText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likesCount: {
    fontSize: 12,
    color: '#666',
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
    gap: 12,
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});

export default CommentsModal;
