import { useState, useEffect } from 'react';
import { useOTPTimer } from './useOTPTimer';
import { 
  verifyEmailCode, 
  resendVerificationCode, 
  checkVerificationStatus 
} from '@services/auth/verificationService';

/**
 * Hook for email verification flow
 * @param {string} userId - Firebase user ID
 * @param {string} email - User's email
 * @returns {Object}
 */
export const useEmailVerification = (userId, email) => {
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  const { timeLeft, isExpired, startTimer, resetTimer, formatTime } = useOTPTimer(600); // 10 minutes

  useEffect(() => {
    // Start timer when component mounts
    startTimer();
  }, []);

  /**
   * Verify the code
   */
  const handleVerify = async () => {
    if (!code || code.length !== 6) {
      setError('Please enter a 6-digit code');
      return { success: false };
    }

    setIsVerifying(true);
    setError('');

    try {
      const result = await verifyEmailCode(userId, code);

      if (result.success) {
        setIsVerified(true);
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      return { success: false, error: err.message };
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Resend verification code
   */
  const handleResend = async () => {
    setIsResending(true);
    setError('');

    try {
      const result = await resendVerificationCode(userId, email);

      if (result.success) {
        setCode(''); // Clear input
        resetTimer(600); // Reset to 10 minutes
        startTimer();
        return { success: true };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      setError('Failed to resend code. Please try again.');
      return { success: false, error: err.message };
    } finally {
      setIsResending(false);
    }
  };

  /**
   * Check verification status
   */
  const checkStatus = async () => {
    try {
      const result = await checkVerificationStatus(userId);
      if (result.success) {
        setIsVerified(result.isVerified);
      }
      return result;
    } catch (err) {
      console.error('Error checking status:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    code,
    setCode,
    isVerifying,
    isResending,
    error,
    setError,
    isVerified,
    timeLeft,
    isExpired,
    formatTime,
    handleVerify,
    handleResend,
    checkStatus,
  };
};