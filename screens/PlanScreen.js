import React, { useState } from "react";
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
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

const { width, height } = Dimensions.get("window");

export default function PlanScreen({ navigation }) {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState("premium");

  const handleSubscribe = (plan) => {
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

  const plans = [
    {
      id: "free",
      name: t("plan.free"),
      price: t("plan.freePrice"),
      popular: false,
      features: [
        { text: t("plan.freeFeature1"), included: true },
        { text: t("plan.freeFeature2"), included: true },
        { text: t("plan.freeFeature3"), included: false },
        { text: t("plan.freeFeature4"), included: false },
      ],
      gradient: ["#E8F5E9", "#C8E6C9"],
      accentColor: "#5E936C",
    },
    {
      id: "premium",
      name: t("plan.premium"),
      price: t("plan.premiumPrice"),
      popular: true,
      features: [
        { text: t("plan.premiumFeature1"), included: true },
        { text: t("plan.premiumFeature2"), included: true },
        { text: t("plan.premiumFeature3"), included: true },
        { text: t("plan.premiumFeature4"), included: true },
      ],
      gradient: ["#5E936C", "#3E704C"],
      accentColor: "#FFD700",
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Animated Background Gradient */}
      <LinearGradient
        colors={["#5E936C", "#3E704C", "#2E5A3C"]}
        style={styles.backgroundGradient}
      >
        {/* Decorative circles */}
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </LinearGradient>

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("plan.title")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="rocket" size={48} color="#FFD700" />
            </View>
            <Text style={styles.mainTitle}>{t("plan.upgradeTitle")}</Text>
            <Text style={styles.mainSubtitle}>{t("plan.upgradeSubtitle")}</Text>
          </View>

          {/* Plans Container */}
          <View style={styles.plansContainer}>
            {plans.map((plan, index) => (
              <TouchableOpacity
                key={plan.id}
                activeOpacity={0.9}
                onPress={() => setSelectedPlan(plan.id)}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.planCardSelected,
                ]}
              >
                {/* Popular Badge */}
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.popularText}>Most Popular</Text>
                  </View>
                )}

                {/* Selection Indicator */}
                {selectedPlan === plan.id && (
                  <View style={styles.selectionCheckmark}>
                    <Ionicons name="checkmark-circle" size={32} color="#FFD700" />
                  </View>
                )}

                <LinearGradient
                  colors={plan.gradient}
                  style={[
                    styles.planGradient,
                    plan.id === "premium" && styles.premiumGradient,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* Plan Header */}
                  <View style={styles.planHeader}>
                    <Text
                      style={[
                        styles.planName,
                        plan.id === "premium" && styles.planNamePremium,
                      ]}
                    >
                      {plan.name}
                    </Text>
                    <View style={styles.priceContainer}>
                      <Text
                        style={[
                          styles.planPrice,
                          plan.id === "premium" && styles.planPricePremium,
                        ]}
                      >
                        {plan.price}
                      </Text>
                    </View>
                  </View>

                  {/* Divider */}
                  <View
                    style={[
                      styles.divider,
                      plan.id === "premium" && styles.dividerPremium,
                    ]}
                  />

                  {/* Features List */}
                  <View style={styles.featuresContainer}>
                    {plan.features.map((feature, idx) => (
                      <View key={idx} style={styles.featureRow}>
                        <View
                          style={[
                            styles.featureIcon,
                            plan.id === "premium" && styles.featureIconPremium,
                          ]}
                        >
                          <Ionicons
                            name={
                              feature.included
                                ? "checkmark"
                                : "close"
                            }
                            size={16}
                            color={
                              plan.id === "premium"
                                ? "#fff"
                                : feature.included
                                ? "#5E936C"
                                : "#FF6B6B"
                            }
                          />
                        </View>
                        <Text
                          style={[
                            styles.featureText,
                            plan.id === "premium" && styles.featureTextPremium,
                            !feature.included && styles.featureTextDisabled,
                          ]}
                        >
                          {feature.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() =>
              handleSubscribe(
                plans.find((p) => p.id === selectedPlan)?.name || ""
              )
            }
          >
            <LinearGradient
              colors={["#FFD700", "#FFA500"]}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaText}>
                {selectedPlan === "free"
                  ? "Continue with Free"
                  : t("plan.subscribeNow")}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer Info */}
          <View style={styles.footerInfo}>
            <Ionicons name="shield-checkmark" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.footerText}>
              Cancel anytime • Secure payment • Money-back guarantee
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: "absolute",
    borderRadius: 1000,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -50,
  },
  circle3: {
    width: 150,
    height: 150,
    top: height * 0.4,
    right: 20,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight + 10 : 10,
    paddingBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  heroSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: width > 768 ? 36 : 28,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 12,
  },
  mainSubtitle: {
    fontSize: width > 768 ? 18 : 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 24,
  },
  plansContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  planCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 3,
    borderColor: "transparent",
    position: "relative",
  },
  planCardSelected: {
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  popularBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 10,
  },
  popularText: {
    color: "#FFD700",
    fontSize: 12,
    fontWeight: "700",
  },
  selectionCheckmark: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  planGradient: {
    padding: 24,
    minHeight: 280,
  },
  premiumGradient: {
    paddingBottom: 28,
  },
  planHeader: {
    marginBottom: 20,
  },
  planName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#333",
    marginBottom: 8,
    left: 28,
  },
  planNamePremium: {
    color: "#fff",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "700",
    color: "#5E936C",
  },
  planPricePremium: {
    color: "#FFD700",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    marginBottom: 20,
  },
  dividerPremium: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  featuresContainer: {
    gap: 14,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(94, 147, 108, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureIconPremium: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: "#333",
    lineHeight: 20,
  },
  featureTextPremium: {
    color: "#fff",
  },
  featureTextDisabled: {
    opacity: 0.5,
  },
  ctaButton: {
    marginHorizontal: 20,
    marginTop: 30,
    borderRadius: 30,
    overflow: "hidden",
    shadowColor: "#FFD700",
    shadowOpacity: 0.4,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingHorizontal: 20,
    gap: 8,
  },
  footerText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
});