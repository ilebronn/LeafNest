import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../contexts/LanguageContext";

const { width, height } = Dimensions.get('window');

export default function SettingsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { currentLanguage, languages, changeLanguage, getCurrentLanguageName } = useLanguage();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);

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
        <Ionicons name={icon} size={24} color="#fff" />
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{title}</Text>
        {subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
      </View>
      {showChevron && <Ionicons name="chevron-forward" size={22} color="#999" />}
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#5E936C" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t("settings.title") || "Settings"}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
          <SettingsItem
            icon="chatbubble-ellipses-outline"
            title={t("settings.sendFeedback") || "Send Feedback"}
            onPress={() => navigation.navigate("SendFeedbackScreen")}
            color="#00BCD4"
          />
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

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("settings.selectLanguage") || "Select Language"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowLanguagePicker(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.languageList}>
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
                    <Ionicons name="checkmark-circle" size={24} color="#5E936C" />
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
                <Text style={styles.saveButtonText}>
                  {t("common.save") || "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
  backgroundColor: '#5E936C',
  paddingTop: 50,
  paddingBottom: 20,
  paddingHorizontal: 20,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between', // Important for even spacing
  borderBottomLeftRadius: 40,
  borderBottomRightRadius: 40,
},
  headerTitle: {
  fontSize: 30,
  fontWeight: '700',
  color: '#fff',
  textAlign: 'center',
  flex: 1,
  right: -20, 
},
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 12,
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  versionText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 12,
    color: '#bbb',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  languageList: {
    maxHeight: height * 0.4,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  languageItemSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#5E936C',
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  languageCode: {
    fontSize: 13,
    color: '#999',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  saveButton: {
    backgroundColor: '#5E936C',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});