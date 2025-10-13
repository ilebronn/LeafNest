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
  ImageBackground,
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

  // ---- Phone-first responsive helpers ----
  const baseW = 375; // iPhone X-ish
  const baseH = 812;

  const scale = (size) => (width / baseW) * size;
  const vScale = (size) => (height / baseH) * size;
  const clamp = (val, min, max) => Math.max(min, Math.min(val, max));
  const clampFS = (size, min = 12, max = 22) => clamp(scale(size), min, max);

  const isSmall = width < 360; // very small phones
  const hPad = clamp(scale(20), 14, 24);
  const cardPad = clamp(scale(20), 14, 22);

  const headerPadTop = insets.top + (Platform.OS === 'android' ? vScale(8) : vScale(4));
  const headerPadBottom = clamp(vScale(16), 10, 20);

  // Fonts kept within sane range for phones
  const titleFS = clampFS(28, 20, 30);
  const appNameFS = clampFS(34, 22, 36);
  const bodyFS = clampFS(16, 13, 18);
  const smallFS = clampFS(14, 12, 16);
  const sectionTitleFS = clampFS(20, 16, 22);
  const memberFS = clampFS(16, 14, 18);
  const mentorFS = clampFS(18, 15, 20);

  // Images/icons
  const logoSize = clamp(scale(80), 64, 96);
  const partnerLogoSize = clamp(scale(80), 64, 92);
  const iconSize = clamp(scale(26), 22, 28);

  const backBtnTop = insets.top + clamp(vScale(6), 2, 10);
  const backBtnPad = clamp(scale(8), 6, 10);

  const styles = StyleSheet.create({
    // Canvas
    backgroundImage: {
      flex: 1,
      width: '100%',
      height: '100%',
    },
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(242, 243, 245, 0.3)', // Semi-transparent overlay to maintain readability
    },
    safe: { 
      flex: 1,
    }, 

    // ====== HEADER (Pinned) ======
    header: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      paddingTop: headerPadTop,
      paddingBottom: headerPadBottom,
      paddingHorizontal: hPad,
      alignItems: 'center',
      justifyContent: 'center',
      // Enhanced shadow for background visibility
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 0,
      zIndex: 10,
    },

    // Back button: enhanced for background visibility
    backButton: {
      position: 'absolute',
      left: hPad,
      top: backBtnTop,
      backgroundColor: 'rgba(255,255,255,0.5)',
      borderRadius: 22,
      padding: backBtnPad,
      // Enhanced border for better visibility
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255,255,255,0.8)',
      // Add shadow for depth
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },

    headerTitle: {
      fontSize: titleFS,
      fontWeight: '800',
      letterSpacing: 0.2,
      color: '#fff',
      textAlign: 'center',
      // Enhanced text shadow for background readability
      textShadowColor: 'rgba(0,0,0,0.3)',
      textShadowRadius: 8,
      textShadowOffset: { width: 0, height: 2 },
    },

    scroll: {
      paddingHorizontal: hPad,
      marginTop: clamp(vScale(16), 10, 20),
    },

    // ====== CARDS (Enhanced for background) ======
    brandCard: {
      width: '100%',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.95)', // Semi-transparent for background bleed
      borderRadius: 18,
      padding: cardPad,
      // Enhanced shadow for better separation from background
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
      marginBottom: clamp(vScale(16), 10, 18),
      // Enhanced border for definition
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.6)',
      top: 70,
    },

    logo: {
      width: logoSize,
      height: logoSize,
      marginBottom: clamp(vScale(8), 4, 12),
      top: 20, 
    },

    appName: {
      fontSize: appNameFS,
      fontWeight: '900',
      color: '#2D5A3F',  // Slightly darker for better contrast
      marginBottom: clamp(vScale(6), 4, 8),
      letterSpacing: 0.3,
      // Add text shadow for definition
      textShadowColor: 'rgba(255,255,255,0.8)',
      textShadowRadius: 2,
      textShadowOffset: { width: 0, height: 1 },
    },

    description: {
      fontSize: bodyFS,
      color: '#4B5563', // Darker for better contrast
      textAlign: 'center',
    },

    sectionCard: {
      width: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.95)', // Semi-transparent
      borderRadius: 16,
      padding: cardPad,
      marginBottom: clamp(vScale(14), 10, 18),
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.6)',
      top: 70,
    },

    sectionTitle: {
      fontSize: sectionTitleFS,
      fontWeight: '800',
      color: '#2D5A3F',
      marginBottom: clamp(vScale(10), 8, 12),
      textAlign: 'center',
      letterSpacing: 0.2,
      // Add text shadow for definition
      textShadowColor: 'rgba(255,255,255,0.8)',
      textShadowRadius: 2,
      textShadowOffset: { width: 0, height: 1 },
    },

    teamMember: {
      fontSize: memberFS,
      fontWeight: '600',
      color: '#1F2937', // Darker for better contrast
      marginBottom: clamp(vScale(6), 4, 8),
      textAlign: 'center',
    },

    mentor: {
      fontSize: mentorFS,
      fontWeight: '700',
      color: '#1F2937',
      textAlign: 'center',
    },

    creditParagraph: {
      fontSize: bodyFS,
      color: '#374151', // Darker for better contrast
      textAlign: 'center',
      lineHeight: clamp(scale(22), 20, 26),
      marginBottom: clamp(vScale(16), 10, 18),
    },

    logoRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      alignItems: 'center',
      columnGap: clamp(scale(20), 14, 24),
      rowGap: clamp(vScale(10), 8, 12),
    },

    partnerLogo: {
      width: partnerLogoSize,
      height: partnerLogoSize,
      resizeMode: 'contain',
      // Enhanced outline for better definition
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.08)',
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.8)', // Background for logo clarity
    },

    // Links / meta (Enhanced for background)
    link: {
      fontSize: bodyFS,
      color: '#1E40AF', // Darker blue for better contrast
      textAlign: 'center',
      textDecorationLine: 'underline',
      fontWeight: '600',
      marginTop: clamp(vScale(16), 10, 18),
      top: 40,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      alignSelf: 'center',
    },

    version: {
      fontSize: smallFS,
      color: '#000000ff', // Darker for better contrast
      textAlign: 'center',
      marginTop: clamp(vScale(8), 6, 10),
      top: 40,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'center',
    },

    helpText: {
      fontSize: smallFS,
      color: '#000000ff', // Darker for better contrast
      textAlign: 'center',
      marginTop: clamp(vScale(6), 4, 8),
      top: 40,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      alignSelf: 'center',
      marginBottom: clamp(vScale(20), 16, 24), // Extra bottom margin
    },
  });

  return (
    <ImageBackground
      source={require('../assets/background-about.png')} // Add your background image here
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safe} edges={['top', 'right', 'left', 'bottom']}>
          {/* Header */}
          <LinearGradient colors={['#5E936C', '#7FB28A']} style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={iconSize} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>About</Text>
          </LinearGradient>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: clamp(vScale(40), 24, 48) }}
            showsVerticalScrollIndicator={false}
          >
            {/* Brand Section */}
            <View style={styles.brandCard}>
              <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.appName}>LeafNest</Text>
              <Text style={styles.description}>Developed & Designed by the LeafNest Team</Text>
            </View>

            {/* Team Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>LeafNest Team</Text>
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

            {/* Mentor Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Special Thanks</Text>
              <Text style={styles.mentor}>Mr. Joshua R. Lasac</Text>
            </View>

            {/* Credits Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.creditParagraph}>
                Originally created by the LeafNest team with support from Pinamalayan Maritime
                Foundation And Technological College INC. (PMFTCI) and the School of Computer Studies.
              </Text>
              <View style={styles.logoRow}>
                <Image source={require('../assets/PMFTCI.png')} style={styles.partnerLogo} />
                <Image source={require('../assets/IT.png')} style={styles.partnerLogo} />
              </View>
            </View>

            {/* Links + Version */}
            <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
              <Text style={styles.link}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.version}>Version 0.0.1 (1)</Text>
            <Text style={styles.helpText}>For help: help.leafnest@gmail.com</Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    </ImageBackground>
  );
};

export default AboutScreen;