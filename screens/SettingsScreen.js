import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useLanguage } from "../contexts/LanguageContext";
import UsernameEditModal from "../components/UsernameEditModal";
import {
  getCurrentUsername,
  updateUsernameInFirebase,
  clearAllUserData,
} from "../utils/userUtils";

const { width, height } = Dimensions.get('window');

// Responsive sizing functions
const scale = (size) => (width / 375) * size;
const verticalScale = (size) => (height / 812) * size;
const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

// Device detection
const isSmallScreen = width < 375;
const isTablet = width > 600;

export default function SettingsScreen({ navigation, route }) {
  const isGuest = route?.params?.guest ?? false;
  const { t } = useTranslation();
  const { currentLanguage, languages, changeLanguage, getCurrentLanguageName } =
    useLanguage();
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage);
  const [username, setUsername] = useState("");
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsername();
  }, []);

  const loadUsername = async () => {
    if (!isGuest) {
      const currentUsername = await getCurrentUsername();
      setUsername(currentUsername || "");
    }
  };

  const handleLogout = async () => {
    try {
      await clearAllUserData();

      if (isGuest) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      await signOut(auth);
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    } catch (e) {
      console.error("Logout error:", e);
      Alert.alert(t("common.error"), e?.message ?? t("settings.logoutError"));
    }
  };

  const handleLanguageChange = async () => {
    await changeLanguage(selectedLanguage);
    setShowLanguagePicker(false);
  };

  const openLanguagePicker = () => {
    setSelectedLanguage(currentLanguage);
    setShowLanguagePicker(true);
  };

  const handleUsernameUpdate = async (newUsername) => {
    setLoading(true);
    try {
      await updateUsernameInFirebase(newUsername);
      setUsername(newUsername);
      setShowUsernameModal(false);
      Alert.alert(t("common.success"), t("settings.usernameUpdated"));
    } catch (error) {
      Alert.alert(
        t("common.error"),
        error.message || t("settings.usernameUpdateError")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Modern Gradient Header - Fixed at top */}
      <LinearGradient
        colors={["#5E936C", "#3E704C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.topbar,
          isTablet && styles.topbarTablet
        ]}
      >
        <Text style={[
          styles.topbarTitle,
          isTablet && styles.topbarTitleTablet
        ]}>
          {t("settings.title")}
        </Text>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.container,
          isTablet && styles.containerTablet
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Username */}
        {!isGuest && (
          <TouchableOpacity
            style={[
              styles.card,
              isTablet && styles.cardTablet
            ]}
            onPress={() => setShowUsernameModal(true)}
          >
            <Ionicons name="person-outline" size={moderateScale(22)} color="#5E936C" />
            <View style={styles.cardText}>
              <Text style={[
                styles.label,
                isTablet && styles.labelTablet
              ]}>
                {t("settings.username")}
              </Text>
              <Text style={[
                styles.value,
                isTablet && styles.valueTablet
              ]}>
                {username || t("common.loading")}
              </Text>
            </View>
            <Ionicons name="create-outline" size={moderateScale(20)} color="#999" />
          </TouchableOpacity>
        )}

        {/* About */}
        <TouchableOpacity
          style={[
            styles.card,
            isTablet && styles.cardTablet
          ]}
          onPress={() => navigation.navigate("AboutScreen")}
        >
          <Ionicons name="information-circle-outline" size={moderateScale(22)} color="#5E936C" />
          <View style={styles.cardText}>
            <Text style={[
              styles.label,
              isTablet && styles.labelTablet
            ]}>
              {t("settings.about")}
            </Text>
            <Text style={[
              styles.value,
              isTablet && styles.valueTablet
            ]}>
              {t("settings.appName")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={moderateScale(20)} color="#999" />
        </TouchableOpacity>

        {/* Language */}
        <TouchableOpacity 
          style={[
            styles.card,
            isTablet && styles.cardTablet
          ]} 
          onPress={openLanguagePicker}
        >
          <Ionicons name="language-outline" size={moderateScale(22)} color="#5E936C" />
          <View style={styles.cardText}>
            <Text style={[
              styles.label,
              isTablet && styles.labelTablet
            ]}>
              {t("settings.language")}
            </Text>
            <Text style={[
              styles.value,
              isTablet && styles.valueTablet
            ]}>
              {getCurrentLanguageName()}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={moderateScale(20)} color="#999" />
        </TouchableOpacity>

        {/* Plan */}
        <TouchableOpacity
          style={[
            styles.card,
            isTablet && styles.cardTablet
          ]}
          onPress={() => navigation.navigate("PlanScreen")}
        >
          <Ionicons name="star-outline" size={moderateScale(22)} color="#5E936C" />
          <View style={styles.cardText}>
            <Text style={[
              styles.label,
              isTablet && styles.labelTablet
            ]}>
              {t("settings.yourPlan")}
            </Text>
            <Text style={[
              styles.value,
              isTablet && styles.valueTablet
            ]}>
              {t("settings.leafNestFree")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={moderateScale(20)} color="#999" />
        </TouchableOpacity>

        {/* Help */}
        <TouchableOpacity
          style={[
            styles.card,
            isTablet && styles.cardTablet
          ]}
          onPress={() => navigation.navigate("HelpScreen")}
        >
          <Ionicons name="help-circle-outline" size={moderateScale(22)} color="#5E936C" />
          <View style={styles.cardText}>
            <Text style={[
              styles.value,
              isTablet && styles.valueTablet
            ]}>
              {t("settings.help")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={moderateScale(20)} color="#999" />
        </TouchableOpacity>

        {/* Feedback */}
        <TouchableOpacity
          style={[
            styles.card,
            isTablet && styles.cardTablet
          ]}
          onPress={() => navigation.navigate("SendFeedbackScreen")}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={moderateScale(22)} color="#5E936C" />
          <View style={styles.cardText}>
            <Text style={[
              styles.value,
              isTablet && styles.valueTablet
            ]}>
              {t("settings.sendFeedback")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={moderateScale(20)} color="#999" />
        </TouchableOpacity>

        {/* FAQ */}
        <TouchableOpacity
          style={[
            styles.card,
            isTablet && styles.cardTablet
          ]}
          onPress={() => navigation.navigate("FAQScreen")}
        >
          <Ionicons name="help-buoy-outline" size={moderateScale(22)} color="#5E936C" />
          <View style={styles.cardText}>
            <Text style={[
              styles.value,
              isTablet && styles.valueTablet
            ]}>
              {t("settings.faq")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={moderateScale(20)} color="#999" />
        </TouchableOpacity>

        {/* Terms */}
        <TouchableOpacity
          style={[
            styles.card,
            isTablet && styles.cardTablet
          ]}
          onPress={() => navigation.navigate("TermsOfUse")}
        >
          <Ionicons name="document-text-outline" size={moderateScale(22)} color="#5E936C" />
          <View style={styles.cardText}>
            <Text style={[
              styles.value,
              isTablet && styles.valueTablet
            ]}>
              {t("settings.termsOfUse")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={moderateScale(20)} color="#999" />
        </TouchableOpacity>

        {/* Logout */}
        {!isGuest && (
          <TouchableOpacity 
            style={[
              styles.logoutBtn,
              isTablet && styles.logoutBtnTablet
            ]} 
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={moderateScale(20)} color="#fff" />
            <Text style={[
              styles.logoutText,
              isTablet && styles.logoutTextTablet
            ]}>
              {t("settings.logout") || "Log Out"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Language Picker Modal */}
      <Modal
        visible={showLanguagePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguagePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            isTablet && styles.modalContentTablet
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[
                styles.modalTitle,
                isTablet && styles.modalTitleTablet
              ]}>
                {t("settings.selectLanguage")}
              </Text>
              <TouchableOpacity
                onPress={() => setShowLanguagePicker(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={moderateScale(24)} color="#666" />
              </TouchableOpacity>
            </View>

            <Picker
              selectedValue={selectedLanguage}
              onValueChange={(itemValue) => setSelectedLanguage(itemValue)}
              style={[
                styles.picker,
                isTablet && styles.pickerTablet
              ]}
            >
              {languages.map((language) => (
                <Picker.Item
                  key={language.code}
                  label={`${language.nativeName} (${language.name})`}
                  value={language.code}
                />
              ))}
            </Picker>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.cancelButton,
                  isTablet && styles.modalButtonTablet
                ]}
                onPress={() => setShowLanguagePicker(false)}
              >
                <Text style={[
                  styles.cancelButtonText,
                  isTablet && styles.buttonTextTablet
                ]}>
                  {t("common.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  styles.saveButton,
                  isTablet && styles.modalButtonTablet
                ]}
                onPress={handleLanguageChange}
              >
                <Text style={[
                  styles.saveButtonText,
                  isTablet && styles.buttonTextTablet
                ]}>
                  {t("common.save")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Username modal */}
      <UsernameEditModal
        visible={showUsernameModal}
        onClose={() => setShowUsernameModal(false)}
        onSave={handleUsernameUpdate}
        loading={loading}
        initialValue={username}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: "#f9f9f9" 
  },
topbar: {
    position: 'absolute',  // Fix to the top
    top: 0,                // Always at the top
    left: 0,
    right: 0,
    paddingVertical: verticalScale(30),
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: moderateScale(30),
    borderBottomRightRadius: moderateScale(30),
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
  },
  topbarTablet: {
    paddingVertical: verticalScale(40),
    borderBottomLeftRadius: moderateScale(40),
    borderBottomRightRadius: moderateScale(40),
  },
  topbarTitle: {
    color: "#fff",
    fontSize: moderateScale(28),
    fontWeight: "700",
    marginTop: verticalScale(10),
  },
  topbarTitleTablet: {
    fontSize: moderateScale(34),
    marginTop: verticalScale(15),
  },


  scrollView: {
    flex: 1,
    marginTop: verticalScale(90),
  },
  container: {
    padding: scale(20),
    paddingBottom: verticalScale(40),
  },
  containerTablet: {
    paddingHorizontal: scale(60),
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },

    card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: moderateScale(20), // Adjusts the border radius for different screen sizes
    padding: isTablet ? scale(25) : scale(20), // More padding on tablet-sized devices
    marginBottom: verticalScale(15),
    width: isTablet ? '80%' : '100%', // Smaller width on tablet for consistency
    maxWidth: 400, // Max width to avoid over-expansion on large screens
    shadowColor: "#000",
    shadowOpacity: 0.5, // Increased opacity for more visible shadow
    shadowRadius: 8,
    elevation: 23,
    marginHorizontal: isTablet ? '10%' : '1%', // Adjusted horizontal margin for tablet screens
  },
  cardTablet: {
    padding: scale(24),
    marginBottom: verticalScale(16),
    borderRadius: moderateScale(20),
  },
  cardText: {
    flex: 1,
    marginLeft: scale(12),
  },
  label: { 
    fontSize: moderateScale(13), 
    color: "#888" 
  },
  labelTablet: {
    fontSize: moderateScale(15),
  },
  value: { 
    fontSize: moderateScale(16), 
    fontWeight: "600", 
    color: "#333" 
  },
  valueTablet: {
    fontSize: moderateScale(18),
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E63946",
    paddingVertical: verticalScale(14),
    borderRadius: moderateScale(16),
    marginTop: verticalScale(20),
  },
  logoutBtnTablet: {
    paddingVertical: verticalScale(18),
    borderRadius: moderateScale(20),
    marginTop: verticalScale(30),
  },
  logoutText: {
    color: "#fff",
    fontSize: moderateScale(16),
    fontWeight: "700",
    marginLeft: scale(6),
  },
  logoutTextTablet: {
    fontSize: moderateScale(18),
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: moderateScale(20),
    padding: scale(20),
    width: "85%",
    maxHeight: "70%",
  },
  modalContentTablet: {
    width: "70%",
    maxWidth: 600,
    padding: scale(30),
    borderRadius: moderateScale(24),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(20),
  },
  modalTitle: { 
    fontSize: moderateScale(18), 
    fontWeight: "700", 
    color: "#333" 
  },
  modalTitleTablet: {
    fontSize: moderateScale(22),
  },
  closeButton: { 
    padding: moderateScale(5) 
  },
  picker: { 
    height: verticalScale(200), 
    marginBottom: verticalScale(20) 
  },
  pickerTablet: {
    height: verticalScale(250),
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale(10),
  },
  modalButton: {
    flex: 1,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(10),
    alignItems: "center",
  },
  modalButtonTablet: {
    paddingVertical: verticalScale(15),
    borderRadius: moderateScale(12),
  },
  cancelButton: { 
    backgroundColor: "#f0f0f0" 
  },
  saveButton: { 
    backgroundColor: "#5E936C" 
  },
  cancelButtonText: { 
    color: "#666", 
    fontWeight: "600",
    fontSize: moderateScale(14),
  },
  saveButtonText: { 
    color: "#fff", 
    fontWeight: "600",
    fontSize: moderateScale(14),
  },
  buttonTextTablet: {
    fontSize: moderateScale(16),
  },
});