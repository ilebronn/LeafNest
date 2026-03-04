import { db, doc, setDoc, getDoc, updateDoc, serverTimestamp, Timestamp, auth } from '@config/firebase';
import { httpsCallable, functions } from '@config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VERIFICATION_EXPIRY_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const VERIFICATION_CACHE_KEY = (userId) => `@verification_status_${userId}`;

export const getCachedVerificationStatus = async (userId) => {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(VERIFICATION_CACHE_KEY(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.isVerified === 'boolean' ? parsed.isVerified : null;
  } catch (error) {
    console.warn('Error reading cached verification status:', error);
    return null;
  }
};

export const setCachedVerificationStatus = async (userId, isVerified) => {
  if (!userId) return false;
  try {
    await AsyncStorage.setItem(
      VERIFICATION_CACHE_KEY(userId),
      JSON.stringify({ isVerified: Boolean(isVerified), updatedAt: Date.now() })
    );
    return true;
  } catch (error) {
    console.warn('Error saving cached verification status:', error);
    return false;
  }
};

export const clearCachedVerificationStatus = async (userId) => {
  if (!userId) return false;
  try {
    await AsyncStorage.removeItem(VERIFICATION_CACHE_KEY(userId));
    return true;
  } catch (error) {
    console.warn('Error clearing cached verification status:', error);
    return false;
  }
};

/**
 * Generate 6-digit verification code
 */
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getRegistrationValidationErrorMessage = (error) => {
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').trim();
  const details = typeof error?.details === 'string' ? error.details.trim() : '';
  const normalizedMessage = message.toLowerCase();

  if (code === 'functions/invalid-argument') {
    return details || 'Please enter a valid and active email address.';
  }

  if (
    code === 'functions/not-found' ||
    normalizedMessage === 'not-found' ||
    normalizedMessage.includes('not-found')
  ) {
    return 'Email validation service is temporarily unavailable. Please try again in a moment.';
  }

  if (code === 'functions/unavailable') {
    return 'Unable to validate email right now. Please try again later.';
  }

  if (code === 'functions/failed-precondition') {
    return 'Email validation is not configured correctly. Please contact support.';
  }

  return details || message || 'Failed to validate email';
};

/**
 * Validate registration email deliverability before creating account
 * @param {string} email - Email to validate
 * @returns {Promise<Object>}
 */
export const validateRegistrationEmail = async (email) => {
  try {
    const normalizedEmail = String(email || '').trim();

    if (!normalizedEmail) {
      return { success: false, error: 'Email is required.' };
    }

    const validateEmail = httpsCallable(functions, 'validateRegistrationEmail');
    const result = await validateEmail({ email: normalizedEmail });

    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error validating registration email:', {
      code: error?.code,
      message: error?.message,
      details: error?.details,
    });
    return { success: false, error: getRegistrationValidationErrorMessage(error) };
  }
};

/**
 * Send verification code to user's email
 * @param {string} userId - Firebase user ID
 * @param {string} email - User's email
 * @returns {Promise<Object>}
 */
export const sendVerificationCode = async (userId, email) => {
  try {
    const effectiveEmail = email || auth.currentUser?.email || null;

    if (!effectiveEmail) {
      return { success: false, error: 'Missing email for verification code.' };
    }

    console.log('Sending verification code to:', effectiveEmail);

    // Generate code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + VERIFICATION_EXPIRY_MINUTES * 60 * 1000);

    // Store in Firestore
    const verificationRef = doc(db, 'users', userId, 'verification', 'current');
    await setDoc(verificationRef, {
      code: code,
      email: effectiveEmail,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiresAt),
      attempts: 0,
      isVerified: false,
      lastResendAt: serverTimestamp(),
    });

    // Send email via Cloud Function
    const sendVerificationEmail = httpsCallable(functions, 'sendVerificationEmail');
    const result = await sendVerificationEmail({
      email: effectiveEmail,
      code: code,
      userId: userId,
    });

    console.log('Verification code sent successfully');
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error sending verification code:', error);
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

    // Update (or create) main user document
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        isVerified: true,
        verifiedAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      },
      { merge: true }
    );
    
    await setCachedVerificationStatus(userId, true);

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
    console.log('Resending verification code');

    const verificationRef = doc(db, 'users', userId, 'verification', 'current');
    const verificationDoc = await getDoc(verificationRef);
    const docEmail = verificationDoc.exists() ? verificationDoc.data()?.email : null;
    const effectiveEmail = email || docEmail || auth.currentUser?.email || null;

    if (!effectiveEmail) {
      return { success: false, error: 'Missing email for verification code.' };
    }

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
            error: `Please wait ${waitTime} seconds before requesting a new code.`,
          };
        }
      }
    }

    // Generate and send new code
    return await sendVerificationCode(userId, effectiveEmail);
  } catch (error) {
    console.error('Error resending code:', error);
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
      const cached = await getCachedVerificationStatus(userId);
      if (cached !== null) {
        return { success: false, isVerified: cached, error: 'User not found', source: 'cache' };
      }
      return { success: false, isVerified: false, error: 'User not found' };
    }

    const isVerified = userDoc.data().isVerified || false;
    await setCachedVerificationStatus(userId, isVerified);
    return { success: true, isVerified };
  } catch (error) {
    console.error('❌ Error checking verification status:', error);
    const cached = await getCachedVerificationStatus(userId);
    if (cached !== null) {
      return { success: false, isVerified: cached, error: error.message, source: 'cache' };
    }
    return { success: false, isVerified: false, error: error.message };
  }
};
