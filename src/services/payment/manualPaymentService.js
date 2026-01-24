// services/payment/manualPaymentService.js - FIXED FOR RESUBSCRIPTION
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
  updateDoc,
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteDoc,
} from '@config/firebase';
import { auth } from '@config/firebase';

const PREMIUM_PRICE = 99;

/**
 * Submit payment proof for manual verification
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
 * ✅ FIXED: Approve payment and activate premium
 * Now properly handles resubscriptions
 */
export const approvePayment = async (submissionId) => {
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Starting payment approval process');
    console.log('📋 Submission ID:', submissionId);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Step 1: Get payment submission
    const submissionRef = doc(db, 'paymentSubmissions', submissionId);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      console.error('❌ Submission document not found');
      return { success: false, error: 'Submission not found' };
    }

    const data = submissionDoc.data();
    const userId = data.userId;

    console.log('✅ Step 1: Payment submission found');
    console.log('👤 User ID:', userId);
    console.log('💰 Amount:', data.amount);
    console.log('📧 Email:', data.userEmail);

    // Step 2: Update submission status to approved
    console.log('⏳ Step 2: Updating submission status...');
    await updateDoc(submissionRef, {
      status: 'approved',
      approvedAt: serverTimestamp(),
    });
    console.log('✅ Step 2: Payment submission marked as approved');

    // Step 3: Activate premium subscription
    console.log('⏳ Step 3: Activating premium subscription...');
    
    // ✅ CRITICAL FIX: Inline subscription activation to avoid circular dependency
    const now = Date.now();
    const expiryDate = now + (30 * 24 * 60 * 60 * 1000); // 30 days

    console.log('🗑️ Cleaning up old subscription documents...');
    
    // Delete ALL old subscription documents
    try {
      const subscriptionCollectionRef = collection(db, 'users', userId, 'subscription');
      const oldDocsSnapshot = await getDocs(subscriptionCollectionRef);
      
      console.log(`📋 Found ${oldDocsSnapshot.size} old subscription documents`);
      
      const deletePromises = oldDocsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log('✅ Deleted all old subscription documents');
    } catch (cleanupError) {
      console.warn('⚠️ Could not clean old docs:', cleanupError);
    }

    // Create fresh subscription data
    const subData = {
      isPremium: true,
      premiumType: 'monthly',
      startDate: new Date(now),
      endDate: new Date(expiryDate),
      status: 'active',
      paymentMethod: 'gcash_manual',
      transactionId: submissionId,
      amount: data.amount || PREMIUM_PRICE,
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      activatedAt: serverTimestamp(),
    };

    console.log('📦 Creating new subscription document...');

    // Create new subscription document
    const subscriptionRef = doc(db, 'users', userId, 'subscription', 'current_subscription');
    await setDoc(subscriptionRef, subData, { merge: false });
    
    console.log('✅ Premium subscription document created');

    const activationResult = {
      success: true,
      expiryDate: expiryDate,
      daysRemaining: 30,
    };

    if (!activationResult.success) {
      console.error('❌ Step 3 FAILED: Subscription activation failed');
      return { 
        success: false, 
        error: 'Payment approved but activation failed'
      };
    }

    console.log('✅ Step 3: Premium subscription activated');
    console.log('📅 Expiry date:', new Date(activationResult.expiryDate).toLocaleDateString());
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 PAYMENT APPROVAL COMPLETED SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return { 
      success: true, 
      message: 'Payment approved and premium activated',
      userId: userId,
      expiryDate: activationResult.expiryDate,
    };
  } catch (error) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ CRITICAL ERROR IN PAYMENT APPROVAL');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return { success: false, error: error.message };
  }
};

/**
 * Reject payment
 */
export const rejectPayment = async (submissionId, reason) => {
  try {
    const submissionRef = doc(db, 'paymentSubmissions', submissionId);
    const submissionDoc = await getDoc(submissionRef);

    if (!submissionDoc.exists()) {
      return { success: false, error: 'Submission not found' };
    }

    const data = submissionDoc.data();

    await updateDoc(submissionRef, {
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