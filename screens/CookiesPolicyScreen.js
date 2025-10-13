import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const CookiesPolicyScreen = ({ navigation }) => {
  const { width, height } = useWindowDimensions();

  // Responsive helpers
  const scale = (size) => (width / 375) * size; // Based on iPhone X width (375px)
  const vScale = (size) => (height / 812) * size; // Based on iPhone X height (812px)

  const scalePadding = (size) => scale(size);
  const scaleFontSize = (size) => scale(size);

  return (
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity style={[styles.backButton, { top: vScale(40) }]} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={scaleFontSize(28)} color="#5E936C" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={[styles.contentContainer, { paddingHorizontal: scalePadding(20) }]}>
        <Text style={[styles.title, { fontSize: scaleFontSize(28) }]}>Cookies Policy</Text>

        <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(18) }]}>Effective Date: July 1, 2025</Text>

        <Text style={[styles.paragraph, { fontSize: scaleFontSize(16) }]}>
          This Cookies Policy explains how we use cookies to enhance your experience when you visit our app and use its features. By using this app, you consent to the use of cookies as described in this policy.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(18) }]}>What Are Cookies?</Text>
        <Text style={[styles.paragraph, { fontSize: scaleFontSize(16) }]}>
          Cookies are small text files that are stored on your device when you visit websites or use apps. They help us understand how you interact with our service and allow us to provide you with a better experience.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(18) }]}>How We Use Cookies</Text>
        <Text style={[styles.paragraph, { fontSize: scaleFontSize(16) }]}>
          We use cookies for several purposes, including:
          {'\n\n'}
          - To personalize content and ads
          {'\n'}
          - To analyze traffic and improve user experience
          {'\n'}
          - To enable certain features of our app
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(18) }]}>Managing Cookies</Text>
        <Text style={[styles.paragraph, { fontSize: scaleFontSize(16) }]}>
          You can control the use of cookies through your device settings. However, please note that disabling cookies may affect your experience and functionality of the app.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(18) }]}>Changes to This Policy</Text>
        <Text style={[styles.paragraph, { fontSize: scaleFontSize(16) }]}>
          We may update this Cookies Policy from time to time. Any changes will be posted on this page with an updated revision date. Please check this page periodically for updates.
        </Text>

        <Text style={[styles.sectionTitle, { fontSize: scaleFontSize(18) }]}>Contact Us</Text>
        <Text style={[styles.paragraph, { fontSize: scaleFontSize(16) }]}>
          If you have any questions or concerns regarding this Cookies Policy, please contact us at support@leafnest.com.
        </Text>

        {/* Copyright Footer */}
        <View style={styles.footer}>
          <Text style={[styles.copyright, { fontSize: scaleFontSize(14) }]}>
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
    left: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 50,
    zIndex: 1,
  },
  contentContainer: {
    paddingTop: 30,
  },
  title: {
    fontWeight: 'bold',
    color: '#5E936C',
    marginBottom: 20,
    textAlign: 'center',
    top: -10,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#5E936C',
    marginTop: 15,
    marginBottom: 10,
  },
  paragraph: {
    color: '#333',
    lineHeight: 24,
    marginBottom: 10,
  },
  footer: {
    marginTop: 40,
    paddingVertical: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  copyright: {
    color: '#888',
    textAlign: 'center',
  },
});

export default CookiesPolicyScreen;
