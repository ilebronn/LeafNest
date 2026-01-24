import { useState, useEffect } from 'react';
import { auth } from '@config/firebase';
import { checkVerificationStatus } from '@services/auth/verificationService';

/**
 * Hook to guard routes that require email verification
 * @returns {Object} - { isVerified, isLoading, checkVerification }
 */
export const useVerificationGuard = () => {
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkVerification = async () => {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      setIsVerified(false);
      setIsLoading(false);
      return;
    }

    try {
      const result = await checkVerificationStatus(currentUser.uid);
      setIsVerified(result.isVerified || false);
    } catch (error) {
      console.error('Error checking verification:', error);
      setIsVerified(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkVerification();
  }, []);

  return {
    isVerified,
    isLoading,
    checkVerification,
  };
};