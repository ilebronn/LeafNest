import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Switch,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const SUPPORT_EMAIL = 'leafnest.capstone@gmail.com';
const TOPIC_KEYS = ['bug', 'idea', 'ux', 'content', 'account', 'other'];

const SendFeedbackScreen = ({ navigation, route }) => {
  // Prefill from route if you ever want to deep-link a topic
  const { t } = useTranslation();
  const prefillTopic = route?.params?.topic ?? 'bug';

  const [topic, setTopic] = useState(prefillTopic);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(''); // optional user email
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const topicOptions = useMemo(
    () =>
      TOPIC_KEYS.map((key) => ({
        value: key,
        label: t(`feedback.topics.${key}`),
      })),
    [t]
  );

  const isValid = useMemo(
    () => subject.trim().length > 0 && message.trim().length > 0,
    [subject, message]
  );
  const footerTemplate = t('feedback.footerText', { email: '__EMAIL__' });
  const [footerPrefix = '', footerSuffix = ''] = footerTemplate.split('__EMAIL__');

  const buildMailTo = () => {
    const topicLabel = topicOptions.find(tItem => tItem.value === topic)?.label ?? t('feedback.topics.other');

    const diagnostics = includeDiagnostics
      ? `\n\n---\nDiagnostics (auto-included)\nPlatform: ${Platform.OS}\nOS Version: ${Platform.Version}\nApp: LeafNest\n---`
      : '';

    const fromLine = email.trim().length ? `From: ${email.trim()}\n` : '';

    const body =
      `${fromLine}Topic: ${topicLabel}\n` +
      `Subject: ${subject.trim()}\n\n` +
      `${message.trim()}${diagnostics}`;

    const encodedSubject = encodeURIComponent(`[LeafNest] ${topicLabel} - ${subject.trim()}`);
    const encodedBody = encodeURIComponent(body);

    return `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}&body=${encodedBody}`;
  };

  const onSubmit = async () => {
    if (!isValid) {
      Alert.alert(t('feedback.alerts.missingInfoTitle'), t('feedback.alerts.missingInfoMessage'));
      return;
    }

    try {
      setSubmitting(true);
      const url = buildMailTo();
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert(
          t('feedback.alerts.noEmailAppTitle'),
          t('feedback.alerts.noEmailAppMessage', { email: SUPPORT_EMAIL })
        );
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert(
        t('feedback.alerts.genericErrorTitle'),
        t('feedback.alerts.genericErrorMessage', { email: SUPPORT_EMAIL })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Back button (same placement/design style as your PrivacyPolicyScreen) */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={28} color="#5E936C" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>{t('feedback.title')}</Text>
        <Text style={styles.helper}>{t('feedback.subtitle')}</Text>

        {/* Topic pills */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('feedback.topicLabel')}</Text>
          <View style={styles.pills}>
            {topicOptions.map(option => {
              const active = option.value === topic;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setTopic(option.value)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Subject */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('feedback.subjectLabel')}</Text>
          <TextInput
            placeholder={t('feedback.subjectPlaceholder')}
            placeholderTextColor="#9aa0a6"
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            autoCapitalize="sentences"
          />
        </View>

        {/* Message */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('feedback.messageLabel')}</Text>
          <TextInput
            placeholder={t('feedback.messagePlaceholder')}
            placeholderTextColor="#9aa0a6"
            style={[styles.input, styles.textarea]}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Optional contact email */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('feedback.emailLabel')}</Text>
          <TextInput
            placeholder={t('feedback.emailPlaceholder')}
            placeholderTextColor="#9aa0a6"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />
        </View>

        {/* Include diagnostics */}
        <View style={[styles.section, styles.switchRow]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>{t('feedback.includeDiagnostics')}</Text>
            <Text style={styles.caption}>{t('feedback.diagnosticsHint')}</Text>
          </View>
          <Switch
            value={includeDiagnostics}
            onValueChange={setIncludeDiagnostics}
            thumbColor={includeDiagnostics ? '#5E936C' : '#ccc'}
            trackColor={{ true: '#b9d2bf', false: '#ddd' }}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          disabled={!isValid || submitting}
          onPress={onSubmit}
          style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
        >
          <Ionicons name="paper-plane" size={18} color="#fff" />
          <Text style={styles.submitText}>
            {submitting ? t('feedback.submitting') : t('feedback.submit')}
          </Text>
        </TouchableOpacity>

        {/* Footer / alt contact */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {footerPrefix}
            <Text style={styles.link}>{SUPPORT_EMAIL}</Text>
            {footerSuffix}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SendFeedbackScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  // Back button like your PrivacyPolicyScreen
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
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
    marginBottom: 10,
    textAlign: 'center',
    top: -30,
  },

  helper: {
    fontSize: 14,
    color: '#667085',
    textAlign: 'center',
    marginBottom: 20,
  },

  section: { marginBottom: 16 },

  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#344054',
    marginBottom: 8,
  },

  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d0d5dd',
    backgroundColor: '#fff',
  },

  pillActive: {
    backgroundColor: '#e8f1eb',
    borderColor: '#5E936C',
  },

  pillText: { color: '#344054', fontWeight: '600' },
  pillTextActive: { color: '#2f6b3e' },

  input: {
    borderWidth: 1,
    borderColor: '#d0d5dd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    color: '#111827',
  },

  textarea: { height: 140 },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  caption: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },

  submitBtn: {
    marginTop: 10,
    backgroundColor: '#5E936C',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },

  submitBtnDisabled: { opacity: 0.6 },

  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  footer: { marginTop: 16, alignItems: 'center' },
  footerText: { color: '#667085' },
  link: { color: '#5E936C', fontWeight: '700' },
});

