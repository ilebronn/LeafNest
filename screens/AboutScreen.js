import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const AboutScreen = ({ navigation }) => {
  return (
    <SafeAreaProvider>
      <ResponsiveAbout navigation={navigation} />
    </SafeAreaProvider>
  );
};

const ResponsiveAbout = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const baseW = 375;
  const baseH = 812;

  const scale = (size) => (width / baseW) * size;
  const vScale = (size) => (height / baseH) * size;
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

  // Logo sizes - larger and more prominent
  const logoSize = clamp(scale(110), 90, 140);
  const partnerLogoSize = clamp(scale(70), 56, 86);
  const iconSize = clamp(scale(24), 20, 26);

  const backBtnTop = insets.top + clamp(vScale(6), 2, 10);
  const backBtnPad = clamp(scale(10), 8, 12);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F8F9FA',
    },
    safe: { 
      flex: 1,
    }, 

    // Flat header design
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

    // Flat card design without shadows
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

    // Flat section cards
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

    // Flat footer section
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
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe} edges={['top', 'right', 'left', 'bottom']}>
        <LinearGradient colors={['#5E936C', '#7FB28A']} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={iconSize} color="#2D5A3F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About</Text>
        </LinearGradient>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: clamp(vScale(40), 28, 52) }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Brand Card */}
          <View style={styles.brandCard}>
            <View style={styles.logoContainer}>
              <Image source={require('../assets/logo2.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.appName}>LeafNest</Text>
            <Text style={styles.tagline}>Plant & Animal Identification</Text>
            <Text style={styles.description}>Developed & Designed by the LeafNest Team</Text>
          </View>

          {/* Team Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="people" size={clamp(scale(20), 18, 24)} color="#5E936C" />
              </View>
              <Text style={styles.sectionTitle}>Development Team</Text>
            </View>
            <View style={styles.teamGrid}>
              {[
                'Lebron James Maranan',
                'Arcel Joseph Santiago',
                'Princess Diane Postrero',
                'Carlo Panganiban',
                'Rojean Paul Macalintal',
              ].map((member, idx) => (
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
              <Text style={styles.sectionTitle}>Special Thanks</Text>
            </View>
            <View style={styles.mentorCard}>
              <Text style={styles.mentor}>Mr. Joshua R. Lasac</Text>
              <Text style={styles.mentorRole}>Project Mentor & Adviser</Text>
            </View>
          </View>

          {/* Credits Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="school" size={clamp(scale(20), 18, 24)} color="#5E936C" />
              </View>
              <Text style={styles.sectionTitle}>Institutional Support</Text>
            </View>
            <Text style={styles.creditParagraph}>
              Created with support from Pinamalayan Maritime Foundation And Technological College INC. 
              (PMFTCI) and the School of Computer Studies.
            </Text>
            <View style={styles.logoRow}>
              <View style={styles.partnerLogoContainer}>
                <Image source={require('../assets/PMFTCI.png')} style={styles.partnerLogo} />
              </View>
              <View style={styles.partnerLogoContainer}>
                <Image source={require('../assets/IT.png')} style={styles.partnerLogo} />
              </View>
            </View>
          </View>

          {/* Footer Info */}
          <View style={styles.footerCard}>
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            >
              <Ionicons name="document-text" size={clamp(scale(18), 16, 20)} color="#2D5A3F" />
              <Text style={styles.linkText}>Privacy Policy</Text>
            </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <Text style={styles.version}>Version 0.0.1 (1)</Text>
            <Text style={styles.helpText}>For help: help.leafnest.capstone@gmail.com</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default AboutScreen;