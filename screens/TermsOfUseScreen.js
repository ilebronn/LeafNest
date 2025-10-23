import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const TermsOfUseScreen = ({ navigation }) => {
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
      icon: 'document-text',
      title: 'Acceptance of Terms',
      content: 'By accessing or using the LeafNest app, you agree to be bound by these Terms of Use. If you do not agree to these terms, you should not use the app.'
    },
    {
      icon: 'person',
      title: 'User Responsibilities',
      content: 'You agree to use the app only for lawful purposes and in a manner that does not infringe on the rights of others. You are responsible for maintaining the confidentiality of your account information.'
    },
    {
      icon: 'shield-checkmark',
      title: 'Intellectual Property',
      content: 'All content, trademarks, logos, and intellectual property within the app are owned by LeafNest or licensed to us. Unauthorized use of our intellectual property is strictly prohibited.'
    },
    {
      icon: 'lock-closed',
      title: 'Privacy and Data Collection',
      content: 'We collect and process personal information as described in our Privacy Policy. By using our app, you consent to our data collection, storage, and processing practices.'
    },
    {
      icon: 'warning',
      title: 'Limitation of Liability',
      content: 'LeafNest is not liable for any damages, losses, or injuries arising from the use of the app or its services. You use the app at your own risk and discretion.'
    },
    {
      icon: 'refresh',
      title: 'Changes to Terms',
      content: 'We reserve the right to update these Terms of Use at any time. Any changes will be posted on this page with an updated effective date. Continued use constitutes acceptance of changes.'
    },
    {
      icon: 'mail',
      title: 'Contact Us',
      content: 'If you have any questions, concerns, or feedback about these Terms of Use, please contact us at leafnest.capstone@gmail.com.'
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
          <Text style={styles.title}>Terms of Use</Text>
          <Text style={styles.subtitle}>Please read carefully before using</Text>
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
            These Terms of Use govern the use of the LeafNest app and services. By using our app, you agree to these terms and conditions.
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
          </View>
        ))}

        {/* Footer Card */}
        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Thank You</Text>
          <Text style={styles.footerText}>
            Thank you for taking the time to review our Terms of Use. Your trust and compliance help us create a better experience for everyone.
          </Text>
          <View style={styles.divider} />
          <Text style={styles.copyright}>© 2025 LeafNest. All rights reserved.</Text>
          <Text style={styles.lastUpdated}>Last updated: July 1, 2025</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default TermsOfUseScreen;