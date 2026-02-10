// components/modals/GuestBlockModal/index.js
// CREATE THIS NEW FILE

import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

/**
 * Guest Block Modal - Shows when guest user has used their one-time free scan
 * This is PERMANENT - device cannot scan in guest mode ever again
 */
const GuestBlockModal = ({ visible, onClose, onSignUp }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={90} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={styles.container}>
          {/* Lock Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={48} color="#d32f2f" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>Free Scan Used</Text>

          {/* Message */}
          <Text style={styles.message}>
            This device has already used its <Text style={styles.highlight}>one-time free scan</Text>.
          </Text>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#5E936C" />
              <Text style={styles.infoText}>Unlimited scans</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#5E936C" />
              <Text style={styles.infoText}>Save to favorites</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#5E936C" />
              <Text style={styles.infoText}>Scan history</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={20} color="#5E936C" />
              <Text style={styles.infoText}>Offline access</Text>
            </View>
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity style={styles.signUpButton} onPress={onSignUp}>
            <Text style={styles.signUpButtonText}>Create Free Account</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.buttonIcon} />
          </TouchableOpacity>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Maybe Later</Text>
          </TouchableOpacity>

          {/* Permanent Notice */}
          <View style={styles.noticeContainer}>
            <Ionicons name="information-circle" size={16} color="#999" />
            <Text style={styles.noticeText}>
              This limit is permanent for this device
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width - 48,
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffcdd2',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a2e1b',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  highlight: {
    color: '#d32f2f',
    fontWeight: '600',
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
    fontWeight: '500',
  },
  signUpButton: {
    width: '100%',
    backgroundColor: '#5E936C',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#5E936C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    marginRight: 8,
  },
  buttonIcon: {
    marginLeft: 4,
  },
  closeButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#999',
    fontSize: 15,
    fontWeight: '500',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  noticeText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 6,
    fontStyle: 'italic',
  },
});

export default GuestBlockModal;