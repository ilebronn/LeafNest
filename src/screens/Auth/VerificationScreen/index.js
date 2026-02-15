import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ImageBackground,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { CommonActions } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { useEmailVerification } from '@hooks/useEmailVerification';
import { auth, signOut } from '@config/firebase';
import { getCachedVerificationStatus } from '@services/auth/verificationService';
import { loadOfflineSession } from '@utils/auth/offlineSession';

const { width, height } = Dimensions.get('window');

const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export default function VerificationScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { email } = route.params || {};
  
  const currentUser = auth.currentUser;
  const userId = currentUser?.uid;
  const effectiveEmail = email || currentUser?.email || '';

  const {
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
  } = useEmailVerification(userId, effectiveEmail);

  const [codeFocused, setCodeFocused] = useState(false);

  const navigateToMainTabs = (displayName) => {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'MainTabs',
            params: {
              screen: 'Home',
              params: { guest: false, displayName },
            },
          },
        ],
      })
    );
  };

  const handleBackPress = async () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    try {
      if (auth.currentUser) {
        await signOut(auth);
      }
    } catch (error) {
      console.warn('Sign out on back failed:', error?.message);
    } finally {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
    }
  };

  // Navigate to main app when verified
  useEffect(() => {
    if (isVerified) {
      navigateToMainTabs(currentUser?.displayName);
    }
  }, [isVerified]);

  // Offline fail-safe: if user is already verified locally, never block on code screen.
  useEffect(() => {
    let active = true;

    const bypassIfOfflineVerified = async () => {
      try {
        const netState = await NetInfo.fetch();
        const online = netState.isConnected && netState.isInternetReachable !== false;
        if (online) return;

        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const [cachedVerified, offlineSession] = await Promise.all([
          getCachedVerificationStatus(uid),
          loadOfflineSession(),
        ]);

        const offlineSessionVerified =
          offlineSession?.uid === uid && offlineSession?.isVerified === true;
        const canBypass =
          cachedVerified === true ||
          offlineSessionVerified ||
          auth.currentUser?.emailVerified === true;

        if (active && canBypass) {
          navigateToMainTabs(auth.currentUser?.displayName);
        }
      } catch (error) {
        console.warn('Offline verification bypass check failed:', error?.message);
      }
    };

    bypassIfOfflineVerified();
    return () => {
      active = false;
    };
  }, [navigation]);

  const onVerifyPress = async () => {
    const result = await handleVerify();
    
    if (result.success) {
      Alert.alert(
        'Success',
        'Your email has been verified!',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Error',
        result.error || 'Invalid verification code',
        [{ text: 'OK' }]
      );
    }
  };

  const onResendPress = async () => {
    const result = await handleResend();
    
    if (result.success) {
      Alert.alert(
        'Code Sent',
        'A new verification code has been sent to your email.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Error',
        result.error || 'Failed to resend code',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <ImageBackground
      source={require('@assets/images/backgrounds/background-signin.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(94, 147, 108, 0.4)', 'rgba(45, 85, 60, 0.7)', 'rgba(20, 40, 30, 0.85)']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
            >
              <View style={styles.backButtonInner}>
                <Ionicons name="arrow-back" size={moderateScale(24)} color="white" />
              </View>
            </TouchableOpacity>

            <View style={styles.headerContainer}>
              <View style={styles.iconWrapper}>
                <LinearGradient
                  colors={['#5E936C', '#3a6d4a']}
                  style={styles.iconGradient}
                >
                  <Ionicons name="mail-outline" size={moderateScale(40)} color="white" />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Verify Your Email</Text>
              <Text style={styles.subtitle}>We've sent a 6-digit code to</Text>
              <Text style={styles.emailText}>{effectiveEmail}</Text>
            </View>

            <View style={styles.formContainer}>
              {/* Verification Code Input */}
              <View
                style={[
                  styles.inputWrapper,
                  codeFocused && styles.inputWrapperFocused,
                  error && styles.inputWrapperError,
                ]}
              >
                <Ionicons
                  name="keypad-outline"
                  size={moderateScale(20)}
                  color={codeFocused ? '#5E936C' : '#8E9196'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#8E9196"
                  value={code}
                  onChangeText={(text) => {
                    setCode(text);
                    setError('');
                  }}
                  onFocus={() => setCodeFocused(true)}
                  onBlur={() => setCodeFocused(false)}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!isVerifying}
                />
              </View>

              {/* Error Message */}
              {error ? (
                <Text style={styles.errorText}>{error}</Text>
              ) : null}

              {/* Timer */}
              <View style={styles.timerContainer}>
                <Ionicons
                  name={isExpired ? 'time-outline' : 'timer-outline'}
                  size={moderateScale(16)}
                  color={isExpired ? '#ff6b6b' : 'rgba(255, 255, 255, 0.7)'}
                />
                <Text style={[styles.timerText, isExpired && styles.timerExpired]}>
                  {isExpired
                    ? 'Code expired'
                    : `Expires in ${formatTime()}`}
                </Text>
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={onVerifyPress}
                disabled={isVerifying || code.length !== 6}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={
                    isVerifying || code.length !== 6
                      ? ['#b0b0b0', '#808080']
                      : ['#5E936C', '#4a7757']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {isVerifying ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Verify Email</Text>
                      <Ionicons name="checkmark-circle" size={moderateScale(20)} color="white" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Resend Code */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code?</Text>
                <TouchableOpacity
                  onPress={onResendPress}
                  disabled={isResending}
                  activeOpacity={0.7}
                >
                  {isResending ? (
                    <ActivityIndicator color="white" size="small" style={styles.resendLoader} />
                  ) : (
                    <Text style={styles.resendLink}>Resend Code</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(40),
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(40),
    left: scale(24),
    zIndex: 10,
  },
  backButtonInner: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: verticalScale(40),
    marginTop: verticalScale(20),
  },
  iconWrapper: {
    marginBottom: verticalScale(20),
  },
  iconGradient: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5E936C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: moderateScale(28),
    fontWeight: '700',
    color: 'white',
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: moderateScale(15),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: verticalScale(4),
  },
  emailText: {
    fontSize: moderateScale(16),
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: moderateScale(16),
    marginBottom: verticalScale(8),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(4),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    borderColor: '#5E936C',
    backgroundColor: 'white',
  },
  inputWrapperError: {
    borderColor: '#ff6b6b',
  },
  inputIcon: {
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    fontSize: moderateScale(20),
    color: '#1a1a1a',
    paddingVertical: verticalScale(14),
    letterSpacing: 8,
    fontWeight: '600',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: moderateScale(13),
    marginBottom: verticalScale(8),
    marginLeft: scale(4),
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(24),
    gap: scale(6),
  },
  timerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: moderateScale(14),
  },
  timerExpired: {
    color: '#ff6b6b',
    fontWeight: '600',
  },
  verifyButton: {
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    marginBottom: verticalScale(24),
    shadowColor: '#5E936C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    gap: scale(8),
  },
  buttonText: {
    color: 'white',
    fontSize: moderateScale(18),
    fontWeight: '700',
  },
  resendContainer: {
    alignItems: 'center',
    gap: verticalScale(8),
  },
  resendText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: moderateScale(14),
  },
  resendLink: {
    color: 'white',
    fontSize: moderateScale(15),
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  resendLoader: {
    marginTop: verticalScale(4),
  },
});
