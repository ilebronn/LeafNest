import React, { useState } from 'react';
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
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { functions, httpsCallable } from '../firebase';

const ForgotPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { width, height } = useWindowDimensions();

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

  // Generate 6-digit OTP
  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendOTP = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      // Generate OTP
      const newOtp = generateOTP();
      
      console.log('=== SENDING OTP ===');
      console.log('Email:', email);
      console.log('OTP:', newOtp);
      
      // Create the callable function
      const sendOTPFunction = httpsCallable(functions, 'sendOTP');
      
      // Call it with proper data structure
      const result = await sendOTPFunction({
        email: email.trim(),
        otp: newOtp.toString()
      });
      
      console.log('Success! Result:', result.data);
      
      if (result.data.success) {
        Alert.alert(
          'Success',
          'Verification code sent to your email!',
          [{ text: 'OK', onPress: () => setStep(2) }]
        );
      }
    } catch (error) {
      console.error('=== SEND OTP ERROR ===');
      console.error('Full error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to send verification code. Please try again.';
      
      if (error.code === 'functions/not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'functions/invalid-argument') {
        errorMessage = error.message;
      } else if (error.code === 'functions/unauthenticated') {
        errorMessage = 'Authentication error. Please try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('Error', 'OTP must be 6 digits');
      return;
    }

    setIsLoading(true);
    try {
      console.log('=== VERIFYING OTP ===');
      console.log('Email:', email);
      console.log('OTP:', otp);
      
      const verifyOTPFunction = httpsCallable(functions, 'verifyOTP');
      const result = await verifyOTPFunction({
        email: email.trim(),
        otp: otp.trim()
      });
      
      console.log('Verify result:', result.data);
      
      if (result.data.success) {
        Alert.alert(
          'Verified',
          'OTP verified successfully!',
          [{ text: 'OK', onPress: () => setStep(3) }]
        );
      }
    } catch (error) {
      console.error('=== VERIFY OTP ERROR ===');
      console.error('Error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Invalid OTP. Please try again.';
      
      if (error.code === 'functions/not-found') {
        errorMessage = 'No OTP found. Please request a new one.';
      } else if (error.code === 'functions/deadline-exceeded') {
        errorMessage = 'OTP has expired. Please request a new one.';
      } else if (error.code === 'functions/invalid-argument') {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      console.log('=== RESETTING PASSWORD ===');
      console.log('Email:', email);
      
      const resetPasswordFunction = httpsCallable(functions, 'resetPassword');
      const result = await resetPasswordFunction({
        email: email.trim(),
        newPassword: newPassword
      });
      
      console.log('Reset result:', result.data);
      
      if (result.data.success) {
        Alert.alert(
          'Success', 
          'Password reset successfully! Please sign in with your new password.',
          [
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
          ]
        );
      }
    } catch (error) {
      console.error('=== RESET PASSWORD ERROR ===');
      console.error('Error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = 'Failed to reset password. Please try again.';
      
      if (error.code === 'functions/permission-denied') {
        errorMessage = 'Please verify your OTP first.';
      } else if (error.code === 'functions/invalid-argument') {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      const newOtp = generateOTP();
      
      console.log('=== RESENDING OTP ===');
      console.log('Email:', email);
      console.log('New OTP:', newOtp);
      
      const sendOTPFunction = httpsCallable(functions, 'sendOTP');
      await sendOTPFunction({
        email: email.trim(),
        otp: newOtp.toString()
      });
      
      Alert.alert('Success', 'OTP resent successfully!');
      setOtp('');
    } catch (error) {
      console.error('Resend OTP error:', error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    } finally {
      setIsLoading(false);
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
    backToSignInButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: vScale(20),
      paddingVertical: clamp(vScale(12), 10, 14),
    },
    backToSignInText: {
      fontSize: bodyFS,
      color: '#5E936C',
      fontWeight: '600',
      marginLeft: clamp(scale(8), 6, 10),
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
                We've sent a 6-digit verification code to:
              </Text>
              <Text style={styles.emailDisplay}>{email}</Text>
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
                  maxLength={6}
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
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code?</Text>
                <TouchableOpacity 
                  style={styles.resendButton}
                  onPress={handleResendOTP}
                  disabled={isLoading}
                >
                  <Text style={styles.resendButtonText}>Resend</Text>
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
                <Text style={styles.tipText}>Enter the 6-digit code exactly as received</Text>
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
              {/* New Password Input */}
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
              </View>

              {/* Confirm Password Input */}
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
              </TouchableOpacity>
            </View>

            <View style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <Ionicons name="information-circle" size={clamp(scale(20), 18, 24)} color="#92400E" />
                <Text style={styles.tipsTitle}>Password Requirements</Text>
              </View>
              
              <View style={styles.tipItem}>
                <View style={styles.tipBullet} />
                <Text style={styles.tipText}>At least 6 characters long</Text>
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
          {/* Progress Indicator */}
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