// firestoreService/manualPaymentService.js - Manual QR Payment System
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
} from '@config/firebase';
import { auth } from '@config/firebase';

const PREMIUM_PRICE = 99;

/**
 * Submit payment proof for manual verification
 * @param {string} userId 
 * @param {string} proofImageUri - Screenshot of GCash payment
 * @param {Object} paymentDetails - { referenceNumber, amount, paymentDate }
 */
export const submitPaymentProof = async (userId, proofImageUri, paymentDetails) => {
  try {
    if (!userId || !proofImageUri) {
      return { success: false, error: 'Missing required data' };
    }

    console.log('📤 Submitting payment proof...');

    // Upload proof image to Firebase Storage
    const filename = `payment_proof_${Date.now()}.jpg`;
    const storageRef = ref(storage, `payment_proofs/${userId}/${filename}`);
    
    const response = await fetch(proofImageUri);
    const blob = await response.blob();
    
    await uploadBytes(storageRef, blob);
    const proofUrl = await getDownloadURL(storageRef);

    console.log('✅ Proof image uploaded');

    // Create payment submission document
    const submissionRef = doc(collection(db, 'paymentSubmissions'));
    const submissionData = {
      userId: userId,
      userName: auth.currentUser?.displayName || auth.currentUser?.email,
      userEmail: auth.currentUser?.email,
      proofImageUrl: proofUrl,
      proofImagePath: storageRef.fullPath,
      referenceNumber: paymentDetails.referenceNumber || '',
      amount: paymentDetails.amount || PREMIUM_PRICE,
      paymentDate: paymentDetails.paymentDate || new Date().toISOString(),
      status: 'pending', // pending, approved, rejected
      submittedAt: serverTimestamp(),
      notes: paymentDetails.notes || '',
    };

    await setDoc(submissionRef, submissionData);

    console.log('✅ Payment submission created:', submissionRef.id);

    return { 
      success: true, 
      submissionId: submissionRef.id,
      message: 'Payment proof submitted successfully! We will verify within 24 hours.' 
    };
  } catch (error) {
    console.error('❌ Error submitting payment proof:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check payment submission status
 * @param {string} userId 
 */
export const checkPaymentStatus = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const submissionsRef = collection(db, 'paymentSubmissions');
    const q = query(
      submissionsRef,
      where('userId', '==', userId),
      orderBy('submittedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { 
        success: true, 
        status: 'none',
        message: 'No payment submissions found' 
      };
    }

    // Get most recent submission
    const latestSubmission = querySnapshot.docs[0];
    const data = latestSubmission.data();

    return {
      success: true,
      status: data.status, // pending, approved, rejected
      submissionId: latestSubmission.id,
      submittedAt: data.submittedAt?.toMillis() || null,
      approvedAt: data.approvedAt?.toMillis() || null,
      rejectedAt: data.rejectedAt?.toMillis() || null,
      rejectionReason: data.rejectionReason || null,
      data: data,
    };
  } catch (error) {
    console.error('❌ Error checking payment status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's payment history
 * @param {string} userId 
 */
export const getPaymentHistory = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const submissionsRef = collection(db, 'paymentSubmissions');
    const q = query(
      submissionsRef,
      where('userId', '==', userId),
      orderBy('submittedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const history = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      history.push({
        id: doc.id,
        status: data.status,
        amount: data.amount,
        referenceNumber: data.referenceNumber,
        submittedAt: data.submittedAt?.toMillis() || null,
        approvedAt: data.approvedAt?.toMillis() || null,
        rejectedAt: data.rejectedAt?.toMillis() || null,
        rejectionReason: data.rejectionReason,
      });
    });

    return { success: true, history };
  } catch (error) {
    console.error('❌ Error getting payment history:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ADMIN FUNCTION: Approve payment and activate premium
 * Call this from Firebase Console or a simple admin screen
 * @param {string} submissionId 
 */
export const approvePayment = async (submissionId) => {
  try {
    const submissionRef = doc(db, 'paymentSubmissions', submissionId);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      return { success: false, error: 'Submission not found' };
    }

    const data = submissionDoc.data();

    // Update submission status
    await setDoc(submissionRef, {
      ...data,
      status: 'approved',
      approvedAt: serverTimestamp(),
    });

    // Activate premium subscription
    const userId = data.userId;
    const now = Date.now();
    const expiryDate = now + (30 * 24 * 60 * 60 * 1000); // 30 days

    const subData = {
      tier: 'premium',
      expiryDate: new Date(expiryDate),
      startDate: new Date(now),
      paymentMethod: 'gcash_manual',
      transactionId: submissionId,
      amount: data.amount,
      status: 'active',
      autoRenew: false,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
    };

    await setDoc(doc(db, 'users', userId, 'subscription', 'current'), subData);

    console.log('✅ Payment approved and premium activated');

    return { 
      success: true, 
      message: 'Payment approved and premium activated',
      userId: userId,
      expiryDate: expiryDate,
    };
  } catch (error) {
    console.error('❌ Error approving payment:', error);
    return { success: false, error: error.message };
  }
};

/**
 * ADMIN FUNCTION: Reject payment
 * @param {string} submissionId 
 * @param {string} reason 
 */
export const rejectPayment = async (submissionId, reason) => {
  try {
    const submissionRef = doc(db, 'paymentSubmissions', submissionId);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      return { success: false, error: 'Submission not found' };
    }

    const data = submissionDoc.data();

    await setDoc(submissionRef, {
      ...data,
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      rejectionReason: reason,
    });

    console.log('✅ Payment rejected');

    return { success: true, message: 'Payment rejected' };
  } catch (error) {
    console.error('❌ Error rejecting payment:', error);
    return { success: false, error: error.message };
  }
};

export default {
  submitPaymentProof,
  checkPaymentStatus,
  getPaymentHistory,
  approvePayment,
  rejectPayment,
  PREMIUM_PRICE,
};