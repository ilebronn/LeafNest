import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, ImageBackground, Dimensions, Platform, KeyboardAvoidingView, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { clearAllUserData } from '../utils/userUtils';
import { CommonActions } from '@react-navigation/native';
import { resetGuestScanCount } from '../utils/guestScanUtils';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export default function SignInScreen({ navigation }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const isSmallScreen = width < 375;
  const isTablet = width > 600;

  const handleSignIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await resetGuestScanCount();
      console.log('✅ Guest scan count reset after sign in');

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: 'MainTabs',
              params: {
                screen: 'Home',
                params: { guest: false, displayName: user.displayName },
              },
            },
          ],
        })
      );
    } catch (error) {
      Alert.alert(t('common.error'), error.message);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/background-signin.jpg')}
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
              onPress={() => navigation.goBack()}
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
                  <Image 
                    source={require('../assets/logo.png')} 
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </LinearGradient>
              </View>
              <Text style={styles.welcomeText}>{t('signin.welcomeBack')}</Text>
              <Text style={styles.subtitleText}>{t('signin.subtitle')}</Text>
            </View>

            <View style={styles.formContainer}>
              <View style={[
                styles.inputWrapper,
                emailFocused && styles.inputWrapperFocused
              ]}>
                <Ionicons 
                  name="mail-outline" 
                  size={moderateScale(20)} 
                  color={emailFocused ? '#5E936C' : '#8E9196'} 
                  style={styles.inputIcon}
                />
                <TextInput 
                  style={styles.input} 
                  placeholder={t('signin.email')} 
                  placeholderTextColor="#8E9196"
                  value={email} 
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={[
                styles.inputWrapper,
                passwordFocused && styles.inputWrapperFocused
              ]}>
                <Ionicons 
                  name="lock-closed-outline" 
                  size={moderateScale(20)} 
                  color={passwordFocused ? '#5E936C' : '#8E9196'} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder={t('signin.password')}
                  placeholderTextColor="#8E9196"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry={!isPasswordVisible}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon} 
                  onPress={() => setIsPasswordVisible(!isPasswordVisible)}
                >
                  <Ionicons 
                    name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} 
                    size={moderateScale(20)} 
                    color="#8E9196" 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.forgotPasswordContainer}
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                <Text style={styles.forgotPasswordText}>
                  {t('signin.forgotPasswordLink')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.signInButton} 
                onPress={handleSignIn}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#5E936C', '#4a7757']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>
                    {t('signin.signIn')}
                  </Text>
                  <Ionicons name="arrow-forward" size={moderateScale(20)} color="white" />
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>{t('signin.dividerOr')}</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity 
                style={styles.signUpContainer}
                onPress={() => navigation.navigate('SignUp')}
              >
                <Text style={styles.signUpText}>
                  {t('signin.noAccountPrompt')}{' '}
                  <Text style={styles.signUpLink}>{t('signin.signUpLink')}</Text>
                </Text>
              </TouchableOpacity>
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
    marginTop: verticalScale(60),
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
  logo: {
    width: moderateScale(50),
    height: moderateScale(50),
  },
  welcomeText: {
    fontSize: moderateScale(32),
    fontWeight: '700',
    color: 'white',
    marginBottom: verticalScale(8),
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitleText: {
    fontSize: moderateScale(16),
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    letterSpacing: 0.3,
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
    marginBottom: verticalScale(16),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(4),
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputWrapperFocused: {
    borderColor: '#5E936C',
    backgroundColor: 'white',
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  inputIcon: {
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    fontSize: moderateScale(16),
    color: '#1a1a1a',
    paddingVertical: verticalScale(14),
  },
  passwordInput: {
    paddingRight: scale(40),
  },
  eyeIcon: {
    padding: moderateScale(8),
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: verticalScale(24),
  },
  forgotPasswordText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  signInButton: {
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
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(24),
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginHorizontal: scale(16),
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  signUpContainer: {
    alignItems: 'center',
  },
  signUpText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: moderateScale(15),
  },
  signUpLink: {
    color: 'white',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
