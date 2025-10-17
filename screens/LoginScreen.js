import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageBackground, Dimensions, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { clearAllUserData } from '../utils/userUtils';
import { LinearGradient } from 'expo-linear-gradient';

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
      
      navigation.replace('MainTabs', {
        screen: 'Home',
        params: { guest: true, displayName: 'Guest' },
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/background.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(94, 147, 108, 0.4)', 'rgba(45, 85, 60, 0.7)', 'rgba(20, 40, 30, 0.85)']}
        style={styles.gradient}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header Container */}
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
            <Text style={styles.welcomeText}>Welcome to LeafNest</Text>
            <Text style={styles.subtitleText}>Discover Nature's Beauty</Text>
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Buttons Container */}
          <View style={styles.formContainer}>
            {/* Sign In with Email Button */}
            <TouchableOpacity 
              style={styles.mainButton}
              onPress={() => navigation.navigate('SignIn')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#5E936C', '#4a7757']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Ionicons name="mail-outline" size={moderateScale(20)} color="white" />
                <Text style={styles.mainButtonText}>
                  Sign In with Email
                </Text>
                <Ionicons name="arrow-forward" size={moderateScale(20)} color="white" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            {/* Guest Sign-In Button */}
            <TouchableOpacity 
              style={styles.secondaryButton}
              onPress={signInAsGuest}
              activeOpacity={0.8}
            >
              <Ionicons name="glasses-outline" size={moderateScale(20)} color="white" />
              <Text style={styles.secondaryButtonText}>
                Continue as Guest
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms and Policies Text */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <TouchableOpacity onPress={() => navigation.navigate('TermsOfUse')}>
                <Text style={styles.linkText}>Terms of Use</Text>
              </TouchableOpacity>
              {'  , '}
              <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>
              {', and '}
              <TouchableOpacity onPress={() => navigation.navigate('CookiesPolicy')}>
                <Text style={styles.linkText}>Cookie Policy</Text>
              </TouchableOpacity>
              .
            </Text>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(40),
    justifyContent: 'space-between',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: verticalScale(40),
    marginBottom: verticalScale(20),
  },
  iconWrapper: {
    marginBottom: verticalScale(20),
  },
  iconGradient: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5E936C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logo: {
    width: moderateScale(60),
    height: moderateScale(60),
  },
  welcomeText: {
    fontSize: moderateScale(36),
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
  spacer: {
    height: verticalScale(40),
  },
  formContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  mainButton: {
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    marginBottom: verticalScale(16),
    shadowColor: '#5E936C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(20),
    gap: scale(12),
  },
  mainButtonText: {
    color: 'white',
    fontSize: moderateScale(16),
    fontWeight: '700',
    letterSpacing: 0.5,
    flex: 1,
    textAlign: 'center',
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
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(20),
    borderRadius: moderateScale(16),
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    gap: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: moderateScale(16),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  termsContainer: {
    alignItems: 'center',
    marginTop: verticalScale(30),
    marginBottom: verticalScale(20),
    paddingHorizontal: scale(10),
  },
  termsText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: moderateScale(13),
    textAlign: 'center',
    lineHeight: moderateScale(20),
    letterSpacing: 0.3,
  },
  linkText: {
    color: 'rgba(255, 255, 255, 0.95)',
    textDecorationLine: 'underline',
    fontWeight: '600',
    fontSize: moderateScale(13),
  },
});