// screens/PlanScreen.js -
import React, { useState, useEffect } from "react";
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
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { auth } from "@config/firebase";
import { getUserSubscription } from "@firestoreService/subscription/subscriptionService";
import { checkPaymentStatus } from "@firestoreService/payment/manualPaymentService";

const { width, height } = Dimensions.get("window");

export default function PlanScreen({ navigation }) {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentUser = auth.currentUser;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const loadData = async () => {
    await Promise.all([
      loadSubscriptionStatus(),
      loadPaymentStatus(),
    ]);
    setLoading(false);
  };

  const loadSubscriptionStatus = async () => {
    if (!currentUser) {
      setSelectedPlan('free');
      return;
    }

    try {
      const result = await getUserSubscription(currentUser.uid);
      if (result.success) {
        setCurrentSubscription(result);
        if (result.isActive && result.tier === 'premium') {
          setSelectedPlan('premium');
        } else {
          setSelectedPlan('free');
        }
      } else {
        setSelectedPlan('free');
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      setSelectedPlan('free');
    }
  };

  const loadPaymentStatus = async () => {
    if (!currentUser) return;

    try {
      const result = await checkPaymentStatus(currentUser.uid);
      if (result.success) {
        setPaymentStatus(result);
      }
    } catch (error) {
      console.error('Error loading payment status:', error);
    }
  };

  const handleSubscribe = async (plan) => {
    if (!currentUser) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to subscribe to Premium.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Sign In", 
            onPress: () => navigation.navigate('SignIn') 
          },
        ]
      );
      return;
    }

    if (plan === "free") {
      const isPremium = currentSubscription?.isActive && currentSubscription?.tier === 'premium';
      
      if (isPremium) {
        Alert.alert(
          "Switch to Free Plan?",
          "Your Premium features will remain active until your subscription expires.",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "OK", 
              onPress: () => {
                Alert.alert(
                  "Premium Active",
                  `Your Premium features will remain active until ${new Date(currentSubscription.expiryDate).toLocaleDateString()}.`,
                  [{ text: "Got it" }]
                );
              }
            },
          ]
        );
      } else {
        Alert.alert(
          "Free Plan",
          "You're currently on the Free plan with:\n\n• 5 scans every 12 hours\n• 5 downloads every 12 hours",
          [{ text: "OK" }]
        );
      }
      return;
    }

    // Check if already premium
    if (currentSubscription?.isActive && currentSubscription?.tier === 'premium') {
      Alert.alert(
        "Already Premium",
        `You're already a Premium member! Your subscription expires on ${new Date(currentSubscription.expiryDate).toLocaleDateString()}.`,
        [{ text: "OK" }]
      );
      return;
    }

    // Check if there's a pending payment
    if (paymentStatus?.status === 'pending') {
      Alert.alert(
        "Payment Pending",
        "You have a payment submission under review. Please wait for verification.",
        [
          { text: "OK" },
          { 
            text: "View Status", 
            onPress: () => navigation.navigate('ManualPayment')
          }
        ]
      );
      return;
    }

    // Show payment method options
    showPaymentMethodOptions();
  };

  const showPaymentMethodOptions = () => {
    Alert.alert(
      "Choose Payment Method",
      "Select how you'd like to pay for Premium:",
      [
        {
          text: "GCash QR Code",
          onPress: () => navigation.navigate('ManualPayment')
        },
        {
          text: "Cancel",
          style: "cancel"
        }
      ]
    );
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
      name: "Free Plan",
      price: "₱0",
      popular: false,
      features: [
        { text: "5 scans every 12 hours", included: true },
        { text: "5 downloads every 12 hours", included: true },
        { text: "Offline favorites", included: false },
        { text: "Offline history", included: false },
        { text: "Priority support", included: false },
      ],
      gradient: ["#E8F5E9", "#C8E6C9"],
      accentColor: "#5E936C",
    },
    {
      id: "premium",
      name: "Premium",
      price: "₱99/mo",
      popular: true,
      features: [
        { text: "Unlimited scans", included: true },
        { text: "Unlimited downloads", included: true },
        { text: "Offline favorites", included: true },
        { text: "Offline history", included: true },
        { text: "Priority support", included: true },
      ],
      gradient: ["#5E936C", "#3E704C"],
      accentColor: "#FFD700",
    },
  ];

  const isPremium = currentSubscription?.isActive && currentSubscription?.tier === 'premium';
  const isFree = !isPremium;

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#5E936C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={["#5E936C", "#3E704C", "#2E5A3C"]}
        style={styles.backgroundGradient}
      >
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </LinearGradient>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Choose Your Plan</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Premium Status Banner */}
          {isPremium && (
            <View style={styles.statusBanner}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.statusTitle}>You're Premium! 🎉</Text>
                <Text style={styles.statusSubtitle}>
                  {currentSubscription.daysRemaining} days remaining • Expires {new Date(currentSubscription.expiryDate).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}

          {/* Pending Payment Banner */}
          {paymentStatus?.status === 'pending' && (
            <TouchableOpacity 
              style={[styles.statusBanner, { backgroundColor: 'rgba(255, 152, 0, 0.15)', borderColor: 'rgba(255, 152, 0, 0.3)' }]}
              onPress={() => navigation.navigate('ManualPayment')}
            >
              <Ionicons name="time" size={24} color="#FF9800" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.statusTitle}>Payment Under Review ⏳</Text>
                <Text style={styles.statusSubtitle}>
                  We're verifying your payment. Tap to view status.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FF9800" />
            </TouchableOpacity>
          )}

          {/* Free Plan Banner */}
          {isFree && paymentStatus?.status !== 'pending' && (
            <View style={[styles.statusBanner, { backgroundColor: 'rgba(147, 197, 253, 0.15)', borderColor: 'rgba(147, 197, 253, 0.3)' }]}>
              <Ionicons name="information-circle" size={24} color="#93C5FD" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.statusTitle}>Free Plan Active</Text>
                <Text style={styles.statusSubtitle}>
                  5 scans & downloads every 12 hours
                </Text>
              </View>
            </View>
          )}

          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="rocket" size={48} color="#FFD700" />
            </View>
            <Text style={styles.mainTitle}>Unlock Full Access</Text>
            <Text style={styles.mainSubtitle}>
              Get unlimited scans, downloads, and offline access
            </Text>
          </View>

          {/* Plans Container */}
          <View style={styles.plansContainer}>
            {plans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                activeOpacity={0.9}
                onPress={() => setSelectedPlan(plan.id)}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.planCardSelected,
                ]}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.popularText}>Most Popular</Text>
                  </View>
                )}

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

                  <View
                    style={[
                      styles.divider,
                      plan.id === "premium" && styles.dividerPremium,
                    ]}
                  />

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
                            name={feature.included ? "checkmark" : "close"}
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
            onPress={() => handleSubscribe(selectedPlan)}
          >
            <LinearGradient
              colors={selectedPlan === "free" ? ["#93C5FD", "#60A5FA"] : ["#FFD700", "#FFA500"]}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.ctaText}>
                {selectedPlan === "free"
                  ? "Continue with Free"
                  : "Pay with GCash QR"}
              </Text>
              {selectedPlan === "premium" && (
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer Info */}
          <View style={styles.footerInfo}>
            <Ionicons name="shield-checkmark" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.footerText}>
              {selectedPlan === "free" 
                ? "No payment required • Upgrade anytime"
                : "Scan QR & upload proof • Verified within 24hrs"}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Keep all your existing styles - they're perfect!
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
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  statusSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
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