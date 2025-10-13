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

const SUPPORT_EMAIL = 'support@leafnest.com';

const topics = [
  { value: 'bug', label: 'Report a Bug' },
  { value: 'idea', label: 'Feature Request' },
  { value: 'ux', label: 'Design / UX' },
  { value: 'content', label: 'Species / Content' },
  { value: 'account', label: 'Account / Login' },
  { value: 'other', label: 'Other' },
];

const SendFeedbackScreen = ({ navigation, route }) => {
  // Prefill from route if you ever want to deep-link a topic
  const prefillTopic = route?.params?.topic ?? 'bug';

  const [topic, setTopic] = useState(prefillTopic);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(''); // optional user email
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isValid = useMemo(
    () => subject.trim().length > 0 && message.trim().length > 0,
    [subject, message]
  );

  const buildMailTo = () => {
    const topicLabel = topics.find(t => t.value === topic)?.label ?? 'Other';

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
      Alert.alert('Missing info', 'Please add a subject and message.');
      return;
    }

    try {
      setSubmitting(true);
      const url = buildMailTo();
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert(
          'Cannot open email app',
          `Please email us at ${SUPPORT_EMAIL} with your feedback.`
        );
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert(
        'Something went wrong',
        `Please email us at ${SUPPORT_EMAIL} with your feedback.`
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
        <Text style={styles.title}>Send Feedback</Text>
        <Text style={styles.helper}>
          Tell us what’s working great or what could be improved. We read every message.
        </Text>

        {/* Topic pills */}
        <View style={styles.section}>
          <Text style={styles.label}>Topic</Text>
          <View style={styles.pills}>
            {topics.map(t => {
              const active = t.value === topic;
              return (
                <TouchableOpacity
                  key={t.value}
                  onPress={() => setTopic(t.value)}
                  style={[styles.pill, active && styles.pillActive]}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Subject */}
        <View style={styles.section}>
          <Text style={styles.label}>Subject</Text>
          <TextInput
            placeholder="Short summary (e.g., Scanner mislabels a leaf as maple)"
            placeholderTextColor="#9aa0a6"
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            autoCapitalize="sentences"
          />
        </View>

        {/* Message */}
        <View style={styles.section}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            placeholder="Describe what happened, steps to reproduce, and expectations…"
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
          <Text style={styles.label}>Your Email (optional)</Text>
          <TextInput
            placeholder="We’ll reply here if needed"
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
            <Text style={styles.label}>Include Diagnostics</Text>
            <Text style={styles.caption}>
              Helps us debug issues (platform & OS only).
            </Text>
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
          <Text style={styles.submitText}>{submitting ? 'Opening Mail…' : 'Send Feedback'}</Text>
        </TouchableOpacity>

        {/* Footer / alt contact */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Or email us directly at <Text style={styles.link}>{SUPPORT_EMAIL}</Text>
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
