import { functions, httpsCallable } from '@config/firebase';
import { AUTH_ERRORS } from '../../constants/auth';

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Parse Firebase Cloud Function errors
 * @param {Error} error - Error from Cloud Function
 * @param {string} defaultMessage - Default error message
 * @returns {string} - User-friendly error message
 */
const parseCloudFunctionError = (error, defaultMessage) => {
  console.error('Cloud Function Error:', {
    code: error.code,
    message: error.message,
    details: error.details,
  });

  const errorMessages = {
    'functions/not-found': 'No account found with this email address.',
    'functions/invalid-argument': error.message,
    'functions/unauthenticated': 'Authentication error. Please try again.',
    'functions/permission-denied': 'Please verify your OTP first.',
    'functions/deadline-exceeded': 'OTP has expired. Please request a new one.',
    'functions/already-exists': 'An account with this email already exists.',
    'functions/internal': 'Server error. Please try again later.',
    'functions/failed-precondition': 'Email service configuration error. Please contact support.',
  };

  return errorMessages[error.code] || defaultMessage;
};

/**
 * Send OTP to user's email
 * @param {string} email - User's email address
 * @returns {Promise<Object>} - Result from Cloud Function
 */
export const sendOTP = async (email) => {
  try {
    console.log('=== SENDING OTP ===');
    console.log('Email:', email);

    // Generate OTP client-side
    const otp = generateOTP();
    console.log('Generated OTP:', otp);

    const sendOTPFunction = httpsCallable(functions, 'sendOTP');
    const result = await sendOTPFunction({
      email: email.trim(),
      otp: otp  // Send OTP to Cloud Function
    });

    console.log('OTP sent successfully:', result.data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('=== SEND OTP ERROR ===', error);
    const errorMessage = parseCloudFunctionError(error, AUTH_ERRORS.SEND_OTP_FAILED);
    return { success: false, error: errorMessage };
  }
};

/**
 * Verify OTP entered by user
 * @param {string} email - User's email address
 * @param {string} otp - OTP entered by user
 * @returns {Promise<Object>} - Result from Cloud Function
 */
export const verifyOTP = async (email, otp) => {
  try {
    console.log('=== VERIFYING OTP ===');
    console.log('Email:', email);
    console.log('OTP:', otp);

    const verifyOTPFunction = httpsCallable(functions, 'verifyOTP');
    const result = await verifyOTPFunction({
      email: email.trim(),
      otp: otp.trim(),
    });

    console.log('OTP verified successfully:', result.data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('=== VERIFY OTP ERROR ===', error);
    const errorMessage = parseCloudFunctionError(error, AUTH_ERRORS.VERIFY_OTP_FAILED);
    return { success: false, error: errorMessage };
  }
};

/**
 * Reset user's password
 * @param {string} email - User's email address
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Result from Cloud Function
 */
export const resetPassword = async (email, newPassword) => {
  try {
    console.log('=== RESETTING PASSWORD ===');
    console.log('Email:', email);

    const resetPasswordFunction = httpsCallable(functions, 'resetPassword');
    const result = await resetPasswordFunction({
      email: email.trim(),
      newPassword: newPassword,
    });

    console.log('Password reset successfully:', result.data);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('=== RESET PASSWORD ERROR ===', error);
    const errorMessage = parseCloudFunctionError(error, AUTH_ERRORS.RESET_PASSWORD_FAILED);
    return { success: false, error: errorMessage };
  }
};

/**
 * Resend OTP to user's email
 * @param {string} email - User's email address
 * @returns {Promise<Object>} - Result from Cloud Function
 */
export const resendOTP = async (email) => {
  return sendOTP(email); // Reuse sendOTP function
};