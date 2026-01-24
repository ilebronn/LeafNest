// Authentication constants
export const OTP_LENGTH = 6;
export const MIN_PASSWORD_LENGTH = 6;
export const OTP_EXPIRY_MINUTES = 10;
export const OTP_EXPIRY_SECONDS = OTP_EXPIRY_MINUTES * 60;
export const MAX_OTP_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;


// Error messages
export const AUTH_ERRORS = {
  EMPTY_EMAIL: 'Please enter your email address',
  INVALID_EMAIL: 'Please enter a valid email address',
  EMPTY_OTP: 'Please enter the OTP',
  INVALID_OTP_LENGTH: `OTP must be ${OTP_LENGTH} digits`,
  EMPTY_PASSWORD: 'Please fill in all fields',
  SHORT_PASSWORD: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
  PASSWORD_MISMATCH: 'Passwords do not match',
  SEND_OTP_FAILED: 'Failed to send verification code. Please try again.',
  VERIFY_OTP_FAILED: 'Invalid OTP. Please try again.',
  RESET_PASSWORD_FAILED: 'Failed to reset password. Please try again.',
  SEND_VERIFICATION_FAILED: 'Failed to send verification code',
  VERIFY_CODE_FAILED: 'Failed to verify code',
  CODE_EXPIRED: 'Verification code has expired',
  CODE_INVALID: 'Invalid verification code',
  MAX_ATTEMPTS_REACHED: 'Too many failed attempts',
};

// Success messages
export const AUTH_SUCCESS = {
  OTP_SENT: 'Verification code sent to your email!',
  OTP_VERIFIED: 'OTP verified successfully!',
  OTP_RESENT: 'OTP resent successfully!',
  PASSWORD_RESET: 'Password reset successfully! Please sign in with your new password.',
};