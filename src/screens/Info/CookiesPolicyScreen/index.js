import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import PropTypes from 'prop-types';

// Constants
const COLORS = {
  primary: '#5E936C',
  primaryLight: '#7FB28A',
  primaryDark: '#2D5A3F',
  background: '#F8F9FA',
  cardBackground: '#fff',
  border: '#E5E7EB',
  lightGreen: '#F0F7F3',
  lightGreenBorder: '#D1E5D8',
  textPrimary: '#1F2937',
  textSecondary: '#4B5563',
  textTertiary: '#6B7280',
  textLight: '#9CA3AF',
  white: '#fff',
  whiteTransparent: 'rgba(255,255,255,0.95)',
  whiteTransparent90: 'rgba(255,255,255,0.9)',
};

const BASE_DIMENSIONS = {
  width: 375,
  height: 812,
};

const SECTION_ICONS = [
  'help-circle',
  'settings',
  'albums',
  'options',
  'time',
  'refresh',
  'mail',
];

// Memoized Section Card Component
const SectionCard = React.memo(({ section, styles, scale, vScale, clamp }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeader}>
      <View style={styles.iconContainer}>
        <Ionicons name={section.icon} size={clamp(scale(22), 20, 26)} color={COLORS.primary} />
      </View>
      <Text style={styles.sectionTitle}>{section.title}</Text>
    </View>
    <Text style={styles.sectionContent}>{section.content}</Text>
    {section.list && (
      <View style={styles.listContainer}>
        {section.list.map((item, idx) => (
          <View key={`list-item-${idx}`} style={styles.listItem}>
            <View style={styles.bullet} />
            <Text style={styles.listText}>{item}</Text>
          </View>
        ))}
      </View>
    )}
  </View>
));

SectionCard.propTypes = {
  section: PropTypes.shape({
    icon: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    content: PropTypes.string.isRequired,
    list: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  styles: PropTypes.object.isRequired,
  scale: PropTypes.func.isRequired,
  vScale: PropTypes.func.isRequired,
  clamp: PropTypes.func.isRequired,
};

// Style creation function
const createStyles = (scalingValues) => {
  const { width, hPad, cardPad, titleFS, sectionTitleFS, bodyFS, smallFS, dateFS, backIconSize, vScale, scale, clamp, isTablet } = scalingValues;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
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
      backgroundColor: COLORS.whiteTransparent,
      borderRadius: 24,
      padding: clamp(scale(10), 8, 12),
      zIndex: 10,
    },
    title: {
      fontSize: titleFS,
      fontWeight: '700',
      color: COLORS.white,
      textAlign: 'center',
      letterSpacing: 0.5,
      marginTop: Platform.OS === 'ios' ? 0 : vScale(10),
    },
    subtitle: {
      fontSize: clamp(scale(14), 12, 16),
      color: COLORS.whiteTransparent90,
      textAlign: 'center',
      marginTop: vScale(6),
      marginLeft: vScale(20),
    },
    scrollContainer: {
      paddingHorizontal: hPad,
      paddingTop: Platform.OS === 'ios' ? vScale(140) : vScale(130),
      paddingBottom: vScale(40),
      maxWidth: isTablet ? 800 : '100%',
      alignSelf: 'center',
      width: '100%',
    },
    introCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 20,
      padding: cardPad,
      marginBottom: vScale(20),
      borderWidth: 2,
      borderColor: COLORS.border,
    },
    effectiveDate: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.lightGreen,
      paddingVertical: clamp(vScale(10), 8, 12),
      paddingHorizontal: clamp(scale(16), 12, 20),
      borderRadius: 12,
      marginBottom: vScale(16),
      borderWidth: 2,
      borderColor: COLORS.lightGreenBorder,
    },
    dateText: {
      fontSize: dateFS,
      fontWeight: '600',
      color: COLORS.primaryDark,
      marginLeft: clamp(scale(8), 6, 10),
    },
    introText: {
      fontSize: bodyFS,
      color: COLORS.textSecondary,
      lineHeight: clamp(scale(24), 20, 26),
      textAlign: 'center',
    },
    sectionCard: {
      backgroundColor: COLORS.cardBackground,
      borderRadius: 16,
      padding: cardPad,
      marginBottom: vScale(16),
      borderWidth: 2,
      borderColor: COLORS.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: vScale(12),
    },
    iconContainer: {
      width: clamp(scale(40), 36, 44),
      height: clamp(scale(40), 36, 44),
      borderRadius: 12,
      backgroundColor: COLORS.lightGreen,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: clamp(scale(12), 10, 14),
      borderWidth: 2,
      borderColor: COLORS.lightGreenBorder,
    },
    sectionTitle: {
      fontSize: sectionTitleFS,
      fontWeight: '700',
      color: COLORS.textPrimary,
      letterSpacing: 0.3,
      flex: 1,
    },
    sectionContent: {
      fontSize: bodyFS,
      color: COLORS.textSecondary,
      lineHeight: clamp(scale(24), 20, 26),
      marginBottom: vScale(8),
    },
    listContainer: {
      marginTop: vScale(8),
    },
    listItem: {
      flexDirection: 'row',
      marginBottom: vScale(8),
      paddingLeft: clamp(scale(8), 6, 10),
    },
    bullet: {
      width: clamp(scale(6), 5, 8),
      height: clamp(scale(6), 5, 8),
      borderRadius: 3,
      backgroundColor: COLORS.primary,
      marginRight: clamp(scale(10), 8, 12),
      marginTop: vScale(8),
    },
    listText: {
      fontSize: bodyFS,
      color: COLORS.textSecondary,
      lineHeight: clamp(scale(24), 20, 26),
      flex: 1,
    },
    footerCard: {
      backgroundColor: COLORS.lightGreen,
      borderRadius: 20,
      padding: clamp(scale(24), 20, 28),
      marginTop: vScale(12),
      marginBottom: vScale(20),
      alignItems: 'center',
      borderWidth: 2,
      borderColor: COLORS.lightGreenBorder,
    },
    footerTitle: {
      fontSize: sectionTitleFS,
      fontWeight: '700',
      color: COLORS.primaryDark,
      marginBottom: vScale(8),
      textAlign: 'center',
    },
    footerText: {
      fontSize: bodyFS,
      color: COLORS.textSecondary,
      textAlign: 'center',
      marginBottom: vScale(16),
      lineHeight: clamp(scale(24), 20, 26),
    },
    divider: {
      height: 2,
      backgroundColor: COLORS.lightGreenBorder,
      width: '100%',
      marginVertical: vScale(16),
    },
    copyright: {
      fontSize: smallFS,
      color: COLORS.textTertiary,
      textAlign: 'center',
    },
    lastUpdated: {
      fontSize: smallFS,
      color: COLORS.textLight,
      textAlign: 'center',
      marginTop: vScale(6),
      fontStyle: 'italic',
    },
  });
};

const CookiesPolicyScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();

  // Memoize scaling calculations
  const scalingValues = React.useMemo(() => {
    const scale = (size) => (width / BASE_DIMENSIONS.width) * size;
    const vScale = (size) => (height / BASE_DIMENSIONS.height) * size;
    const clamp = (val, min, max) => Math.max(min, Math.min(val, max));
    const clampFS = (size, min = 12, max = 22) => clamp(scale(size), min, max);

    return {
      width,
      height,
      hPad: clamp(scale(20), 16, 28),
      cardPad: clamp(scale(20), 16, 24),
      titleFS: clampFS(28, 22, 32),
      sectionTitleFS: clampFS(20, 18, 24),
      bodyFS: clampFS(15, 13, 17),
      smallFS: clampFS(13, 11, 15),
      dateFS: clampFS(14, 12, 16),
      backIconSize: clamp(scale(26), 22, 28),
      isTablet: width > 600,
      scale,
      vScale,
      clamp,
    };
  }, [width, height]);

  // Memoize sections data
  const sections = React.useMemo(() => {
    const sectionsData = t('legal.cookies.sections', { returnObjects: true });
    
    if (!Array.isArray(sectionsData)) {
      console.warn('Cookies sections translation missing or invalid');
      return [];
    }
    
    return sectionsData.map((section, index) => ({
      icon: SECTION_ICONS[index] || 'information-circle',
      id: section.id || `section-${index}`,
      ...section,
    }));
  }, [t]);

  // Memoize styles
  const styles = React.useMemo(
    () => createStyles(scalingValues),
    [scalingValues]
  );

  const handleGoBack = React.useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={[COLORS.primary, COLORS.primaryLight]} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleGoBack}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={t('common.goBack') || 'Go back'}
          accessibilityHint={t('common.goBackHint') || 'Navigate to previous screen'}
        >
          <Ionicons name="arrow-back" size={scalingValues.backIconSize} color={COLORS.primaryDark} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{t('legal.cookies.title') || 'Cookies Policy'}</Text>
          <Text style={styles.subtitle}>{t('legal.cookies.subtitle') || 'Understanding how we use cookies'}</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction Card */}
        <View style={styles.introCard}>
          <View style={styles.effectiveDate}>
            <Ionicons name="calendar" size={scalingValues.clamp(scalingValues.scale(18), 16, 20)} color={COLORS.primary} />
            <Text style={styles.dateText}>{t('legal.cookies.effectiveDate') || 'Effective Date: January 1, 2024'}</Text>
          </View>
          <Text style={styles.introText}>
            {t('legal.cookies.intro') || 'This Cookies Policy explains how we use cookies and similar technologies.'}
          </Text>
        </View>

        {/* Section Cards */}
        {sections.length > 0 ? (
          sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              styles={styles}
              scale={scalingValues.scale}
              vScale={scalingValues.vScale}
              clamp={scalingValues.clamp}
            />
          ))
        ) : (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionContent}>
              {t('legal.cookies.noContent') || 'Content not available. Please check your internet connection.'}
            </Text>
          </View>
        )}

        {/* Footer Card */}
        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>{t('legal.cookies.footerTitle') || 'Questions?'}</Text>
          <Text style={styles.footerText}>
            {t('legal.cookies.footerText') || 'If you have any questions about our cookies policy, please contact us.'}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.copyright}>{t('legal.cookies.copyright') || '© 2024 All rights reserved'}</Text>
          <Text style={styles.lastUpdated}>{t('legal.cookies.lastUpdated') || 'Last updated: January 1, 2024'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

CookiesPolicyScreen.propTypes = {
  navigation: PropTypes.shape({
    goBack: PropTypes.func.isRequired,
  }).isRequired,
};

export default CookiesPolicyScreen;