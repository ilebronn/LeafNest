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
import { db, auth } from '../firebase';

// ==================== POSTS/PUBLIC SCANS LIKES ====================

/**
 * Toggle like on a public scan/post
 * Works with the publicScans collection
 */
export const likePost = async (postId, userId) => {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      throw new Error('You must be logged in to like posts');
    }

    const postRef = doc(db, 'publicScans', postId);
    const postDoc = await getDoc(postRef);

    if (!postDoc.exists()) {
      throw new Error('Post not found');
    }

    const postData = postDoc.data();
    const likes = postData.likes || [];

    // Check if user already liked
    if (likes.includes(userId)) {
      // Unlike
      await updateDoc(postRef, {
        likes: arrayRemove(userId),
        likesCount: increment(-1)
      });
      return { liked: false, likesCount: Math.max(0, (postData.likesCount || 1) - 1) };
    } else {
      // Like
      await updateDoc(postRef, {
        likes: arrayUnion(userId),
        likesCount: increment(1)
      });
      return { liked: true, likesCount: (postData.likesCount || 0) + 1 };
    }
  } catch (error) {
    console.error('Error liking post:', error);
    throw error;
  }
};

/**
 * Check if user liked a post
 */
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

/**
 * Get post stats (likes and comments count)
 */
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

/**
 * Add a comment to a post
 * ✅ FIXED: Now checks authentication and uses addDoc for auto ID generation
 */
export const addComment = async (postId, userId, username, commentText, userProfileImage = null) => {
  try {
    // ✅ CRITICAL: Check if user is authenticated
    if (!auth.currentUser) {
      throw new Error('You must be logged in to comment');
    }

    // ✅ Verify the userId matches the authenticated user
    if (auth.currentUser.uid !== userId) {
      throw new Error('User ID mismatch');
    }

    console.log('Adding comment:', {
      postId,
      userId,
      username,
      authUserId: auth.currentUser.uid,
      text: commentText
    });

    // ✅ Create comment data matching Firebase rules requirements
    const commentData = {
      userId: userId,  // ✅ Must match auth.currentUser.uid
      username: username || 'Anonymous',
      text: commentText,
      userProfileImage: userProfileImage || null,
      timestamp: serverTimestamp(),  // ✅ Required field
      likes: {},  // ✅ Use object instead of array for better performance
      likesCount: 0,
      postId: postId
    };

    // ✅ Use addDoc to let Firebase generate the ID
    const commentsRef = collection(db, 'publicScans', postId, 'comments');
    const docRef = await addDoc(commentsRef, commentData);

    console.log('Comment added successfully:', docRef.id);

    // Update post's comment count (skip if fails - comment still added)
    try {
      const postRef = doc(db, 'publicScans', postId);
      const postDoc = await getDoc(postRef);
      
      if (postDoc.exists() && postDoc.data().userId === auth.currentUser.uid) {
        // Only update if user owns the post
        await updateDoc(postRef, {
          commentsCount: increment(1)
        });
      }
    } catch (updateError) {
      console.warn('Could not update comment count:', updateError);
      // Don't throw - comment was still added successfully
    }

    return { 
      success: true, 
      commentId: docRef.id, 
      comment: {
        id: docRef.id,
        ...commentData,
        createdAt: new Date() // For immediate display
      }
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    throw error;
  }
};

/**
 * Get comments for a post
 */
export const getComments = async (postId, limitCount = 50) => {
  try {
    const commentsRef = collection(db, 'publicScans', postId, 'comments');
    const q = query(
      commentsRef,
      orderBy('timestamp', 'desc')  // ✅ Changed from 'createdAt' to 'timestamp'
    );

    const querySnapshot = await getDocs(q);
    const comments = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      comments.push({
        id: doc.id,
        ...data,
        createdAt: data.timestamp || data.createdAt  // Support both field names
      });
    });

    return comments;
  } catch (error) {
    console.error('Error getting comments:', error);
    // If ordering fails, try without ordering
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

/**
 * Delete a comment
 */
export const deleteComment = async (postId, commentId, userId) => {
  try {
    // ✅ Check authentication
    if (!auth.currentUser) {
      throw new Error('You must be logged in to delete comments');
    }

    const commentRef = doc(db, 'publicScans', postId, 'comments', commentId);
    const commentDoc = await getDoc(commentRef);

    if (!commentDoc.exists()) {
      throw new Error('Comment not found');
    }

    // Check if user owns the comment
    if (commentDoc.data().userId !== userId) {
      throw new Error('Unauthorized to delete this comment');
    }

    await deleteDoc(commentRef);

    // Update post's comment count
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

/**
 * Like a comment
 */
export const likeComment = async (postId, commentId, userId) => {
  try {
    // ✅ Check authentication
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

    // ✅ Check if using object or array format
    const isLiked = Array.isArray(likes) ? likes.includes(userId) : likes[userId];

    if (isLiked) {
      // Unlike - support both formats
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
      // Like - support both formats
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

// Export all functions
export default {
  likePost,
  checkIfLiked,
  addComment,
  getComments,
  deleteComment,
  likeComment,
  getPostStats
};