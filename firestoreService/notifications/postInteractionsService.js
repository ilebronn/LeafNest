// postInteractionsService.js - UPDATED WITH OFFLINE SUPPORT
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  increment,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { db, auth } from '@config/firebase';
import { createLikeNotification, createCommentNotification } from './notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isOnline } from '@utils/network/networkUtils';

// Offline storage keys
const OFFLINE_KEYS = {
  LIKES: (uid) => `offline_likes_${uid}`,
  COMMENTS: (uid) => `offline_comments_${uid}`,
};

// ==================== OFFLINE QUEUE ====================

const saveToOfflineQueue = async (uid, type, data) => {
  try {
    const key = type === 'like' ? OFFLINE_KEYS.LIKES(uid) : OFFLINE_KEYS.COMMENTS(uid);
    const existing = await AsyncStorage.getItem(key);
    const queue = existing ? JSON.parse(existing) : [];
    queue.push({ ...data, timestamp: Date.now() });
    await AsyncStorage.setItem(key, JSON.stringify(queue));
    console.log(`💾 Saved ${type} to offline queue`);
  } catch (error) {
    console.error('Error saving to offline queue:', error);
  }
};

const getOfflineQueue = async (uid, type) => {
  try {
    const key = type === 'like' ? OFFLINE_KEYS.LIKES(uid) : OFFLINE_KEYS.COMMENTS(uid);
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting offline queue:', error);
    return [];
  }
};

const clearOfflineQueue = async (uid, type) => {
  try {
    const key = type === 'like' ? OFFLINE_KEYS.LIKES(uid) : OFFLINE_KEYS.COMMENTS(uid);
    await AsyncStorage.removeItem(key);
    console.log(`✅ Cleared ${type} offline queue`);
  } catch (error) {
    console.error('Error clearing offline queue:', error);
  }
};

// ==================== SYNC OFFLINE DATA ====================

export const syncOfflineData = async (userId) => {
  if (!userId || !(await isOnline())) {
    console.log('⚠️ Cannot sync: offline or no user');
    return { success: false };
  }

  try {
    const likes = await getOfflineQueue(userId, 'like');
    const comments = await getOfflineQueue(userId, 'comment');

    // Sync likes
    for (const like of likes) {
      try {
        await likePost(like.postId, userId);
      } catch (err) {
        console.warn('Failed to sync like:', err);
      }
    }

    // Sync comments
    for (const comment of comments) {
      try {
        await addComment(
          comment.postId,
          userId,
          comment.username,
          comment.text,
          comment.userProfileImage
        );
      } catch (err) {
        console.warn('Failed to sync comment:', err);
      }
    }

    await clearOfflineQueue(userId, 'like');
    await clearOfflineQueue(userId, 'comment');

    console.log('✅ Offline data synced successfully');
    return { success: true };
  } catch (error) {
    console.error('Error syncing offline data:', error);
    return { success: false, error: error.message };
  }
};

// ==================== POSTS/PUBLIC SCANS LIKES ====================

export const likePost = async (postId, userId) => {
  try {
    if (!auth.currentUser) {
      throw new Error('You must be logged in to like posts');
    }

    const online = await isOnline();

    if (!online) {
      console.log('📱 Offline: queueing like for later');
      await saveToOfflineQueue(userId, 'like', { postId, userId });
      return { liked: true, likesCount: 0, offline: true };
    }

    const postRef = doc(db, 'publicScans', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }

    const postData = postDoc.data();
    const likes = postData.likes || [];
    const postOwnerId = postData.userId;

    if (likes.includes(userId)) {
      await updateDoc(postRef, {
        likes: arrayRemove(userId),
        likesCount: increment(-1)
      });
      return { liked: false, likesCount: Math.max(0, (postData.likesCount || 1) - 1) };
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(userId),
        likesCount: increment(1)
      });

      const likerUsername = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Someone';
      await createLikeNotification(postId, postOwnerId, userId, likerUsername, postData);

      return { liked: true, likesCount: (postData.likesCount || 0) + 1 };
    }
  } catch (error) {
    console.error('Error liking post:', error);
    throw error;
  }
};

export const checkIfLiked = async (postId, userId) => {
  try {
    const postRef = doc(db, 'publicScans', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      return false;
    }

    const likes = postDoc.data().likes || [];
    return likes.includes(userId);
  } catch (error) {
    console.error('Error checking like status:', error);
    return false;
  }
};

export const getPostStats = async (postId) => {
  try {
    const postRef = doc(db, 'publicScans', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      return { likesCount: 0, commentsCount: 0, likes: [] };
    }

    const data = postDoc.data();
    return {
      likesCount: data.likesCount || 0,
      commentsCount: data.commentsCount || 0,
      likes: data.likes || []
    };
  } catch (error) {
    console.error('Error getting post stats:', error);
    return { likesCount: 0, commentsCount: 0, likes: [] };
  }
};

// ==================== COMMENTS ====================

