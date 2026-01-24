// components/modals/PremiumGate/index.js - UPGRADE PROMPT MODAL WITH OFFLINE SUPPORT
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function PremiumGate({
  visible,
  onClose,
  onUpgrade,
  limitType, // 'scan' or 'download' or 'offline_history' or 'offline_favorites'
  hoursUntilReset = 0,
  scansRemaining = 0,
  downloadsRemaining = 0,
  title = null, // ✅ NEW: Custom title
  message = null, // ✅ NEW: Custom message
  feature = null, // ✅ NEW: Feature type for customization
}) {
  const getMessage = () => {
    // ✅ Handle custom title/message (for offline access)
    if (title && message) {
      return {
        title: title,
        subtitle: '',
        description: message,
        icon: 'cloud-offline-outline',
      };
    }

    // ✅ Offline-specific messages
    if (limitType === 'offline_history' || feature === 'offline_history') {
      return {
        title: '🔒 Offline Access Required',
        subtitle: 'Subscribe to access History offline',
        description: 'Offline access to your scan history is a premium feature. Upgrade to view your history anytime, anywhere.',
        icon: 'cloud-offline-outline',
      };
    }

    if (limitType === 'offline_favorites' || feature === 'offline_favorites') {
      return {
        title: '🔒 Offline Access Required',
        subtitle: 'Subscribe to access Favorites offline',
        description: 'Offline access to your favorites is a premium feature. Upgrade to view your favorites anytime, anywhere.',
        icon: 'cloud-offline-outline',
      };
    }

    // Existing messages for scan/download limits
    if (limitType === 'scan') {
      return {
        title: '🔒 Scan Limit Reached',
        subtitle: `You've used all 5 scans`,
        description: `Upgrade to Premium for unlimited scans and more features!`,
        icon: 'scan',
      };
    } else {
      return {
        title: '🔒 Download Limit Reached',
        subtitle: `You've used all 5 downloads`,
        description: `Upgrade to Premium for unlimited downloads!`,
        icon: 'download',
      };
    }
  };

  const messageData = getMessage();
  const isOfflineFeature = feature === 'offline_history' || feature === 'offline_favorites' || 
                         limitType === 'offline_history' || limitType === 'offline_favorites';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={styles.container}>
          <View style={styles.handle} />

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={isOfflineFeature ? ['#059669', '#047857'] : ['#FF6B6B', '#EE5A52']}
                style={styles.iconGradient}
              >
                <Ionicons name={messageData.icon} size={48} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>{messageData.title}</Text>
            {messageData.subtitle ? (
              <Text style={styles.subtitle}>{messageData.subtitle}</Text>
            ) : null}

            {/* ✅ Only show reset timer for scan/download limits, not offline */}
            {!isOfflineFeature && hoursUntilReset > 0 && (
              <View style={styles.timerCard}>
                <Ionicons name="time-outline" size={20} color="#5E936C" />
                <Text style={styles.timerText}>
                  Resets in {hoursUntilReset} hours
                </Text>
              </View>
            )}

            {/* ✅ Only show usage for scan/download limits, not offline */}
            {!isOfflineFeature && (
              <View style={styles.usageCard}>
                <View style={styles.usageRow}>
                  <Ionicons name="scan-outline" size={20} color="#666" />
                  <Text style={styles.usageLabel}>Scans:</Text>
                  <Text style={styles.usageValue}>{scansRemaining}/5</Text>
                </View>
                <View style={styles.usageRow}>
                  <Ionicons name="download-outline" size={20} color="#666" />
                  <Text style={styles.usageLabel}>Downloads:</Text>
                  <Text style={styles.usageValue}>{downloadsRemaining}/5</Text>
                </View>
              </View>
            )}

            {/* Description */}
            <Text style={styles.description}>{messageData.description}</Text>

            {/* Premium Features */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Premium Benefits:</Text>
              
              {isOfflineFeature && (
                <>
                  <View style={styles.feature}>
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                    <Text style={styles.featureText}>Offline History access</Text>
                  </View>

                  <View style={styles.feature}>
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                    <Text style={styles.featureText}>Offline Favorites access</Text>
                  </View>
                </>
              )}

              <View style={styles.feature}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
                <Text style={styles.featureText}>Unlimited scans</Text>
              </View>

              <View style={styles.feature}>
                <View style={styles.checkCircle}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                </View>
                <Text style={styles.featureText}>Unlimited downloads</Text>
              </View>

              {!isOfflineFeature && (
                <>
                  <View style={styles.feature}>
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                    <Text style={styles.featureText}>Offline favorites access</Text>
                  </View>

                  <View style={styles.feature}>
                    <View style={styles.checkCircle}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                    <Text style={styles.featureText}>Offline history access</Text>
                  </View>
                </>
              )}

              <View style={styles.feature}>
              </View>
            </View>

            {/* Pricing */}
            <View style={styles.pricingCard}>
              <Text style={styles.pricingAmount}>₱99</Text>
              <Text style={styles.pricingPeriod}>for 30 days</Text>
            </View>

            {/* Upgrade Button */}
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={onUpgrade}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#5E936C', '#3E704C']}
                style={styles.upgradeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="rocket" size={24} color="#fff" />
                <Text style={styles.upgradeText}>Upgrade to Premium</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Maybe Later Button */}
            <TouchableOpacity
              style={styles.laterButton}
              onPress={onClose}
            >
              <Text style={styles.laterText}>Maybe Later</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  timerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  timerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5E936C',
  },
  usageCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  usageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  usageLabel: {
    fontSize: 15,
    color: '#6B7280',
    flex: 1,
    marginLeft: 5,
  },
  usageValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  featuresContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#5E936C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  pricingCard: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 30,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#5E936C',
  },
  pricingAmount: {
    fontSize: 48,
    fontWeight: '800',
    color: '#5E936C',
    lineHeight: 56,
  },
  pricingPeriod: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  upgradeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#5E936C',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    marginBottom: 16,
  },
  upgradeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  upgradeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  laterButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  laterText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});