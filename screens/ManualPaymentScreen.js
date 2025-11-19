// screens/ManualPaymentScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { auth } from "../firebase";
import {
  submitPaymentProof,
  checkPaymentStatus,
  PREMIUM_PRICE,
} from "../firestoreService/manualPaymentService";

// ⚠️ REPLACE THESE WITH YOUR ACTUAL GCASH DETAILS
const GCASH_QR_CODE = "https://firebasestorage.googleapis.com/v0/b/leafnest-98408.firebasestorage.app/o/payment_qr.png?alt=media&token=45ea8141-ece4-4be9-981e-75730133c8c6";
const GCASH_NUMBER = "0916-346-4373";
const GCASH_NAME = "LeafNest";
const PRICE = PREMIUM_PRICE || 99; // Fallback to 99 if import fails

export default function ManualPaymentScreen({ navigation }) {
  const [proofImage, setProofImage] = useState(null);
  const [referenceNumber, setReferenceNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const currentUser = auth.currentUser;

  useEffect(() => {
    loadPaymentStatus();
  }, []);

  const loadPaymentStatus = async () => {
    if (!currentUser) return;

    try {
      const result = await checkPaymentStatus(currentUser.uid);
      if (result.success) {
        setPaymentStatus(result);
      }
    } catch (error) {
      console.error("Error loading payment status:", error);
    } finally {
      setCheckingStatus(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photos to upload payment proof."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProofImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const handleSubmitPayment = async () => {
    if (!proofImage) {
      Alert.alert("Missing Proof", "Please upload your payment screenshot.");
      return;
    }

    if (!currentUser) {
      Alert.alert("Error", "Please sign in to submit payment.");
      return;
    }

    Alert.alert(
      "Submit Payment Proof?",
      `Make sure your screenshot clearly shows the ₱${PRICE} payment to our GCash account.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async () => {
            setLoading(true);
            try {
              const paymentDetails = {
                referenceNumber: referenceNumber,
                amount: PRICE,
                paymentDate: new Date().toISOString(),
                notes: "",
              };

              const result = await submitPaymentProof(
                currentUser.uid,
                proofImage,
                paymentDetails
              );

              if (result.success) {
                Alert.alert(
                  "Submitted Successfully! ✅",
                  "We'll verify your payment within 24 hours. You'll be notified once approved.",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        loadPaymentStatus();
                        setProofImage(null);
                        setReferenceNumber("");
                      },
                    },
                  ]
                );
              } else {
                Alert.alert(
                  "Submission Failed",
                  result.error || "Please try again."
                );
              }
            } catch (error) {
              console.error("Error submitting payment:", error);
              Alert.alert("Error", "Failed to submit payment. Please try again.");
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const downloadQRCode = () => {
    Alert.alert(
      "Save QR Code",
      "Long press on the QR code image to save it to your device.",
      [{ text: "OK" }]
    );
  };

  const openGCash = () => {
    Alert.alert(
      "Open GCash?",
      "This will open the GCash app if you have it installed.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open",
          onPress: () => {
            Linking.openURL("gcash://").catch(() => {
              Alert.alert(
                "GCash Not Found",
                "Please install the GCash app or pay manually."
              );
            });
          },
        },
      ]
    );
  };

  if (checkingStatus) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#5E936C" />
      </View>
    );
  }

  // Show status screen if payment is pending
  if (paymentStatus?.status === "pending") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={["#5E936C", "#3E704C", "#2E5A3C"]}
          style={styles.backgroundGradient}
        />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment Status</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.statusContainer}>
            <View style={styles.statusIcon}>
              <Ionicons name="time" size={64} color="#FF9800" />
            </View>
            <Text style={styles.statusTitle}>Under Review ⏳</Text>
            <Text style={styles.statusMessage}>
              We're verifying your payment. This usually takes less than 24 hours.
            </Text>

            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Amount:</Text>
                <Text style={styles.statusValue}>₱{PRICE}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Submitted:</Text>
                <Text style={styles.statusValue}>
                  {paymentStatus.submittedAt
                    ? new Date(paymentStatus.submittedAt).toLocaleDateString()
                    : "Today"}
                </Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status:</Text>
                <Text style={[styles.statusValue, { color: "#FF9800" }]}>
                  Pending Verification
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={loadPaymentStatus}
            >
              <Ionicons name="refresh" size={20} color="#5E936C" />
              <Text style={styles.refreshText}>Check Status</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backHomeButton}
              onPress={() => navigation.navigate("MainTabs", { screen: "Home" })}
            >
              <Text style={styles.backHomeText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Show rejected status
  if (paymentStatus?.status === "rejected") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={["#5E936C", "#3E704C", "#2E5A3C"]}
          style={styles.backgroundGradient}
        />

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payment Status</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.statusContainer}>
            <View style={styles.statusIcon}>
              <Ionicons name="close-circle" size={64} color="#FF6B6B" />
            </View>
            <Text style={styles.statusTitle}>Payment Not Verified</Text>
            <Text style={styles.statusMessage}>
              {paymentStatus.rejectionReason ||
                "We couldn't verify your payment. Please try again with a clear screenshot."}
            </Text>

            <TouchableOpacity
              style={styles.tryAgainButton}
              onPress={() => {
                setPaymentStatus(null);
                loadPaymentStatus();
              }}
            >
              <Text style={styles.tryAgainText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Show payment form
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#5E936C", "#3E704C", "#2E5A3C"]}
        style={styles.backgroundGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pay with GCash</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Instructions */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>How to Pay</Text>
            <View style={styles.instructionsList}>
              <View style={styles.instructionItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepText}>1</Text>
                </View>
                <Text style={styles.instructionText}>
                  Scan the QR code below using GCash app
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepText}>2</Text>
                </View>
                <Text style={styles.instructionText}>
                  Pay exactly <Text style={styles.bold}>₱{PRICE}</Text>
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepText}>3</Text>
                </View>
                <Text style={styles.instructionText}>
                  Take a screenshot of the payment confirmation
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepText}>4</Text>
                </View>
                <Text style={styles.instructionText}>
                  Upload the screenshot below and submit
                </Text>
              </View>
            </View>
          </View>

          {/* QR Code */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>GCash QR Code</Text>
            <View style={styles.qrContainer}>
              <Image
                source={{ uri: GCASH_QR_CODE }}
                style={styles.qrCode}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={downloadQRCode}
              >
                <Ionicons name="download" size={20} color="#5E936C" />
                <Text style={styles.downloadText}>Save QR Code</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.accountInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="person" size={20} color="#666" />
                <Text style={styles.infoText}>{GCASH_NAME}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="phone-portrait" size={20} color="#666" />
                <Text style={styles.infoText}>{GCASH_NUMBER}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="cash" size={20} color="#666" />
                <Text style={styles.infoText}>₱{PRICE}.00</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.gcashButton}
              onPress={openGCash}
            >
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={styles.gcashButtonText}>Open GCash App</Text>
            </TouchableOpacity>
          </View>

          {/* Upload Proof */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Upload Payment Proof</Text>
            <TouchableOpacity
              style={styles.uploadBox}
              onPress={pickImage}
              disabled={loading}
            >
              {proofImage ? (
                <Image
                  source={{ uri: proofImage }}
                  style={styles.uploadedImage}
                  resizeMode="contain"
                />
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={48} color="#5E936C" />
                  <Text style={styles.uploadText}>Tap to upload screenshot</Text>
                  <Text style={styles.uploadHint}>
                    Make sure the payment details are visible
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {proofImage && (
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={pickImage}
              >
                <Ionicons name="refresh" size={18} color="#5E936C" />
                <Text style={styles.changeImageText}>Change Image</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmitPayment}
            disabled={loading || !proofImage}
          >
            <LinearGradient
              colors={["#5E936C", "#3E704C"]}
              style={styles.submitGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.submitText}>Submit Payment Proof</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Help Text */}
          <View style={styles.helpBox}>
            <Ionicons name="help-circle" size={20} color="#93C5FD" />
            <Text style={styles.helpText}>
              Payment will be verified within 24 hours. You'll be notified once
              approved.
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
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 16,
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#5E936C",
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
    paddingTop: 3,
  },
  bold: {
    fontWeight: "700",
    color: "#5E936C",
  },
  qrContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  qrCode: {
    width: 250,
    height: 250,
    borderRadius: 16,
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "rgba(94, 147, 108, 0.1)",
    borderRadius: 12,
  },
  downloadText: {
    color: "#5E936C",
    fontSize: 14,
    fontWeight: "600",
  },
  accountInfo: {
    backgroundColor: "rgba(94, 147, 108, 0.05)",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  gcashButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#007DFF",
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  gcashButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  uploadBox: {
    height: 200,
    borderWidth: 2,
    borderColor: "#5E936C",
    borderStyle: "dashed",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(94, 147, 108, 0.05)",
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#5E936C",
    marginTop: 12,
  },
  uploadHint: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  uploadedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  changeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginTop: 12,
  },
  changeImageText: {
    color: "#5E936C",
    fontSize: 15,
    fontWeight: "600",
  },
  submitButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 10,
  },
  submitText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  helpBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(147, 197, 253, 0.15)",
    borderRadius: 12,
    padding: 16,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
    lineHeight: 20,
  },
  // Status screen styles
  statusContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  statusIcon: {
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 12,
    textAlign: "center",
  },
  statusMessage: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  statusCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    gap: 16,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 15,
    color: "#666",
  },
  statusValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 24,
  },
  refreshText: {
    color: "#5E936C",
    fontSize: 16,
    fontWeight: "700",
  },
  backHomeButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  backHomeText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontWeight: "600",
  },
  tryAgainButton: {
    backgroundColor: "#5E936C",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
  },
  tryAgainText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});