export const addComment = async (postId, userId, username, commentText, userProfileImage = null) => {
  try {
    if (!auth.currentUser) {
      throw new Error('You must be logged in to comment');
    }

    if (auth.currentUser.uid !== userId) {
      throw new Error('User ID mismatch');
    }

    const online = await isOnline();

    if (!online) {
      console.log('📱 Offline: queueing comment for later');
      await saveToOfflineQueue(userId, 'comment', {
        postId,
        userId,
        username,
        text: commentText,
        userProfileImage
      });
      return { 
        success: true, 
        offline: true,
        comment: {
          id: `offline_${Date.now()}`,
          userId,
          username,
          text: commentText,
          userProfileImage,
          createdAt: new Date()
        }
      };
    }

    console.log('Adding comment:', {
      postId,
      userId,
      username,
      authUserId: auth.currentUser.uid,
      text: commentText
    });

    const postRef = doc(db, 'publicScans', postId);
    const postDoc = await getDoc(postRef);
    
    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }

    const postData = postDoc.data();
    const postOwnerId = postData.userId;

    const commentData = {
      userId: userId,
      username: username || 'Anonymous',
      text: commentText,
      userProfileImage: userProfileImage || null,
      timestamp: serverTimestamp(),
      likes: {},
      likesCount: 0,
      postId: postId
    };

    const commentsRef = collection(db, 'publicScans', postId, 'comments');
    const docRef = await addDoc(commentsRef, commentData);

    console.log('Comment added successfully:', docRef.id);

    try {
      await updateDoc(postRef, {
        commentsCount: increment(1)
      });
    } catch (updateError) {
      console.warn('Could not update comment count:', updateError);
    }

    await createCommentNotification(
      postId,
      postOwnerId,
      userId,
      username,
      commentText,
      postData
    );

    return { 
      success: true, 
      commentId: docRef.id, 
      comment: {
        id: docRef.id,
        ...commentData,
        createdAt: new Date()
      }
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

export const getComments = async (postId, limitCount = 50) => {
  try {
    const commentsRef = collection(db, 'publicScans', postId, 'comments');
    const q = query(commentsRef, orderBy('timestamp', 'desc'));

    const querySnapshot = await getDocs(q);
    const comments = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        ...data,
        createdAt: data.timestamp || data.createdAt
      });
    });

    return comments;
  } catch (error) {
    console.error('Error getting comments:', error);
    try {
      const commentsRef = collection(db, 'publicScans', postId, 'comments');
      const querySnapshot = await getDocs(commentsRef);
      const comments = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        comments.push({
          id: doc.id,
          ...data,
          createdAt: data.timestamp || data.createdAt
        });
      });

      return comments;
    } catch (fallbackError) {
      console.error('Error in fallback get comments:', fallbackError);
      return [];
    }
  }
};

export const deleteComment = async (postId, commentId, userId) => {
  try {
    if (!auth.currentUser) {
      throw new Error('You must be logged in to delete comments');
    }

    const commentRef = doc(db, 'publicScans', postId, 'comments', commentId);
    const commentDoc = await getDoc(commentRef);

    if (!commentDoc.exists()) {
      throw new Error('Comment not found');
    }

    if (commentDoc.data().userId !== userId) {
      throw new Error('Unauthorized to delete this comment');
    }

    await deleteDoc(commentRef);

    const postRef = doc(db, 'publicScans', postId);
    const postDoc = await getDoc(postRef);
    
    if (postDoc.exists()) {
      await updateDoc(postRef, {
        commentsCount: increment(-1)
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

export const likeComment = async (postId, commentId, userId) => {
  try {
    if (!auth.currentUser) {
      throw new Error('You must be logged in to like comments');
    }

    const commentRef = doc(db, 'publicScans', postId, 'comments', commentId);
    const commentDoc = await getDoc(commentRef);

    if (!commentDoc.exists()) {
      throw new Error('Comment not found');
    }

    const commentData = commentDoc.data();
    const likes = commentData.likes || {};

    const isLiked = Array.isArray(likes) ? likes.includes(userId) : likes[userId];

    if (isLiked) {
      if (Array.isArray(likes)) {
        await updateDoc(commentRef, {
          likes: arrayRemove(userId),
          likesCount: increment(-1)
        });
      } else {
        const newLikes = { ...likes };
        delete newLikes[userId];
        await updateDoc(commentRef, {
          likes: newLikes,
          likesCount: increment(-1)
        });
      }
      return { liked: false };
    } else {
      if (Array.isArray(likes)) {
        await updateDoc(commentRef, {
          likes: arrayUnion(userId),
          likesCount: increment(1)
        });
      } else {
        await updateDoc(commentRef, {
          [`likes.${userId}`]: true,
          likesCount: increment(1)
        });
      }
      return { liked: true };
    }
  } catch (error) {
    console.error('Error liking comment:', error);
    throw error;
  }
};

export default {
  likePost,
  checkIfLiked,
  addComment,
  getComments,
  deleteComment,
  likeComment,
  getPostStats,
  syncOfflineData
};