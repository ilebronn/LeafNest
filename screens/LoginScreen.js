import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageBackground, Dimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { clearAllUserData } from '../utils/userUtils';

const { width, height } = Dimensions.get('window');

// Responsive sizing functions
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();

  // Handle guest sign-in
  const signInAsGuest = async () => {
    try {
      await signOut(auth);
      await clearAllUserData();
      
      // ✅ FIXED: Use simple replace now that both screens are always registered
      navigation.replace('MainTabs', {
        screen: 'Home',
        params: { guest: true, displayName: 'Guest' },
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Check device size
  const isSmallScreen = height < 700;
  const isTablet = width > 600;

  return (
    <ImageBackground
      source={require('../assets/background.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Logo and Brand Name */}
          <View style={[
            styles.logoContainer,
            isSmallScreen && styles.logoContainerSmall
          ]}>
            <Image
              source={require('../assets/logo2.png')}
              style={[
                styles.logo,
                isTablet && styles.logoTablet
              ]}
              resizeMode="contain"
            />
            <Text style={[
              styles.brandName,
              isTablet && styles.brandNameTablet
            ]}>
              {t('login.title')}
            </Text>
          </View>

          {/* Spacer to push buttons down */}
          <View style={styles.spacer} />

          {/* Buttons Container */}
          <View style={[
            styles.buttonContainer,
            isTablet && styles.buttonContainerTablet
          ]}>
            {/* Guest Sign-In Button */}
            <TouchableOpacity 
              style={[
                styles.buttonSecondary,
                isTablet && styles.buttonTablet
              ]} 
              onPress={signInAsGuest}
            >
              <Image
                source={require('../assets/guest-logo.png')}
                style={styles.buttonLogo}
                resizeMode="contain"
              />
              <Text style={[
                styles.buttonText,
                isTablet && styles.buttonTextTablet
              ]}>
                {t('login.signInAsGuest')}
              </Text>
            </TouchableOpacity>

            {/* Regular Sign-In Button */}
            <TouchableOpacity
              style={[
                styles.buttonSecondary,
                isTablet && styles.buttonTablet
              ]}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Image
                source={require('../assets/email-logo.png')}
                style={styles.buttonLogo}
                resizeMode="contain"
              />
              <Text style={[
                styles.buttonText,
                isTablet && styles.buttonTextTablet
              ]}>
                {t('Sign In with Email')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms and Policies Text */}
          <View style={[
            styles.termsContainer,
            isTablet && styles.termsContainerTablet
          ]}>
            <Text style={[
              styles.termsText,
              isTablet && styles.termsTextTablet
            ]}>
              {t('login.termsText')}{' '}
              <TouchableOpacity onPress={() => navigation.navigate('TermsOfUse')}>
                <Text style={styles.linkText}>{t('login.termsOfUse')}</Text>
              </TouchableOpacity>,{' '}
              <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                <Text style={styles.linkText}>{t('login.privacyPolicy')}</Text>
              </TouchableOpacity>, and{' '}
              <TouchableOpacity onPress={() => navigation.navigate('CookiesPolicy')}>
                <Text style={styles.linkText}>{t('login.cookiesPolicy')}</Text>
              </TouchableOpacity>.
            </Text>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  container: { 
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(40),
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(80),
    marginBottom: verticalScale(20),
  },
  logoContainerSmall: {
    marginTop: verticalScale(40),
  },
  logo: {
    width: moderateScale(200),
    height: moderateScale(200),
    marginRight: scale(-60),
    top: verticalScale(50),
  },
  logoTablet: {
    width: moderateScale(180),
    height: moderateScale(180),
  },
  brandName: {
    fontSize: moderateScale(42),
    fontWeight: 'bold',
    color: '#1b8236ff',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    top: verticalScale(50),
  },
  brandNameTablet: {
    fontSize: moderateScale(56),
  },
  spacer: {
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 500,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    marginBottom: verticalScale(10),
  },
  buttonContainerTablet: {
    maxWidth: 600,
  },
  buttonSecondary: {
    backgroundColor: '#1b8236ff',
    paddingVertical: verticalScale(15),
    paddingHorizontal: scale(30),
    borderRadius: moderateScale(25),
    marginVertical: verticalScale(8),
    width: '100%',
    maxWidth: 400,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonTablet: {
    paddingVertical: verticalScale(18),
    maxWidth: 500,
  },
  buttonText: { 
    color: '#fff', 
    fontSize: moderateScale(16),
    fontWeight: 'bold',
  },
  buttonTextTablet: {
    fontSize: moderateScale(18),
  },
  buttonLogo: { 
    width: moderateScale(24),
    height: moderateScale(20),
    marginRight: scale(10),
  },
  termsContainer: {
    paddingHorizontal: scale(30),
    alignItems: 'center',
    marginBottom: verticalScale(30),
    width: '100%',
    maxWidth: 500,
  },
  termsContainerTablet: {
    maxWidth: 600,
  },
  termsText: {
    color: '#64748B',
    fontSize: moderateScale(13),
    textAlign: 'center',
    lineHeight: moderateScale(20),
    letterSpacing: 0.5,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(15),
  },
  termsTextTablet: {
    fontSize: moderateScale(15),
    lineHeight: moderateScale(24),
  },
  linkText: {
    color: '#007BFF',
    textDecorationLine: 'underline',
    fontSize: moderateScale(13),
  },
});