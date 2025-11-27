import { useState, useEffect, useRef } from 'react';
import { OTP_EXPIRY_SECONDS } from '@/constants/auth';

/**
 * Custom hook for OTP countdown timer
 * @param {number} initialSeconds - Initial countdown time in seconds
 * @returns {Object} - { timeLeft, isExpired, startTimer, resetTimer, formatTime }
 */
export const useOTPTimer = (initialSeconds = OTP_EXPIRY_SECONDS) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            setIsActive(false);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, timeLeft]);

  const startTimer = () => {
    setIsActive(true);
  };

  const resetTimer = (seconds = initialSeconds) => {
    setTimeLeft(seconds);
    setIsActive(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const formatTime = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    timeLeft,
    isExpired: timeLeft === 0,
    isActive,
    startTimer,
    resetTimer,
    formatTime,
  };
};