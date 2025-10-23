import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const CookiesPolicyScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();

  const baseW = 375;
  const baseH = 812;

  const scale = (size) => (width / baseW) * size;
  const vScale = (size) => (height / baseH) * size;
  const clamp = (val, min, max) => Math.max(min, Math.min(val, max));
  const clampFS = (size, min = 12, max = 22) => clamp(scale(size), min, max);

  const hPad = clamp(scale(20), 16, 28);
  const cardPad = clamp(scale(20), 16, 24);

  const titleFS = clampFS(28, 22, 32);
  const sectionTitleFS = clampFS(20, 18, 24);
  const bodyFS = clampFS(15, 13, 17);
  const smallFS = clampFS(13, 11, 15);
  const dateFS = clampFS(14, 12, 16);
  const backIconSize = clamp(scale(26), 22, 28);

  const isTablet = width > 600;

  const sections = [
    {
      icon: 'help-circle',
      title: 'What Are Cookies?',
      content: 'Cookies are small text files stored on your device when you visit websites or use apps. They help us understand how you interact with our service and allow us to provide you with a better, more personalized experience.'
    },
    {
      icon: 'settings',
      title: 'How We Use Cookies',
      content: 'We use cookies for several essential purposes:',
      list: [
        'To personalize content and advertisements',
        'To analyze traffic patterns and improve user experience',
        'To enable certain features and functionality of our app',
        'To remember your preferences and settings',
        'To provide secure access to your account'
      ]
    },
    {
      icon: 'albums',
      title: 'Types of Cookies We Use',
      content: 'We use different types of cookies to enhance your experience:',
      list: [
        'Essential Cookies: Required for basic app functionality',
        'Performance Cookies: Help us understand how you use the app',
        'Functional Cookies: Remember your preferences and choices',
        'Analytics Cookies: Provide insights into app usage patterns'
      ]
    },
    {
      icon: 'options',
      title: 'Managing Cookies',
      content: 'You can control and manage cookies through your device settings. However, please note that disabling certain cookies may affect your experience and limit the functionality of the app.'
    },
    {
      icon: 'time',
      title: 'Cookie Duration',
      content: 'Some cookies are temporary (session cookies) and are deleted when you close the app. Others remain on your device for a set period to remember your preferences across sessions.'
    },
    {
      icon: 'refresh',
      title: 'Changes to This Policy',
      content: 'We may update this Cookies Policy from time to time to reflect changes in technology or legal requirements. Any changes will be posted on this page with an updated revision date.'
    },
    {
      icon: 'mail',
      title: 'Contact Us',
      content: 'If you have any questions, concerns, or feedback regarding this Cookies Policy, please don\'t hesitate to contact us at leafnest.capstone@gmail.com.'
    },
  ];

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
      backgroundColor: '#fff',
      borderRadius: 20,
      padding: cardPad,
      marginBottom: vScale(20),
      borderWidth: 2,
      borderColor: '#E5E7EB',
    },
    effectiveDate: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F0F7F3',
      paddingVertical: clamp(vScale(10), 8, 12),
      paddingHorizontal: clamp(scale(16), 12, 20),
      borderRadius: 12,
      marginBottom: vScale(16),
      borderWidth: 2,
      borderColor: '#D1E5D8',
    },
    dateText: {
      fontSize: dateFS,
      fontWeight: '600',
      color: '#2D5A3F',
      marginLeft: clamp(scale(8), 6, 10),
    },
    introText: {
      fontSize: bodyFS,
      color: '#4B5563',
      lineHeight: clamp(scale(24), 20, 26),
      textAlign: 'center',
    },
    sectionCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: cardPad,
      marginBottom: vScale(16),
      borderWidth: 2,
      borderColor: '#E5E7EB',
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
      backgroundColor: '#F0F7F3',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: clamp(scale(12), 10, 14),
      borderWidth: 2,
      borderColor: '#D1E5D8',
    },
    sectionTitle: {
      fontSize: sectionTitleFS,
      fontWeight: '700',
      color: '#1F2937',
      letterSpacing: 0.3,
      flex: 1,
    },
    sectionContent: {
      fontSize: bodyFS,
      color: '#4B5563',
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
      backgroundColor: '#5E936C',
      marginRight: clamp(scale(10), 8, 12),
      marginTop: vScale(8),
    },
    listText: {
      fontSize: bodyFS,
      color: '#4B5563',
      lineHeight: clamp(scale(24), 20, 26),
      flex: 1,
    },
    footerCard: {
      backgroundColor: '#F0F7F3',
      borderRadius: 20,
      padding: clamp(scale(24), 20, 28),
      marginTop: vScale(12),
      marginBottom: vScale(20),
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#D1E5D8',
    },
    footerTitle: {
      fontSize: sectionTitleFS,
      fontWeight: '700',
      color: '#2D5A3F',
      marginBottom: vScale(8),
      textAlign: 'center',
    },
    footerText: {
      fontSize: bodyFS,
      color: '#4B5563',
      textAlign: 'center',
      marginBottom: vScale(16),
      lineHeight: clamp(scale(24), 20, 26),
    },
    divider: {
      height: 2,
      backgroundColor: '#D1E5D8',
      width: '100%',
      marginVertical: vScale(16),
    },
    copyright: {
      fontSize: smallFS,
      color: '#6B7280',
      textAlign: 'center',
    },
    lastUpdated: {
      fontSize: smallFS,
      color: '#9CA3AF',
      textAlign: 'center',
      marginTop: vScale(6),
      fontStyle: 'italic',
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#5E936C', '#7FB28A']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={backIconSize} color="#2D5A3F" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Cookies Policy</Text>
          <Text style={styles.subtitle}>How we use cookies to enhance your experience</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Introduction Card */}
        <View style={styles.introCard}>
          <View style={styles.effectiveDate}>
            <Ionicons name="calendar" size={clamp(scale(18), 16, 20)} color="#5E936C" />
            <Text style={styles.dateText}>Effective Date: July 1, 2025</Text>
          </View>
          <Text style={styles.introText}>
            This Cookies Policy explains how we use cookies to enhance your experience when you visit our app and use its features. By using this app, you consent to the use of cookies as described in this policy.
          </Text>
        </View>

        {/* Section Cards */}
        {sections.map((section, index) => (
          <View key={index} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconContainer}>
                <Ionicons name={section.icon} size={clamp(scale(22), 20, 26)} color="#5E936C" />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionContent}>{section.content}</Text>
            {section.list && (
              <View style={styles.listContainer}>
                {section.list.map((item, idx) => (
                  <View key={idx} style={styles.listItem}>
                    <View style={styles.bullet} />
                    <Text style={styles.listText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Footer Card */}
        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Your Privacy Matters</Text>
          <Text style={styles.footerText}>
            We are committed to transparency about how we use cookies. Your continued use of our app indicates your acceptance of this policy.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.copyright}>© 2025 LeafNest. All rights reserved.</Text>
          <Text style={styles.lastUpdated}>Last updated: July 1, 2025</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CookiesPolicyScreen;