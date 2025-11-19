// screens/PlanScreen.js - FIXED DEFAULT PLAN SELECTION
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
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { auth } from "../firebase";
import { getUserSubscription } from "../firestoreService/subscriptionService";
import { 
  createGCashPayment, 
  verifyPaymentStatus,
  processSuccessfulPayment 
} from "../firestoreService/payMongoService";

const { width, height } = Dimensions.get("window");

export default function PlanScreen({ navigation }) {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState("free"); // Default to free
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    if (!currentUser) {
      setLoading(false);
      setSelectedPlan('free'); // Set to free if no user
      return;
    }

    try {
      const result = await getUserSubscription(currentUser.uid);
      if (result.success) {
        setCurrentSubscription(result);
        // Set selected plan based on subscription
        if (result.isActive && result.tier === 'premium') {
          setSelectedPlan('premium');
        } else {
          setSelectedPlan('free');
        }
      } else {
        setSelectedPlan('free'); // Default to free if no subscription
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
      setSelectedPlan('free'); // Default to free on error
    } finally {
      setLoading(false);
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
      // User selected free plan
      const isPremium = currentSubscription?.isActive && currentSubscription?.tier === 'premium';
      
      if (isPremium) {
        Alert.alert(
          "Switch to Free Plan?",
          "You're currently on the Premium plan. Your premium features will remain active until your subscription expires.",
          [
            { text: "Cancel", style: "cancel" },
            { 
              text: "OK", 
              onPress: () => {
                // Just acknowledge, keep premium until it expires
                Alert.alert(
                  "Premium Active",
                  `Your Premium features will remain active until ${new Date(currentSubscription.expiryDate).toLocaleDateString()}. After that, you'll automatically switch to the Free plan.`,
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

    // Start GCash payment flow
    initiateGCashPayment();
  };

  const initiateGCashPayment = async () => {
    Alert.alert(
      "Confirm Purchase",
      "Subscribe to Premium for ₱99/month?\n\n✅ Unlimited scans\n✅ Unlimited downloads\n✅ Offline access",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Pay with GCash", 
          onPress: async () => {
            await processGCashPayment();
          }
        },
      ],
      { cancelable: false }
    );
  };

  const processGCashPayment = async () => {
    setProcessing(true);

    try {
      console.log('🚀 Creating GCash payment...');

      // Step 1: Create payment source
      const paymentResult = await createGCashPayment(
        currentUser.uid,
        currentUser.email,
        currentUser.displayName || currentUser.email?.split('@')[0]
      );

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Failed to create payment');
      }

      console.log('✅ Payment created:', paymentResult.sourceId);

      // Step 2: Open GCash checkout URL
      const checkoutUrl = paymentResult.checkoutUrl || paymentResult.paymentUrl;
      
      if (!checkoutUrl) {
        throw new Error('No checkout URL received');
      }

      const supported = await Linking.canOpenURL(checkoutUrl);
      
      if (!supported) {
        throw new Error('Cannot open GCash payment page');
      }

      // Step 3: Open the checkout URL (this will open GCash app or browser)
      await Linking.openURL(checkoutUrl);
      
      setProcessing(false);

      // Step 4: Start polling for payment status
      Alert.alert(
        "Complete Payment in GCash",
        "Please complete the payment in the GCash app.\n\nWe'll automatically verify your payment once it's completed.",
        [
          {
            text: "I've Completed Payment",
            onPress: () => startPaymentVerification(paymentResult.sourceId || paymentResult.transactionId),
          },
          {
            text: "Cancel",
            style: "cancel",
          },
        ],
        { cancelable: false }
      );

    } catch (error) {
      setProcessing(false);
      console.error('❌ Payment error:', error);
      
      Alert.alert(
        "Payment Failed",
        error.message || "Failed to process payment. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const startPaymentVerification = async (sourceId) => {
    setVerifying(true);

    try {
      console.log('🔍 Starting payment verification for:', sourceId);

      // Poll every 3 seconds for up to 2 minutes
      let attempts = 0;
      const maxAttempts = 40;

      const pollPaymentStatus = async () => {
        if (attempts >= maxAttempts) {
          setVerifying(false);
          Alert.alert(
            "Verification Timeout",
            "Payment verification is taking longer than expected. Please check back in a few minutes or contact support if you were charged.",
            [{ text: "OK" }]
          );
          return;
        }

        attempts++;
        console.log(`Checking payment status... (${attempts}/${maxAttempts})`);

        try {
          const statusResult = await verifyPaymentStatus(sourceId);

          console.log('Payment status:', statusResult.status);

          if (statusResult.status === 'paid' || statusResult.status === 'chargeable') {
            // ✅ Payment successful!
            setVerifying(false);
            await handlePaymentSuccess(sourceId);
          } else if (statusResult.status === 'pending') {
            // Still pending, check again
            setTimeout(pollPaymentStatus, 3000);
          } else if (statusResult.status === 'expired' || statusResult.status === 'cancelled') {
            // ❌ Payment failed
            setVerifying(false);
            Alert.alert(
              "Payment Not Completed",
              "Your payment was not completed. Please try again.",
              [{ text: "OK" }]
            );
          } else {
            // Unknown status, keep polling
            setTimeout(pollPaymentStatus, 3000);
          }
        } catch (error) {
          console.error('Verification error:', error);
          // Continue polling even on error
          setTimeout(pollPaymentStatus, 3000);
        }
      };

      // Start polling
      pollPaymentStatus();

    } catch (error) {
      setVerifying(false);
      console.error('❌ Verification error:', error);
      
      Alert.alert(
        "Verification Failed",
        "Could not verify payment. Please contact support if you were charged.",
        [{ text: "OK" }]
      );
    }
  };

  const handlePaymentSuccess = async (sourceId) => {
    try {
      console.log('✅ Processing successful payment...');

      // Process the payment and activate subscription
      const result = await processSuccessfulPayment(currentUser.uid, sourceId);

      if (result.success) {
        Alert.alert(
          "🎉 Welcome to Premium!",
          "Your payment was successful! You now have unlimited scans and downloads for 30 days.",
          [
            { 
              text: "Great!", 
              onPress: () => {
                loadSubscriptionStatus();
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        throw new Error(result.error || 'Failed to activate subscription');
      }
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      Alert.alert(
        "Activation Failed",
        "Payment was successful but subscription activation failed. Please contact support.",
        [{ text: "OK" }]
      );
    }
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

  // Determine current plan status
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
          {/* Current Status Banner - Premium */}
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

          {/* Current Status Banner - Free */}
          {isFree && !verifying && (
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

          {/* Verifying Banner */}
          {verifying && (
            <View style={[styles.statusBanner, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.statusTitle}>Verifying Payment...</Text>
                <Text style={styles.statusSubtitle}>
                  Please wait while we confirm your payment
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
            style={[styles.ctaButton, (processing || verifying) && styles.ctaButtonDisabled]}
            onPress={() => handleSubscribe(selectedPlan)}
            disabled={processing || verifying}
          >
            <LinearGradient
              colors={selectedPlan === "free" ? ["#93C5FD", "#60A5FA"] : ["#FFD700", "#FFA500"]}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {(processing || verifying) ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.ctaText}>
                    {selectedPlan === "free"
                      ? "Continue with Free"
                      : "Pay with GCash"}
                  </Text>
                  {selectedPlan === "premium" && (
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  )}
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Footer Info */}
          <View style={styles.footerInfo}>
            <Ionicons name="shield-checkmark" size={16} color="rgba(255,255,255,0.7)" />
            <Text style={styles.footerText}>
              {selectedPlan === "free" 
                ? "No payment required • Upgrade anytime"
                : "Secure GCash payment • Cancel anytime"}
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
  ctaButtonDisabled: {
    opacity: 0.6,
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