import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

const { width } = Dimensions.get("window");

export default function PlanScreen({ navigation }) {
  const { t } = useTranslation();

  const handleSubscribe = (plan) => {
    // TODO: integrate payment here (Stripe, RevenueCat, etc.)
    alert(t("plan.selectedPlan", { plan }));
  };

  const handleBackPress = () => {
    try {
      navigation?.canGoBack?.()
        ? navigation.goBack()
        : navigation?.navigate?.("MainTabs", { screen: "Home" });
    } catch {
      navigation?.navigate?.("MainTabs", { screen: "Home" });
    }
  };

  return (
    <View style={styles.container}>
      {/* Fixed Gradient Header */}
      <LinearGradient
        colors={["#5E936C", "#3E704C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <SafeAreaView style={styles.headerSafe}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.iconBtn} onPress={handleBackPress}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {t("plan.title")}
            </Text>
            <View style={{ width: 40 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* Scrollable Content */}
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t("plan.upgradeTitle")}</Text>
        <Text style={styles.subtitle}>{t("plan.upgradeSubtitle")}</Text>

        {/* Free Plan */}
        <View style={styles.card}>
          <Text style={styles.planTitle}>{t("plan.free")}</Text>
          <Text style={styles.price}>{t("plan.freePrice")}</Text>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color="#5E936C" />
            <Text style={styles.featureText}>{t("plan.freeFeature1")}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color="#5E936C" />
            <Text style={styles.featureText}>{t("plan.freeFeature2")}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="close-circle" size={20} color="#FF6B6B" />
            <Text style={styles.featureText}>{t("plan.freeFeature3")}</Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="close-circle" size={20} color="#FF6B6B" />
            <Text style={styles.featureText}>{t("plan.freeFeature4")}</Text>
          </View>
        </View>

        {/* Premium Plan */}
        <View style={[styles.card, styles.premiumCard]}>
          <Text style={[styles.planTitle, { color: "#fff" }]}>
            {t("plan.premium")}
          </Text>
          <Text style={[styles.price, { color: "#fff" }]}>
            {t("plan.premiumPrice")}
          </Text>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={[styles.featureText, { color: "#fff" }]}>
              {t("plan.premiumFeature1")}
            </Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={[styles.featureText, { color: "#fff" }]}>
              {t("plan.premiumFeature2")}
            </Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={[styles.featureText, { color: "#fff" }]}>
              {t("plan.premiumFeature3")}
            </Text>
          </View>
          <View style={styles.feature}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={[styles.featureText, { color: "#fff" }]}>
              {t("plan.premiumFeature4")}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.subscribeBtn}
            onPress={() => handleSubscribe(t("plan.premium"))}
          >
            <Text style={styles.subscribeText}>{t("plan.subscribeNow")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },

  // Fixed Header
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  headerSafe: {
    width: "100%",
  },
  headerContent: {
    paddingHorizontal: width > 768 ? 40 : 20,
    paddingTop: Platform.OS === "ios" ? 8 : 12,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerTitle: {
    fontSize: width > 768 ? 32 : 28,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
  },

  scrollContainer: {
    paddingTop: Platform.OS === "ios" ? 100 : 80,
    padding: width > 768 ? 40 : 20,
    alignItems: "center",
    paddingBottom: 40,
    flex: 1,
    marginTop: 20,
  },
  title: {
    fontSize: width > 768 ? 32 : 26,
    fontWeight: "700",
    color: "#333",
    marginTop: 10,
    marginBottom: 8,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: width > 768 ? 18 : 16,
    color: "#666",
    marginBottom: 30,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    maxWidth: width > 768 ? 500 : "90%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: width > 768 ? 28 : 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  premiumCard: {
    backgroundColor: "#5E936C",
  },
  planTitle: {
    fontSize: width > 768 ? 26 : 22,
    fontWeight: "700",
    marginBottom: 5,
    textAlign: "center",
  },
  price: {
    fontSize: width > 768 ? 20 : 18,
    fontWeight: "600",
    marginBottom: 15,
    textAlign: "center",
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  featureText: {
    marginLeft: 8,
    fontSize: width > 768 ? 16 : 15,
    color: "#333",
    flex: 1,
  },
  subscribeBtn: {
    marginTop: 20,
    backgroundColor: "#fff",
    paddingVertical: width > 768 ? 16 : 14,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  subscribeText: {
    color: "#5E936C",
    fontSize: width > 768 ? 18 : 16,
    fontWeight: "700",
  },
});