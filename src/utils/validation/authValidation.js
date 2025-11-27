import { AUTH_ERRORS, MIN_PASSWORD_LENGTH, OTP_LENGTH } from '@/constants/auth';

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return { isValid: false, error: AUTH_ERRORS.EMPTY_EMAIL };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: AUTH_ERRORS.INVALID_EMAIL };
  }

  return { isValid: true, error: null };
};

/**
 * Validates OTP
 * @param {string} otp - OTP to validate
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateOTP = (otp) => {
  if (!otp || !otp.trim()) {
    return { isValid: false, error: AUTH_ERRORS.EMPTY_OTP };
  }

  if (otp.length !== OTP_LENGTH) {
    return { isValid: false, error: AUTH_ERRORS.INVALID_OTP_LENGTH };
  }

  return { isValid: true, error: null };
};

/**
 * Validates password
 * @param {string} password - Password to validate
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validatePassword = (password) => {
  if (!password || !password.trim()) {
    return { isValid: false, error: AUTH_ERRORS.EMPTY_PASSWORD };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { isValid: false, error: AUTH_ERRORS.SHORT_PASSWORD };
  }

  return { isValid: true, error: null };
};

/**
 * Validates password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Confirmation password
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validatePasswordMatch = (password, confirmPassword) => {
  if (!confirmPassword || !confirmPassword.trim()) {
    return { isValid: false, error: AUTH_ERRORS.EMPTY_PASSWORD };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: AUTH_ERRORS.PASSWORD_MISMATCH };
  }

  return { isValid: true, error: null };
};

/**
 * Calculate password strength
 * @param {string} password - Password to check
 * @returns {Object} - { strength: string, score: number, feedback: string[] }
 */
export const calculatePasswordStrength = (password) => {
  if (!password) {
    return { strength: 'none', score: 0, feedback: [] };
  }

  let score = 0;
  const feedback = [];

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Use at least 8 characters');
  }

  if (password.length >= 12) {
    score += 1;
  }

  // Contains lowercase
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add lowercase letters');
  }

  // Contains uppercase
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add uppercase letters');
  }

  // Contains numbers
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add numbers');
  }

  // Contains special characters
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add special characters');
  }

  // Determine strength
  let strength = 'weak';
  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';

  return { strength, score, feedback };
};