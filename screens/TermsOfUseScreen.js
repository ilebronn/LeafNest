import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Responsive sizing functions
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const TermsOfUseScreen = ({ navigation }) => {
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
          Terms of Use
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
          These Terms of Use govern the use of the LeafNest app and services. By using our app, you agree to these terms and conditions.
        </Text>

        <Text style={[
          styles.sectionTitle,
          isTablet && styles.sectionTitleTablet
        ]}>
          Acceptance of Terms
        </Text>
        <Text style={[
          styles.paragraph,
          isTablet && styles.paragraphTablet
        ]}>
          By accessing or using the app, you agree to be bound by these Terms of Use. If you do not agree to the terms, you should not use the app.
        </Text>

        <Text style={[
          styles.sectionTitle,
          isTablet && styles.sectionTitleTablet
        ]}>
          User Responsibilities
        </Text>
        <Text style={[
          styles.paragraph,
          isTablet && styles.paragraphTablet
        ]}>
          You agree to use the app only for lawful purposes and in a manner that does not infringe on the rights of others.
        </Text>

        <Text style={[
          styles.sectionTitle,
          isTablet && styles.sectionTitleTablet
        ]}>
          Intellectual Property
        </Text>
        <Text style={[
          styles.paragraph,
          isTablet && styles.paragraphTablet
        ]}>
          All content, trademarks, and intellectual property within the app are owned by LeafNest or licensed to us.
        </Text>

        <Text style={[
          styles.sectionTitle,
          isTablet && styles.sectionTitleTablet
        ]}>
          Privacy and Data Collection
        </Text>
        <Text style={[
          styles.paragraph,
          isTablet && styles.paragraphTablet
        ]}>
          We collect personal information as described in our Privacy Policy. By using our app, you consent to our data collection practices.
        </Text>

        <Text style={[
          styles.sectionTitle,
          isTablet && styles.sectionTitleTablet
        ]}>
          Limitation of Liability
        </Text>
        <Text style={[
          styles.paragraph,
          isTablet && styles.paragraphTablet
        ]}>
          LeafNest is not liable for any damages arising from the use of the app or its services. You use the app at your own risk.
        </Text>

        <Text style={[
          styles.sectionTitle,
          isTablet && styles.sectionTitleTablet
        ]}>
          Changes to Terms
        </Text>
        <Text style={[
          styles.paragraph,
          isTablet && styles.paragraphTablet
        ]}>
          We may update these Terms of Use from time to time. Any changes will be posted on this page with the updated effective date.
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
          If you have any questions about these Terms of Use, please contact us at support@leafnest.com.
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
    fontWeight: '700',
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
    fontWeight: '600',
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

export default TermsOfUseScreen