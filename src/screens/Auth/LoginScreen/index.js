import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ImageBackground, 
  Platform, 
  ScrollView,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { auth } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import { clearAllUserData } from '@/utils/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen({ navigation }) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);

  // Responsive sizing functions with bounds
  const scale = (size) => {
    const scaleRatio = width / 375;
    return Math.min(Math.max(size * scaleRatio, size * 0.8), size * 1.3);
  };

  const verticalScale = (size) => {
    const scaleRatio = height / 812;
    return Math.min(Math.max(size * scaleRatio, size * 0.8), size * 1.3);
  };

  const moderateScale = (size, factor = 0.5) => {
    return size + (scale(size) - size) * factor;
  };

  // Handle guest sign-in with proper error handling
  const signInAsGuest = async () => {
    try {
      setIsGuestLoading(true);
      
      // Check if user is already signed in
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Only sign out if there's an actual user
        try {
          await signOut(auth);
        } catch (signOutError) {
          console.warn('Sign out warning (continuing anyway):', signOutError);
          // Continue even if sign out fails
        }
      }
      
      // Clear any cached user data
      await clearAllUserData();
      
      // Navigate to MainTabs as guest
      navigation.replace('MainTabs', {
        screen: 'Home',
        params: { guest: true, displayName: 'Guest' },
      });
      
      console.log('✅ Continuing as guest');
    } catch (error) {
      console.error('❌ Error in guest sign-in:', error);
      
      // More specific error handling
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/network-request-failed') {
        // Still allow guest access even with auth errors
        console.log('⚠️ Auth error, but allowing guest access anyway');
        
        try {
          await clearAllUserData();
          navigation.replace('MainTabs', {
            screen: 'Home',
            params: { guest: true, displayName: 'Guest' },
          });
        } catch (navError) {
          console.error('❌ Navigation error:', navError);
          Alert.alert(
            t('common.error') || 'Error', 
            t('login.guestSignInError') || 'Failed to continue as guest. Please try again.'
          );
        }
      } else {
        Alert.alert(
          t('common.error') || 'Error', 
          t('login.guestSignInError') || 'Failed to continue as guest. Please try again.'
        );
      }
    } finally {
      setIsGuestLoading(false);
    }
  };

  // Handle email sign in navigation
  const handleEmailSignIn = () => {
    if (isLoading || isGuestLoading) return;
    setIsLoading(true);
    navigation.navigate('SignIn');
    // Reset loading after navigation
    setTimeout(() => setIsLoading(false), 500);
  };

  const styles = StyleSheet.create({
    backgroundImage: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    gradient: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    keyboardView: {
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
      minHeight: verticalScale(54),
    },
    mainButtonText: {
      color: 'white',
      fontSize: moderateScale(16),
      fontWeight: '700',
      letterSpacing: 0.5,
      flex: 1,
      textAlign: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
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
      minHeight: verticalScale(54),
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

  return (
    <ImageBackground
      source={require('@/assets/background.jpg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(94, 147, 108, 0.4)', 'rgba(45, 85, 60, 0.7)', 'rgba(20, 40, 30, 0.85)']}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView 
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header Container */}
              <View style={styles.headerContainer}>
                <View style={styles.iconWrapper}>
                  <LinearGradient
                    colors={['#5E936C', '#3a6d4a']}
                    style={styles.iconGradient}
                  >
                    <Image 
                      source={require('@/assets/images/logos/logo.png')} 
                      style={styles.logo}
                      resizeMode="contain"
                    />
                  </LinearGradient>
                </View>
                <Text style={styles.welcomeText}>{t('login.welcomeTitle')}</Text>
                <Text style={styles.subtitleText}>{t('login.welcomeSubtitle')}</Text>
              </View>

              {/* Spacer */}
              <View style={styles.spacer} />

              {/* Buttons Container */}
              <View style={styles.formContainer}>
                {/* Sign In with Email Button */}
                <TouchableOpacity 
                  style={[styles.mainButton, (isLoading || isGuestLoading) && styles.buttonDisabled]}
                  onPress={handleEmailSignIn}
                  activeOpacity={0.8}
                  disabled={isLoading || isGuestLoading}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={t('login.signInWithEmailButton')}
                  accessibilityState={{ disabled: isLoading || isGuestLoading }}
                >
                  <LinearGradient
                    colors={['#5E936C', '#4a7757']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <Ionicons name="mail-outline" size={moderateScale(20)} color="white" />
                        <Text style={styles.mainButtonText}>
                          {t('login.signInWithEmailButton')}
                        </Text>
                        <Ionicons name="arrow-forward" size={moderateScale(20)} color="white" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>{t('login.dividerOr')}</Text>
                  <View style={styles.divider} />
                </View>

                {/* Guest Sign-In Button */}
                <TouchableOpacity 
                  style={[styles.secondaryButton, (isLoading || isGuestLoading) && styles.buttonDisabled]}
                  onPress={signInAsGuest}
                  activeOpacity={0.8}
                  disabled={isLoading || isGuestLoading}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={t('login.signInAsGuest')}
                  accessibilityState={{ disabled: isLoading || isGuestLoading }}
                >
                  {isGuestLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="glasses-outline" size={moderateScale(20)} color="white" />
                      <Text style={styles.secondaryButtonText}>
                        {t('login.signInAsGuest')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Terms and Policies Text */}
              <View style={styles.termsContainer}>
                <Text style={styles.termsText}>
                  {t('login.continueAgreement')}{' '}
                  <Text 
                    style={styles.linkText} 
                    onPress={() => navigation.navigate('TermsOfUse')}
                    accessible={true}
                    accessibilityRole="link"
                  >
                    {t('login.termsOfUse')}
                  </Text>
                  {', '}
                  <Text 
                    style={styles.linkText} 
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                    accessible={true}
                    accessibilityRole="link"
                  >
                    {t('login.privacyPolicy')}
                  </Text>
                  {`, ${t('common.and')} `}
                  <Text 
                    style={styles.linkText} 
                    onPress={() => navigation.navigate('CookiesPolicy')}
                    accessible={true}
                    accessibilityRole="link"
                  >
                    {t('login.cookiesPolicy')}
                  </Text>
                  .
                </Text>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}