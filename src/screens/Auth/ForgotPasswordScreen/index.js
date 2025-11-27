import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Platform, 
  useWindowDimensions,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import services, validations, and hooks
import { sendOTP, verifyOTP, resetPassword, resendOTP } from '@/services/auth';
import { 
  validateEmail, 
  validateOTP, 
  validatePassword, 
  validatePasswordMatch,
  calculatePasswordStrength 
} from '@/utils/validation';
import { useOTPTimer } from '@/hooks';
import { AUTH_SUCCESS, OTP_LENGTH, MIN_PASSWORD_LENGTH } from '@/constants/auth';

const ForgotPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ strength: 'none', score: 0 });
  
  const { width, height } = useWindowDimensions();
  const { timeLeft, isExpired, isActive, startTimer, resetTimer, formatTime } = useOTPTimer();

  const baseW = 375;
  const baseH = 812;

  const scale = (size) => (width / baseW) * size;
  const vScale = (size) => (height / baseH) * size;
  const clamp = (val, min, max) => Math.max(min, Math.min(val, max));
  const clampFS = (size, min = 12, max = 22) => clamp(scale(size), min, max);

  const hPad = clamp(scale(20), 16, 28);
  const cardPad = clamp(scale(24), 18, 28);

  const titleFS = clampFS(28, 22, 32);
  const bodyFS = clampFS(15, 13, 17);
  const buttonFS = clampFS(16, 14, 18);
  const backIconSize = clamp(scale(26), 22, 28);

  const isTablet = width > 600;

  // Update password strength when password changes
  useEffect(() => {
    if (newPassword) {
      const strength = calculatePasswordStrength(newPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({ strength: 'none', score: 0 });
    }
  }, [newPassword]);

  const handleSendOTP = async () => {
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      Alert.alert('Error', emailValidation.error);
      return;
    }

    setIsLoading(true);
    const result = await sendOTP(email);
    setIsLoading(false);

    if (result.success) {
      Alert.alert('Success', AUTH_SUCCESS.OTP_SENT, [
        { 
          text: 'OK', 
          onPress: () => {
            setStep(2);
            resetTimer();
            startTimer();
          } 
        }
      ]);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleVerifyOTP = async () => {
    const otpValidation = validateOTP(otp);
    if (!otpValidation.isValid) {
      Alert.alert('Error', otpValidation.error);
      return;
    }

    setIsLoading(true);
    const result = await verifyOTP(email, otp);
    setIsLoading(false);

    if (result.success) {
      Alert.alert('Verified', AUTH_SUCCESS.OTP_VERIFIED, [
        { text: 'OK', onPress: () => setStep(3) }
      ]);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleResetPassword = async () => {
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      Alert.alert('Error', passwordValidation.error);
      return;
    }

    const passwordMatchValidation = validatePasswordMatch(newPassword, confirmPassword);
    if (!passwordMatchValidation.isValid) {
      Alert.alert('Error', passwordMatchValidation.error);
      return;
    }

    setIsLoading(true);
    const result = await resetPassword(email, newPassword);
    setIsLoading(false);

    if (result.success) {
      Alert.alert('Success', AUTH_SUCCESS.PASSWORD_RESET, [
        {
          text: 'OK',
          onPress: () => {
            setEmail('');
            setOtp('');
            setNewPassword('');
            setConfirmPassword('');
            setStep(1);
            navigation.navigate('SignIn');
          }
        }
      ]);
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const handleResendOTP = async () => {
    if (isActive && !isExpired) {
      Alert.alert('Please Wait', `You can resend the code in ${formatTime()}`);
      return;
    }

    setIsLoading(true);
    const result = await resendOTP(email);
    setIsLoading(false);

    if (result.success) {
      Alert.alert('Success', AUTH_SUCCESS.OTP_RESENT);
      setOtp('');
      resetTimer();
      startTimer();
    } else {
      Alert.alert('Error', result.error);
    }
  };

  const getStepTitle = () => {
    switch(step) {
      case 1: return 'Reset Password';
      case 2: return 'Verify OTP';
      case 3: return 'New Password';
      default: return 'Reset Password';
    }
  };

  const getStepSubtitle = () => {
    switch(step) {
      case 1: return 'Recover your account access';
      case 2: return 'Enter the code sent to your email';
      case 3: return 'Create your new password';
      default: return '';
    }
  };

  const getPasswordStrengthColor = () => {
    switch(passwordStrength.strength) {
      case 'weak': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'strong': return '#10B981';
      default: return '#E5E7EB';
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    header: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingTop: Platform.OS === 'ios' ? vScale(50) : vScale(40),
      paddingBottom: vScale(20),
      paddingHorizontal: hPad,
      zIndex: 10,
    },
    headerContent: {
      alignItems: 'center',
    },
    backButton: {
      position: 'absolute',
      left: hPad,
      top: Platform.OS === 'ios' ? vScale(52) : vScale(42),
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: 24,
      padding: clamp(scale(10), 8, 12),
      zIndex: 10,
    },
    title: {
      fontSize: titleFS,
      fontWeight: '700',
      color: '#fff',
      textAlign: 'center',
      letterSpacing: 0.5,
      marginTop: Platform.OS === 'ios' ? 0 : vScale(10),
    },
    subtitle: {
      fontSize: clampFS(14, 12, 16),
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
      marginTop: vScale(6),
    },
    scrollContainer: {
      paddingHorizontal: hPad,
      paddingTop: Platform.OS === 'ios' ? vScale(140) : vScale(130),
      paddingBottom: vScale(40),
      maxWidth: isTablet ? 600 : '100%',
      alignSelf: 'center',
      width: '100%',
    },
    iconContainer: {
      width: clamp(scale(100), 80, 120),
      height: clamp(scale(100), 80, 120),
      borderRadius: clamp(scale(50), 40, 60),
      backgroundColor: '#F0F7F3',
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      marginBottom: vScale(30),
      borderWidth: 3,
      borderColor: '#D1E5D8',
    },
    instructionCard: {
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: cardPad,
      marginBottom: vScale(24),
      borderWidth: 2,
      borderColor: '#E5E7EB',
    },
    instructionTitle: {
      fontSize: clampFS(20, 18, 24),
      fontWeight: '700',
      color: '#1F2937',
      marginBottom: vScale(12),
      textAlign: 'center',
    },
    instructionText: {
      fontSize: bodyFS,
      color: '#4B5563',
      lineHeight: clamp(scale(24), 20, 26),
      textAlign: 'center',
      marginBottom: vScale(8),
    },
    formCard: {
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: cardPad,
      borderWidth: 2,
      borderColor: '#E5E7EB',
      marginBottom: vScale(20),
    },
    label: {
      fontSize: bodyFS,
      fontWeight: '600',
      color: '#1F2937',
      marginBottom: vScale(8),
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#E5E7EB',
      paddingHorizontal: clamp(scale(16), 12, 18),
      marginBottom: vScale(16),
      minHeight: clamp(vScale(50), 44, 56),
    },
    inputIcon: {
      marginRight: clamp(scale(10), 8, 12),
    },
    input: {
      flex: 1,
      fontSize: bodyFS,
      color: '#1F2937',
      paddingVertical: clamp(vScale(14), 12, 16),
    },
    otpInput: {
      fontSize: clampFS(24, 20, 28),
      fontWeight: '700',
      letterSpacing: clamp(scale(8), 6, 10),
      textAlign: 'center',
    },
    actionButton: {
      backgroundColor: '#5E936C',
      borderRadius: 12,
      paddingVertical: clamp(vScale(16), 14, 18),
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: vScale(8),
      flexDirection: 'row',
    },
    actionButtonDisabled: {
      backgroundColor: '#9CA3AF',
    },
    actionButtonText: {
      fontSize: buttonFS,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 0.5,
    },
    loadingSpinner: {
      marginLeft: clamp(scale(10), 8, 12),
    },
    tipsCard: {
      backgroundColor: '#FEF3C7',
      borderRadius: 16,
      padding: clamp(scale(20), 16, 24),
      borderWidth: 2,
      borderColor: '#FDE68A',
    },
    tipsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: vScale(12),
    },
    tipsTitle: {
      fontSize: bodyFS,
      fontWeight: '700',
      color: '#92400E',
      marginLeft: clamp(scale(8), 6, 10),
    },
    tipItem: {
      flexDirection: 'row',
      marginBottom: vScale(8),
      paddingLeft: clamp(scale(8), 6, 10),
    },
    tipBullet: {
      width: clamp(scale(6), 5, 8),
      height: clamp(scale(6), 5, 8),
      borderRadius: 3,
      backgroundColor: '#92400E',
      marginRight: clamp(scale(10), 8, 12),
      marginTop: vScale(8),
    },
    tipText: {
      fontSize: clampFS(14, 12, 16),
      color: '#78350F',
      lineHeight: clamp(scale(22), 18, 24),
      flex: 1,
    },
    resendContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: vScale(16),
    },
    resendText: {
      fontSize: bodyFS,
      color: '#6B7280',
    },
    resendButton: {
      marginLeft: clamp(scale(8), 6, 10),
    },
    resendButtonText: {
      fontSize: bodyFS,
      color: '#5E936C',
      fontWeight: '700',
    },
    timerText: {
      fontSize: clampFS(14, 12, 16),
      color: '#EF4444',
      fontWeight: '600',
      marginTop: vScale(8),
      textAlign: 'center',
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: vScale(24),
      gap: clamp(scale(12), 10, 16),
    },
    progressDot: {
      width: clamp(scale(10), 8, 12),
      height: clamp(scale(10), 8, 12),
      borderRadius: clamp(scale(5), 4, 6),
      backgroundColor: '#D1D5DB',
    },
    progressDotActive: {
      backgroundColor: '#5E936C',
      width: clamp(scale(32), 28, 36),
    },
    emailDisplay: {
      fontSize: bodyFS,
      fontWeight: '700',
      color: '#5E936C',
      textAlign: 'center',
      marginTop: vScale(8),
    },
    passwordInputWrapper: {
      marginBottom: vScale(20),
    },
    passwordStrengthContainer: {
      marginTop: vScale(8),
      marginBottom: vScale(16),
    },
    passwordStrengthBar: {
      height: clamp(vScale(4), 3, 6),
      backgroundColor: '#E5E7EB',
      borderRadius: 2,
      overflow: 'hidden',
    },
    passwordStrengthFill: {
      height: '100%',
      borderRadius: 2,
    },
    passwordStrengthText: {
      fontSize: clampFS(12, 10, 14),
      marginTop: vScale(4),
      fontWeight: '600',
    },
  });

  const renderStepContent = () => {
    switch(step) {
      case 1:
        return (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="key" size={clamp(scale(50), 40, 60)} color="#5E936C" />
            </View>

            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>Forgot Your Password?</Text>
              <Text style={styles.instructionText}>
                Enter your email address and we'll send you a verification code to reset your password.
              </Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Ionicons 
                  name="mail" 
                  size={clamp(scale(20), 18, 24)} 
                  color="#6B7280" 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity 
                style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
                onPress={handleSendOTP}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>
                  {isLoading ? 'Sending...' : 'Send Verification Code'}
                </Text>
                {isLoading && (
                  <ActivityIndicator 
                    color="#fff" 
                    size="small" 
                    style={styles.loadingSpinner}
                  />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Ionicons name="information-circle" size={clamp(scale(20), 18, 24)} color="#92400E" />
                <Text style={styles.tipsTitle}>Helpful Tips</Text>
              </View>
              
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>Check your spam folder if you don't see the code</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>The verification code expires after 10 minutes</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>Make sure you're using the email associated with your account</Text>
              </View>
            </View>
          </>
        );

      case 2:
        return (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="mail-open" size={clamp(scale(50), 40, 60)} color="#5E936C" />
            </View>

            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>Verify Your Email</Text>
              <Text style={styles.instructionText}>
                We've sent a {OTP_LENGTH}-digit verification code to:
              </Text>
              <Text style={styles.emailDisplay}>{email}</Text>
              {isActive && !isExpired && (
                <Text style={styles.timerText}>
                  Code expires in: {formatTime()}
                </Text>
              )}
              {isExpired && (
                <Text style={[styles.timerText, { color: '#EF4444' }]}>
                  Code expired! Please request a new one.
                </Text>
              )}
            </View>

            <View style={styles.formCard}>
              <Text style={styles.label}>Verification Code</Text>
              <View style={styles.inputContainer}>
                <Ionicons 
                  name="shield-checkmark" 
                  size={clamp(scale(20), 18, 24)} 
                  color="#6B7280" 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="000000"
                  placeholderTextColor="#9CA3AF"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={OTP_LENGTH}
                  editable={!isLoading}
                />
              </View>

              <TouchableOpacity 
                style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
                onPress={handleVerifyOTP}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>Verify Code</Text>
                {isLoading && (
                  <ActivityIndicator 
                    color="#fff" 
                    size="small" 
                    style={styles.loadingSpinner}
                  />
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code?</Text>
                <TouchableOpacity 
                  style={styles.resendButton}
                  onPress={handleResendOTP}
                  disabled={isLoading || (isActive && !isExpired)}
                >
                  <Text style={[
                    styles.resendButtonText,
                    (isActive && !isExpired) && { color: '#9CA3AF' }
                  ]}>
                    Resend
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Ionicons name="information-circle" size={clamp(scale(20), 18, 24)} color="#92400E" />
                <Text style={styles.tipsTitle}>Important</Text>
              </View>
              
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>Enter the {OTP_LENGTH}-digit code exactly as received</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>The code is valid for 10 minutes</Text>
              </View>
            </View>
          </>
        );

      case 3:
        return (
          <>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={clamp(scale(50), 40, 60)} color="#5E936C" />
            </View>

            <View style={styles.instructionCard}>
              <Text style={styles.instructionTitle}>Create New Password</Text>
              <Text style={styles.instructionText}>
                Enter a strong password to secure your account.
              </Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.passwordInputWrapper}>
                <Text style={styles.label}>New Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="lock-closed" 
                    size={clamp(scale(20), 18, 24)} 
                    color="#6B7280" 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor="#9CA3AF"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    textContentType="newPassword"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons 
                      name={showNewPassword ? "eye-off" : "eye"} 
                      size={clamp(scale(20), 18, 24)} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                </View>
                
                {newPassword.length > 0 && (
                  <View style={styles.passwordStrengthContainer}>
                    <View style={styles.passwordStrengthBar}>
                      <View 
                        style={[
                          styles.passwordStrengthFill,
                          { 
                            width: `${(passwordStrength.score / 6) * 100}%`,
                            backgroundColor: getPasswordStrengthColor()
                          }
                        ]} 
                      />
                    </View>
                    <Text 
                      style={[
                        styles.passwordStrengthText,
                        { color: getPasswordStrengthColor() }
                      ]}
                    >
                      Password strength: {passwordStrength.strength}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.passwordInputWrapper}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputContainer}>
                  <Ionicons 
                    name="lock-closed" 
                    size={clamp(scale(20), 18, 24)} 
                    color="#6B7280" 
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm new password"
                    placeholderTextColor="#9CA3AF"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    textContentType="newPassword"
                  />
                  <TouchableOpacity 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off" : "eye"} 
                      size={clamp(scale(20), 18, 24)} 
                      color="#6B7280" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity 
                style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
                onPress={handleResetPassword}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Text>
                {isLoading && (
                  <ActivityIndicator 
                    color="#fff" 
                    size="small" 
                    style={styles.loadingSpinner}
                  />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Ionicons name="information-circle" size={clamp(scale(20), 18, 24)} color="#92400E" />
                <Text style={styles.tipsTitle}>Password Requirements</Text>
              </View>
              
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>At least {MIN_PASSWORD_LENGTH} characters long</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>Use a mix of letters, numbers, and symbols</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>Avoid using common words or personal info</Text>
              </View>
            </View>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#5E936C', '#7FB28A']} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={backIconSize} color="#2D5A3F" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{getStepTitle()}</Text>
          <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
            <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
            <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
          </View>

          {renderStepContent()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;