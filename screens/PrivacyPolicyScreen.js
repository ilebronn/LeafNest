import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Responsive sizing functions
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const PrivacyPolicyScreen = ({ navigation }) => {
  // Check device size
  const isSmallScreen = width < 375;
  const isTablet = width > 600;
  const isLargeTablet = width > 900;

  return (
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity 
        style={[
          styles.backButton,
          isTablet && styles.backButtonTablet
        ]} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons 
          name="arrow-back" 
          size={moderateScale(28)} 
          color="#5E936C" 
        />
      </TouchableOpacity>

      <ScrollView 
        contentContainerStyle={[
          styles.contentContainer,
          isTablet && styles.contentContainerTablet,
          isLargeTablet && styles.contentContainerLargeTablet
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[
          styles.title,
          isTablet && styles.titleTablet
        ]}>
          Privacy Policy
        </Text>
        
        <Text style={[
          styles.sectionTitle,
          isTablet && styles.sectionTitleTablet
        ]}>
          Effective Date: July 1, 2025
        </Text>
        
        <Text style={[
          styles.paragraph,
          isTablet && styles.paragraphTablet
        ]}>
          At LeafNest, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy outlines how we collect, use, and safeguard your data when you use our mobile application.
        </Text>

        <Text style={[
          styles.sectionTitle,
          isTablet && styles.sectionTitleTablet
        ]}>
          Information We Collect
        </Text>
        <Text style={[
          styles.paragraph,
          isTablet && styles.paragraphTablet
        ]}>
          We collect information you provide directly to us, such as when you create an account, upload photos, or contact us for support. This may include your name, email address, and any other information you choose to provide.
        </Text>

        <Text style={[
          styles.sectionTitle,
          isTablet && styles.sectionTitleTablet
        ]}>
          How We Use Your Information
        </Text>
        <Text style={[
          styles.paragraph,
          isTablet && styles.paragraphTablet
        ]}>
          We use the information we collect to provide, maintain, and improve our services, to communicate with you, and to develop new features. We do not sell your personal information to third parties.
        </Text>

        <Text style={[
          styles.sectionTitle,
          isTablet && styles.sectionTitleTablet
        ]}>
          Data Security
        </Text>
        <Text style={[
          styles.paragraph,
          isTablet && styles.paragraphTablet
        ]}>
          We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </Text>

        <Text style={[
          styles.sectionTitle,
          isTablet && styles.sectionTitleTablet
        ]}>
          Your Rights
        </Text>
        <Text style={[
          styles.paragraph,
          isTablet && styles.paragraphTablet
        ]}>
          You have the right to access, update, or delete your personal information. You can do this through your account settings or by contacting us directly.
        </Text>

        <Text style={[
          styles.sectionTitle,
          isTablet && styles.sectionTitleTablet
        ]}>
          Contact Us
        </Text>
        <Text style={[
          styles.paragraph,
          isTablet && styles.paragraphTablet
        ]}>
          If you have any questions about this Privacy Policy or our privacy practices, please contact us at privacy@leafnest.com.
        </Text>

        {/* Copyright Footer */}
        <View style={styles.footer}>
          <Text style={[
            styles.copyright,
            isTablet && styles.copyrightTablet
          ]}>
            © 2025 LeafNest. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? verticalScale(50) : verticalScale(40),
    left: scale(20),
    padding: moderateScale(10),
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: moderateScale(50),
    zIndex: 1,
  },
  backButtonTablet: {
    top: verticalScale(60),
    left: scale(30),
    padding: moderateScale(12),
  },
  contentContainer: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(80),
    paddingBottom: verticalScale(30),
  },
  contentContainerTablet: {
    paddingHorizontal: scale(60),
    paddingTop: verticalScale(100),
    paddingBottom: verticalScale(40),
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  contentContainerLargeTablet: {
    maxWidth: 1000,
    paddingHorizontal: scale(80),
  },
  title: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: '#5E936C',
    marginBottom: verticalScale(20),
    textAlign: 'center',
    marginTop: verticalScale(-40),
  },
  titleTablet: {
    fontSize: moderateScale(36),
    marginBottom: verticalScale(30),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#5E936C',
    marginTop: verticalScale(15),
    marginBottom: verticalScale(10),
  },
  sectionTitleTablet: {
    fontSize: moderateScale(22),
    marginTop: verticalScale(20),
    marginBottom: verticalScale(12),
  },
  paragraph: {
    fontSize: moderateScale(16),
    color: '#333',
    lineHeight: moderateScale(24),
    marginBottom: verticalScale(10),
  },
  paragraphTablet: {
    fontSize: moderateScale(18),
    lineHeight: moderateScale(28),
    marginBottom: verticalScale(12),
  },
  footer: {
    marginTop: verticalScale(40),
    paddingVertical: verticalScale(20),
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  copyright: {
    fontSize: moderateScale(14),
    color: '#888',
    textAlign: 'center',
  },
  copyrightTablet: {
    fontSize: moderateScale(16),
  },
});

export default PrivacyPolicyScreen;