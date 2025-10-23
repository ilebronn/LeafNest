import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
  StatusBar,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../contexts/LanguageContext";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

// Responsive sizing (matching HomeScreen)
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

const isTablet = width > 600;

export default function SettingsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { currentLanguage, languages, changeLanguage, getCurrentLanguageName } = useLanguage();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const scrollY = useRef(new Animated.Value(0)).current;

  const handleLanguageChange = async () => {
    await changeLanguage(selectedLanguage);
    setShowLanguagePicker(false);
  };

  const openLanguagePicker = () => {
    setSelectedLanguage(currentLanguage);
    setShowLanguagePicker(true);
  };

  const SettingsItem = ({ icon, title, subtitle, onPress, color, showChevron = true }) => (
    <TouchableOpacity 
      style={styles.settingsItem} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Ionicons name={icon} size={moderateScale(24)} color="#fff" />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && <Ionicons name="chevron-forward" size={moderateScale(22)} color="#999" />}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#5E936C" />
        
        {/* Animated Header (matching HomeScreen) */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <LinearGradient
            colors={['#5E936C', '#4A7A5A']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <SafeAreaView edges={['top']}>
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>
                  {t("settings.title") || "Settings"}
                </Text>
              </View>
            </SafeAreaView>
          </LinearGradient>
        </Animated.View>

        <Animated.ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {/* General Section */}
          <SectionHeader title="General" />
          <View style={styles.section}>
            <SettingsItem
              icon="information-circle-outline"
              title={t("settings.about") || "About"}
              subtitle={t("settings.appName") || "LeafNest"}
              onPress={() => navigation.navigate("AboutScreen")}
              color="#5E936C"
            />
            <View style={styles.divider} />
            <SettingsItem
              icon="language-outline"
              title={t("settings.language") || "Language"}
              subtitle={getCurrentLanguageName()}
              onPress={openLanguagePicker}
              color="#2196F3"
            />
          </View>

          {/* Support Section */}
          <SectionHeader title="Support" />
          <View style={styles.section}>
            <SettingsItem
              icon="help-circle-outline"
              title={t("settings.help") || "Help"}
              onPress={() => navigation.navigate("HelpScreen")}
              color="#9C27B0"
            />
            <View style={styles.divider} />
            <SettingsItem
              icon="chatbubble-ellipses-outline"
              title={t("settings.sendFeedback") || "Send Feedback"}
              onPress={() => navigation.navigate("SendFeedbackScreen")}
              color="#00BCD4"
            />
            <View style={styles.divider} />
            <SettingsItem
              icon="help-buoy-outline"
              title={t("settings.faq") || "FAQ"}
              onPress={() => navigation.navigate("FAQScreen")}
              color="#FF5722"
            />
          </View>

          {/* Legal Section */}
          <SectionHeader title="Legal" />
          <View style={styles.section}>
            <SettingsItem
              icon="document-text-outline"
              title={t("settings.termsOfUse") || "Terms of Use"}
              onPress={() => navigation.navigate("TermsOfUse")}
              color="#607D8B"
            />
            <View style={styles.divider} />
            <SettingsItem
              icon="shield-checkmark-outline"
              title="Privacy Policy"
              onPress={() => navigation.navigate("CookiesPolicy")}
              color="#795548"
            />
          </View>

          {/* App Version */}
          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>LeafNest v1.0.0</Text>
            <Text style={styles.copyrightText}>© 2025 LeafNest. All rights reserved.</Text>
          </View>

          <View style={{ height: verticalScale(100) }} />
        </Animated.ScrollView>

        {/* Language Picker Modal */}
        <Modal
          visible={showLanguagePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowLanguagePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: height * 0.75 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t("settings.selectLanguage") || "Select Language"}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowLanguagePicker(false)}
                  style={styles.closeButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={moderateScale(28)} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.languageList}
                showsVerticalScrollIndicator={false}
              >
                {languages.map((language) => (
                  <TouchableOpacity
                    key={language.code}
                    style={[
                      styles.languageItem,
                      selectedLanguage === language.code && styles.languageItemSelected
                    ]}
                    onPress={() => setSelectedLanguage(language.code)}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={styles.languageName}>{language.nativeName}</Text>
                      <Text style={styles.languageCode}>{language.name}</Text>
                    </View>
                    {selectedLanguage === language.code && (
                      <Ionicons name="checkmark-circle" size={moderateScale(24)} color="#5E936C" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowLanguagePicker(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>
                    {t("common.cancel") || "Cancel"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleLanguageChange}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#5E936C', '#3E704C']}
                    style={styles.saveButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.saveButtonText}>
                      {t("common.save") || "Save"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerGradient: {
    paddingBottom: moderateScale(20),
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: moderateScale(20),
    paddingTop: moderateScale(10),
  },
  headerTitle: {
    fontSize: moderateScale(22),
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? verticalScale(100) : verticalScale(120),
  },
  scrollContent: {
    padding: moderateScale(20),
    paddingBottom: verticalScale(40),
  },
  sectionHeader: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: verticalScale(20),
    marginBottom: verticalScale(12),
    marginLeft: moderateScale(4),
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: verticalScale(8),
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moderateScale(16),
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: moderateScale(76),
  },
  iconContainer: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(15),
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: moderateScale(13),
    color: '#6B7280',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(40),
    marginTop: verticalScale(20),
  },
  versionText: {
    fontSize: moderateScale(13),
    color: '#9CA3AF',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: moderateScale(12),
    color: '#D1D5DB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: moderateScale(30),
    borderTopRightRadius: moderateScale(30),
    padding: moderateScale(20),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    paddingBottom: verticalScale(15),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: moderateScale(4),
  },
  languageList: {
    maxHeight: height * 0.4,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(16),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(8),
    backgroundColor: '#F9FAFB',
  },
  languageItemSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#5E936C',
  },
  languageName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  languageCode: {
    fontSize: moderateScale(13),
    color: '#6B7280',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: moderateScale(12),
    marginTop: verticalScale(20),
  },
  modalButton: {
    flex: 1,
    borderRadius: moderateScale(12),
    overflow: 'hidden',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    padding: moderateScale(16),
    alignItems: 'center',
  },
  saveButton: {
    overflow: 'hidden',
  },
  saveButtonGradient: {
    padding: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#4B5563',
    fontWeight: '600',
    fontSize: moderateScale(16),
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: moderateScale(16),
  },
});