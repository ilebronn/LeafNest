/**
 * Validate verification code format
 * @param {string} code - Verification code
 * @returns {Object} - { isValid, error }
 */
export const validateVerificationCode = (code) => {
  if (!code) {
    return { isValid: false, error: 'Verification code is required' };
  }

  const trimmedCode = code.trim();

  if (trimmedCode.length !== 6) {
    return { isValid: false, error: 'Code must be 6 digits' };
  }

  if (!/^\d{6}$/.test(trimmedCode)) {
    return { isValid: false, error: 'Code must contain only numbers' };
  }

  return { isValid: true, error: null };
};

/**
 * Check if code has expired
 * @param {Date} expiresAt - Expiration timestamp
 * @returns {boolean}
 */
export const isCodeExpired = (expiresAt) => {
  if (!expiresAt) return true;
  return new Date() > new Date(expiresAt);
};