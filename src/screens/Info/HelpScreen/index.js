import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const SUPPORT_EMAIL = 'leafnest.dev@gmail.com';

const HelpScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const quickStart = t('help.quickStart.bullets', { returnObjects: true }) || [];
  const bestResults = t('help.bestResults.bullets', { returnObjects: true }) || [];
  const troubleshooting = t('help.troubleshooting.bullets', { returnObjects: true }) || [];
  const openSupportEmail = async () => {
    const subject = encodeURIComponent('[LeafNest] Help');
    const body = encodeURIComponent(
      'Hi LeafNest team,\n\nI need help with...\n\n(Please add details)'
    );
    const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert(
        t('help.alerts.noEmailTitle'),
        t('help.alerts.noEmailBody', { email: SUPPORT_EMAIL })
      );
      return;
    }
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Floating Back Button (same placement/design as your PrivacyPolicyScreen) */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color="#5E936C" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>{t('help.title')}</Text>
        <Text style={styles.subtitle}>{t('help.subtitle')}</Text>

        {/* Quick Start */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('help.quickStart.title')}</Text>
          {quickStart.map((text, index) => (
            <View key={`quick-${index}`} style={styles.bulletRow}>
              <Ionicons name="checkmark-circle" size={18} color="#5E936C" />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('ScanScreen')}
          >
            <Ionicons name="camera" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>{t('help.quickStart.cta')}</Text>
          </TouchableOpacity>
          {/* If your route is CameraCaptureScreen instead, change the navigate name above. */}
        </View>

        {/* How to get better results */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('help.bestResults.title')}</Text>
          {bestResults.map((text, index) => (
            <View key={`best-${index}`} style={styles.bulletRow}>
              <Ionicons name="sunny" size={18} color="#5E936C" />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Troubleshooting */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('help.troubleshooting.title')}</Text>
          {troubleshooting.map((text, index) => (
            <View key={`trouble-${index}`} style={styles.bulletRow}>
              <Ionicons name="warning" size={18} color="#B45309" />
              <Text style={styles.bulletText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Links / actions */}
        <View style={styles.linkCard}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('FAQScreen')}
          >
            <Text style={styles.linkText}>{t('help.links.faq')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('SendFeedbackScreen')}
          >
            <Text style={styles.linkText}>{t('help.links.feedback')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('AboutScreen')}>
            <Text style={styles.linkText}>{t('help.links.about')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('PrivacyPolicy')}>
            <Text style={styles.linkText}>{t('help.links.privacy')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate('TermsOfUse')}>
            <Text style={styles.linkText}>{t('help.links.terms')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.linkRow} onPress={openSupportEmail}>
            <Text style={styles.linkText}>{t('help.links.contact')}</Text>
            <Ionicons name="mail" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default HelpScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // Floating back button like PrivacyPolicyScreen
  
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 50,
    zIndex: 1,
  },

  contentContainer: {
    padding: 20,
    paddingTop: 80, // room for back button
  },

  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5E936C',
    textAlign: 'center',
    top: -30,
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
  },

  card: {
    backgroundColor: '#f7f7f7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eaeaea',
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#344054',
    marginBottom: 10,
  },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },

  bulletText: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },

  bold: { fontWeight: '700' },

  primaryBtn: {
    marginTop: 12,
    backgroundColor: '#5E936C',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  linkCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eaeaea',
  },

  linkRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },

  linkText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#344054',
  },
});
