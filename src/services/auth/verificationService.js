import { db, doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp } from '@config/firebase';
import { httpsCallable, functions } from '@config/firebase';

const VERIFICATION_EXPIRY_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Generate 6-digit verification code
 */
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send verification code to user's email
 * @param {string} userId - Firebase user ID
 * @param {string} email - User's email
 * @returns {Promise<Object>}
 */
export const sendVerificationCode = async (userId, email) => {
  try {
    console.log('📧 Sending verification code to:', email);

    // Generate code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

    // Store in Firestore
    const verificationRef = doc(db, 'users', userId, 'verification', 'current');
    await setDoc(verificationRef, {
      code: code,
      email: email,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      attempts: 0,
      isVerified: false,
      lastResendAt: serverTimestamp(),
    });

    // Send email via Cloud Function
    const sendVerificationEmail = httpsCallable(functions, 'sendVerificationEmail');
    const result = await sendVerificationEmail({
      email: email,
      code: code,
      userId: userId,
    });

    console.log('✅ Verification code sent successfully');
    return { success: true, data: result.data };
  } catch (error) {
    console.error('❌ Error sending verification code:', error);
    return { success: false, error: error.message || 'Failed to send verification code' };
  }
};

/**
 * Verify the code entered by user
 * @param {string} userId - Firebase user ID
 * @param {string} code - 6-digit code entered by user
 * @returns {Promise<Object>}
 */
export const verifyEmailCode = async (userId, code) => {
  try {
    console.log('🔍 Verifying code for user:', userId);

    const verificationRef = doc(db, 'users', userId, 'verification', 'current');
    const verificationDoc = await getDoc(verificationRef);

    if (!verificationDoc.exists()) {
      return { success: false, error: 'No verification request found. Please request a new code.' };
    }

    const data = verificationDoc.data();

    // Check if already verified
    if (data.isVerified) {
      return { success: false, error: 'This code has already been used.' };
    }

    // Check max attempts
    if (data.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      return { success: false, error: 'Too many failed attempts. Please request a new code.' };
    }

    // Check expiration
    const now = new Date();
    const expiresAt = data.expiresAt.toDate();
    if (now > expiresAt) {
      return { success: false, error: 'This code has expired. Please request a new code.' };
    }

    // Check if code matches
    if (data.code !== code.trim()) {
      // Increment attempts
      await updateDoc(verificationRef, {
        attempts: data.attempts + 1,
      });
      
      const attemptsLeft = MAX_VERIFICATION_ATTEMPTS - (data.attempts + 1);
      return { 
        success: false, 
        error: `Invalid code. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.` 
      };
    }

    // ✅ CODE IS VALID - Mark as verified
    await updateDoc(verificationRef, {
      isVerified: true,
      verifiedAt: serverTimestamp(),
    });

    // Update main user document
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      isVerified: true,
      verifiedAt: serverTimestamp(),
    });

    console.log('✅ Email verified successfully');
    return { success: true, message: 'Email verified successfully!' };
  } catch (error) {
    console.error('❌ Error verifying code:', error);
    return { success: false, error: error.message || 'Failed to verify code' };
  }
};

/**
 * Resend verification code (with rate limiting)
 * @param {string} userId - Firebase user ID
 * @param {string} email - User's email
 * @returns {Promise<Object>}
 */
export const resendVerificationCode = async (userId, email) => {
  try {
    console.log('🔄 Resending verification code');

    const verificationRef = doc(db, 'users', userId, 'verification', 'current');
    const verificationDoc = await getDoc(verificationRef);

    if (verificationDoc.exists()) {
      const data = verificationDoc.data();
      
      // Check rate limiting
      const lastResendAt = data.lastResendAt?.toDate();
      if (lastResendAt) {
        const secondsSinceLastResend = (Date.now() - lastResendAt.getTime()) / 1000;
        if (secondsSinceLastResend < RESEND_COOLDOWN_SECONDS) {
          const waitTime = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLastResend);
          return { 
            success: false, 
            error: `Please wait ${waitTime} seconds before requesting a new code.` 
          };
        }
      }
    }

    // Generate and send new code
    return await sendVerificationCode(userId, email);
  } catch (error) {
    console.error('❌ Error resending code:', error);
    return { success: false, error: error.message || 'Failed to resend code' };
  }
};

/**
 * Check if user is verified
 * @param {string} userId - Firebase user ID
 * @returns {Promise<Object>}
 */
export const checkVerificationStatus = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { success: false, isVerified: false, error: 'User not found' };
    }

    const isVerified = userDoc.data().isVerified || false;
    return { success: true, isVerified };
  } catch (error) {
    console.error('❌ Error checking verification status:', error);
    return { success: false, isVerified: false, error: error.message };
  }
};