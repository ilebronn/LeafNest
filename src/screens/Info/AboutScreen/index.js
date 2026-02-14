import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  useWindowDimensions,
  Share,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

const AboutScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef(null);

  const [imagesLoaded, setImagesLoaded] = useState({
    logo: false,
    pmftci: false,
    it: false,
  });
  const [imageError, setImageError] = useState({});

  const baseW = 375;
  const baseH = 812;

  // Responsive sizing functions with bounds
  const scale = (size) => {
    const scaleRatio = width / baseW;
    return Math.min(Math.max(size * scaleRatio, size * 0.8), size * 1.3);
  };

  const vScale = (size) => {
    const scaleRatio = height / baseH;
    return Math.min(Math.max(size * scaleRatio, size * 0.8), size * 1.3);
  };

  const clamp = (val, min, max) => Math.max(min, Math.min(val, max));
  const clampFS = (size, min = 12, max = 22) => clamp(scale(size), min, max);

  const hPad = clamp(scale(20), 16, 28);
  const cardPad = clamp(scale(24), 18, 28);

  const headerPadTop = insets.top + (Platform.OS === 'android' ? vScale(8) : vScale(4));
  const headerPadBottom = clamp(vScale(14), 10, 18);

  // Font sizes
  const titleFS = clampFS(26, 18, 28);
  const appNameFS = clampFS(32, 24, 38);
  const bodyFS = clampFS(15, 13, 17);
  const smallFS = clampFS(13, 11, 15);
  const sectionTitleFS = clampFS(22, 18, 26);
  const memberFS = clampFS(15, 13, 17);
  const mentorFS = clampFS(18, 16, 22);

  // Logo sizes
  const logoSize = clamp(scale(110), 90, 140);
  const partnerLogoSize = clamp(scale(70), 56, 86);
  const iconSize = clamp(scale(24), 20, 26);

  const backBtnTop = insets.top + clamp(vScale(6), 2, 10);
  const backBtnPad = clamp(scale(10), 8, 12);

  // Memoize team members list
  const teamMembers = useMemo(() => [
    'Lebron James Maranan',
    'Arcel Joseph Santiago',
    'Princess Diane Postrero',
    'Carlo Panganiban',
    'Rojean Paul Macalintal',
  ], []);

  // Handle navigation with haptic feedback
  const handleNavigation = (screen) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate(screen);
  };

  // Handle share app
  const handleShare = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      const appLinks = Constants.expoConfig?.extra?.appLinks;
      const androidPackage = Constants.expoConfig?.android?.package;

      const androidUrl = appLinks?.android || (androidPackage ? `https://play.google.com/store/apps/details?id=${androidPackage}` : null);
      const iosUrl = appLinks?.ios || null;
      const webUrl = appLinks?.web || null;

      const shareUrl = Platform.OS === 'ios'
        ? (iosUrl || webUrl || androidUrl)
        : Platform.OS === 'android'
          ? (androidUrl || webUrl || iosUrl)
          : (webUrl || androidUrl || iosUrl);

      const shareMessage = t('about.shareMessage', {
        defaultValue: 'Check out LeafNest - Your plant identification companion!'
      });
      const shareTitle = t('about.shareTitle', { defaultValue: 'LeafNest' });
      const messageWithLink = shareUrl ? `${shareMessage}\n${shareUrl}` : shareMessage;

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareMessage,
          url: shareUrl || undefined,
        });
        return;
      }

      await Share.share({
        message: messageWithLink,
        title: shareTitle,
        ...(Platform.OS === 'ios' && shareUrl ? { url: shareUrl } : {}),
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert(
        t('common.error', { defaultValue: 'Error' }),
        t('about.shareError', { defaultValue: 'Unable to open the share sheet. Please try again.' })
      );
    }
  };

  // Handle email support
  const handleEmailSupport = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const email = 'leafnest.capstone@gmail.com'; // Replace with your actual support email
    const subject = encodeURIComponent('LeafNest Support');
    const url = `mailto:${email}?subject=${subject}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          t('common.error') || 'Error',
          t('about.emailNotSupported') || 'Email client not available'
        );
      }
    } catch (error) {
      console.error('Email error:', error);
      Alert.alert(
        t('common.error') || 'Error',
        t('about.emailError') || 'Could not open email client'
      );
    }
  };

  const handleTestPress = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    navigation.navigate('MainTabs', { startTour: Date.now() });
  };

  // Scroll to top
  const scrollToTop = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    safe: { 
      flex: 1,
    }, 

    header: {
      position: 'absolute',
      top: 0, 
      left: 0, 
      right: 0,
      paddingTop: 70,
      paddingBottom: headerPadBottom,
      paddingHorizontal: hPad,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },

    backButton: {
      position: 'absolute',
      left: hPad,
      top: backBtnTop,
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderRadius: 24,
      padding: backBtnPad,
    },

    headerTitle: {
      fontSize: titleFS,
      fontWeight: '700',
      letterSpacing: 0.5,
      color: '#fff',
      textAlign: 'center',
      top: -10,
    },

    scroll: {
      paddingHorizontal: hPad,
      marginTop: clamp(vScale(20), 14, 26),
    },

    brandCard: {
      width: '100%',
      alignItems: 'center',
      backgroundColor: '#fff',
      borderRadius: 24,
      padding: clamp(scale(32), 24, 40),
      marginBottom: clamp(vScale(20), 14, 24),
      marginTop: clamp(vScale(90), 70, 110),
      borderWidth: 2,
      borderColor: '#E5E7EB',
    },

    logoContainer: {
      width: logoSize + 24,
      height: logoSize + 24,
      borderRadius: (logoSize + 24) / 2,
      backgroundColor: '#F0F7F3',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: clamp(vScale(18), 14, 22),
      borderWidth: 2,
      borderColor: '#D1E5D8',
    },

    logo: {
      width: logoSize,
      height: logoSize,
    },

    logoPlaceholder: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },

    appName: {
      fontSize: appNameFS,
      fontWeight: '800',
      color: '#2D5A3F',
      marginBottom: clamp(vScale(8), 6, 10),
      letterSpacing: 0.5,
    },

    tagline: {
      fontSize: bodyFS,
      color: '#6B7280',
      textAlign: 'center',
      marginBottom: clamp(vScale(4), 2, 6),
    },

    description: {
      fontSize: smallFS,
      color: '#9CA3AF',
      textAlign: 'center',
      fontStyle: 'italic',
    },

    sectionCard: {
      width: '100%',
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: cardPad,
      marginBottom: clamp(vScale(16), 12, 20),
      borderWidth: 2,
      borderColor: '#E5E7EB',
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: clamp(vScale(16), 12, 20),
    },

    sectionIcon: {
      width: clamp(scale(36), 30, 42),
      height: clamp(scale(36), 30, 42),
      borderRadius: 12,
      backgroundColor: '#F0F7F3',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: clamp(scale(10), 8, 12),
      borderWidth: 2,
      borderColor: '#D1E5D8',
    },

    sectionTitle: {
      fontSize: sectionTitleFS,
      fontWeight: '700',
      color: '#1F2937',
      letterSpacing: 0.3,
    },

    teamGrid: {
      gap: clamp(vScale(10), 8, 12),
    },

    teamMember: {
      fontSize: memberFS,
      fontWeight: '500',
      color: '#374151',
      paddingVertical: clamp(vScale(12), 10, 14),
      paddingHorizontal: clamp(scale(16), 12, 18),
      backgroundColor: '#F9FAFB',
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: '#5E936C',
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },

    mentorCard: {
      backgroundColor: '#F0F7F3',
      borderRadius: 16,
      padding: clamp(scale(20), 16, 24),
      alignItems: 'center',
      borderWidth: 3,
      borderColor: '#5E936C',
    },

    mentor: {
      fontSize: mentorFS,
      fontWeight: '700',
      color: '#2D5A3F',
      textAlign: 'center',
    },

    mentorRole: {
      fontSize: smallFS,
      color: '#6B7280',
      marginTop: clamp(vScale(4), 2, 6),
      textAlign: 'center',
    },

    creditParagraph: {
      fontSize: bodyFS,
      color: '#4B5563',
      textAlign: 'center',
      lineHeight: clamp(scale(24), 20, 28),
      marginBottom: clamp(vScale(20), 16, 24),
    },

    logoRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: clamp(scale(24), 18, 30),
    },

    partnerLogoContainer: {
      width: partnerLogoSize + 16,
      height: partnerLogoSize + 16,
      borderRadius: 16,
      backgroundColor: '#F9FAFB',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#E5E7EB',
    },

    partnerLogo: {
      width: partnerLogoSize,
      height: partnerLogoSize,
      resizeMode: 'contain',
    },

    footerCard: {
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: cardPad,
      marginBottom: clamp(vScale(20), 16, 28),
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#E5E7EB',
    },

    linkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F0F7F3',
      paddingVertical: clamp(vScale(12), 10, 14),
      paddingHorizontal: clamp(scale(24), 18, 28),
      borderRadius: 12,
      marginBottom: clamp(vScale(12), 10, 14),
      borderWidth: 2,
      borderColor: '#D1E5D8',
      width: '100%',
    },

    linkText: {
      fontSize: bodyFS,
      color: '#2D5A3F',
      fontWeight: '600',
      marginLeft: clamp(scale(8), 6, 10),
    },

    divider: {
      height: 2,
      backgroundColor: '#E5E7EB',
      width: '100%',
      marginVertical: clamp(vScale(12), 10, 14),
    },

    version: {
      fontSize: smallFS,
      color: '#6B7280',
      textAlign: 'center',
      marginBottom: clamp(vScale(6), 4, 8),
    },

    helpText: {
      fontSize: smallFS,
      color: '#9CA3AF',
      textAlign: 'center',
    },

    scrollTopButton: {
      position: 'absolute',
      right: hPad,
      bottom: clamp(vScale(30), 24, 36),
      width: clamp(scale(50), 44, 56),
      height: clamp(scale(50), 44, 56),
      borderRadius: clamp(scale(25), 22, 28),
      backgroundColor: '#5E936C',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'left', 'bottom']}>
        <LinearGradient colors={['#5E936C', '#7FB28A']} style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={t('common.back') || 'Go back'}
          >
            <Ionicons name="arrow-back" size={iconSize} color="#2D5A3F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('about.title')}</Text>
        </LinearGradient>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: clamp(vScale(40), 28, 52) }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Brand Card */}
          <View style={styles.brandCard}>
            <View style={styles.logoContainer}>
              {!imagesLoaded.logo && (
                <ActivityIndicator size="large" color="#5E936C" style={styles.logoPlaceholder} />
              )}
              {imageError.logo ? (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="leaf" size={logoSize * 0.6} color="#5E936C" />
                </View>
              ) : (
                <Image 
                  source={require('@/assets/images/logos/logo2.png')} 
                  style={[styles.logo, !imagesLoaded.logo && { opacity: 0 }]} 
                  resizeMode="contain"
                  onLoad={() => setImagesLoaded(prev => ({ ...prev, logo: true }))}
                  onError={() => setImageError(prev => ({ ...prev, logo: true }))}
                />
              )}
            </View>
            <Text style={styles.appName}>LeafNest</Text>
            <Text style={styles.tagline}>{t('about.tagline')}</Text>
            <Text style={styles.description}>{t('about.developedBy')}</Text>
          </View>

          {/* Team Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="people" size={clamp(scale(20), 18, 24)} color="#5E936C" />
              </View>
              <Text style={styles.sectionTitle}>{t('about.teamTitle')}</Text>
            </View>
            <View style={styles.teamGrid}>
              {teamMembers.map((member, idx) => (
                <Text key={idx} style={styles.teamMember}>{member}</Text>
              ))}
            </View>
          </View>

          {/* Mentor Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="star" size={clamp(scale(20), 18, 24)} color="#5E936C" />
              </View>
              <Text style={styles.sectionTitle}>{t('about.specialThanks')}</Text>
            </View>
            <View style={styles.mentorCard}>
              <Text style={styles.mentor}>{t('about.mentor')}</Text>
              <Text style={styles.mentorRole}>{t('about.mentorRole')}</Text>
            </View>
          </View>

          {/* Credits Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="school" size={clamp(scale(20), 18, 24)} color="#5E936C" />
              </View>
              <Text style={styles.sectionTitle}>{t('about.institutionalSupport')}</Text>
            </View>
            <Text style={styles.creditParagraph}>
              {t('about.credits')}
            </Text>
            <View style={styles.logoRow}>
              <View style={styles.partnerLogoContainer}>
                {!imagesLoaded.pmftci && (
                  <ActivityIndicator size="small" color="#5E936C" />
                )}
                <Image 
                  source={require('@/assets/images/logos/PMFTCI.png')} 
                  style={[styles.partnerLogo, !imagesLoaded.pmftci && { opacity: 0 }]}
                  onLoad={() => setImagesLoaded(prev => ({ ...prev, pmftci: true }))}
                  onError={() => setImageError(prev => ({ ...prev, pmftci: true }))}
                />
              </View>
              <View style={styles.partnerLogoContainer}>
                {!imagesLoaded.it && (
                  <ActivityIndicator size="small" color="#5E936C" />
                )}
                <Image 
                  source={require('@/assets/images/logos/IT.png')} 
                  style={[styles.partnerLogo, !imagesLoaded.it && { opacity: 0 }]}
                  onLoad={() => setImagesLoaded(prev => ({ ...prev, it: true }))}
                  onError={() => setImageError(prev => ({ ...prev, it: true }))}
                />
              </View>
            </View>
          </View>

          {/* Footer Info */}
          <View style={styles.footerCard}>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => handleNavigation('PrivacyPolicy')}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={t('about.privacyPolicy')}
              accessibilityHint={t('about.privacyPolicyHint') || 'Navigate to privacy policy'}>
              <Ionicons name="document-text" size={clamp(scale(18), 16, 20)} color="#2D5A3F" />
              <Text style={styles.linkText}>{t('about.privacyPolicy')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => handleNavigation('TermsOfUse')}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Terms of Service"
              accessibilityHint="Navigate to terms of service">
              <Ionicons name="shield-checkmark" size={clamp(scale(18), 16, 20)} color="#2D5A3F" />
              <Text style={styles.linkText}>Terms of Service</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkButton}
              onPress={handleShare}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Share App"
              accessibilityHint="Share this app with others">
              <Ionicons name="share-social" size={clamp(scale(18), 16, 20)} color="#2D5A3F" />
              <Text style={styles.linkText}>Share App</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkButton}
              onPress={handleEmailSupport}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Contact Support"
              accessibilityHint="Send us an email">
              <Ionicons name="mail" size={clamp(scale(18), 16, 20)} color="#2D5A3F" />
              <Text style={styles.linkText}>Contact Support</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.linkButton}
              onPress={handleTestPress}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Start Tour"
              accessibilityHint="Starts the in-app tour">
              <Ionicons name="compass" size={clamp(scale(18), 16, 20)} color="#2D5A3F" />
              <Text style={styles.linkText}>Start Tour</Text>
            </TouchableOpacity>

            <View style={styles.divider} />
            <Text style={styles.version}>{t('about.version')}</Text>
            <Text style={styles.helpText}>{t('about.help')}</Text>
          </View>
        </ScrollView>

        {/* Scroll to Top Button */}
        <TouchableOpacity 
          style={styles.scrollTopButton}
          onPress={scrollToTop}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t('common.scrollToTop') || 'Scroll to top'}
        >
          <Ionicons name="arrow-up" size={clamp(scale(24), 20, 28)} color="white" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
};

export default AboutScreen;







