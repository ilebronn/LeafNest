import React, { useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, PinchGestureHandler } from 'react-native-gesture-handler';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy'; // Use legacy API
import { auth } from '@config/firebase';
import { isGuestUser } from '@utils/guest';

// Components
import { PremiumGate } from '@components/modals';

// Hooks
import useCameraControls from '@hooks/useCameraControls';
import useScanLimits from '@hooks/useScanLimits';
import useImageProcessing from '@hooks/useImageProcessing';

// Styles
import styles from './ScanScreen.styles';

/**
 * ScanScreen Component
 * Main screen for scanning and identifying plant/animal species
 * 
 * Features:
 * - Camera capture with zoom, flash, and autofocus controls
 * - Gallery image selection
 * - Species identification using Vision API, PlantNet, and iNaturalist
 * - Caching for faster results
 * - Usage limits and premium gate for subscriptions
 */
export default function ScanScreen({ navigation }) {
  const cameraRef = useRef(null);

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();

  // Custom hooks
  const {
    isCameraReady,
    flashMode,
    zoom,
    autofocus,
    onCameraReady,
    toggleFlash,
    toggleAutofocus,
    handleZoomIn,
    handleZoomOut,
    handlePinchGesture,
    getFlashIcon,
    getZoomPercentage,
  } = useCameraControls();

  const {
    showPremiumGate,
    usageLimits,
    checkScanLimit,
    decrementScanCountPostScan,
    handleGuestPostScan,
    closePremiumGate,
    handleUpgrade,
  } = useScanLimits();

  const {
    isProcessing,
    processingStage,
    initializeCache,
    handleCameraCapture,
    handleGalleryImage,
  } = useImageProcessing();

  // Initialize cache on mount
  useEffect(() => {
    initializeCache();
  }, [initializeCache]);

  /**
   * Wrapper for post-scan operations
   * Handles both guest and authenticated users
   */
  const handlePostScanSuccess = useCallback(async (navigation) => {
    const user = auth.currentUser;
    
    // Handle guest users
    if (isGuestUser(user)) {
      await handleGuestPostScan(navigation);
    } 
    // Handle authenticated users
    else if (user && decrementScanCountPostScan) {
      await decrementScanCountPostScan();
    }
  }, [handleGuestPostScan, decrementScanCountPostScan]);

  /**
   * Handle camera capture button press
   */
  const onCapturePress = async () => {
    if (!isCameraReady || !cameraRef.current || isProcessing) {
      return;
    }

    // Check scan limits
    const canScan = await checkScanLimit();
    if (!canScan) {
      return;
    }

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
        skipProcessing: false,
        exif: true,
      });

      await handleCameraCapture(
        photo,
        navigation,
        (nav) => handleGuestPostScan(nav)
      );
    } catch (error) {
      console.error('❌ Error capturing photo:', error);
      Alert.alert('Error', 'There was an issue capturing the photo.');
    }
  };

  /**
   * Handle gallery image picker
   */
  const onGalleryPress = async () => {
    if (isProcessing) {
      return;
    }

    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to select images.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (result.canceled) {
        return;
      }

      const selectedImage = result.assets[0];

      // Get base64 if not provided
      if (!selectedImage.base64) {
        const base64 = await FileSystem.readAsStringAsync(selectedImage.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        selectedImage.base64 = base64;
      }

      // Check scan limits
      const canScan = await checkScanLimit();
      if (!canScan) {
        return;
      }

      await handleGalleryImage(
        selectedImage,
        navigation,
        (nav) => handleGuestPostScan(nav)
      );
    } catch (error) {
      console.error('❌ Error picking image from gallery:', error);
      Alert.alert('Error', 'Failed to load image from gallery. Please try again.');
    }
  };

  /**
   * Handle back button press
   */
  const onBackPress = () => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  // ===========================
  // RENDER: LOADING STATE
  // ===========================
  if (!permission) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading camera...</Text>
        </View>
      </View>
    );
  }

  // ===========================
  // RENDER: PERMISSION DENIED
  // ===========================
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            We need your permission to show the camera
          </Text>

          <TouchableOpacity onPress={requestPermission} style={styles.permissionButton}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>— or —</Text>

          <TouchableOpacity onPress={onGalleryPress} style={styles.galleryPermissionButton}>
            <Ionicons
              name="images"
              size={20}
              color="#fff"
              style={styles.galleryPermissionIcon}
            />
            <Text style={styles.permissionButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ===========================
  // RENDER: MAIN CAMERA UI
  // ===========================
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PinchGestureHandler onGestureEvent={handlePinchGesture}>
        <View style={styles.container}>
          {/* Camera View */}
          <CameraView
            style={styles.camera}
            facing="back"
            ref={cameraRef}
            onCameraReady={onCameraReady}
            enableTorch={flashMode === 'on'}
            zoom={zoom}
            autofocus={autofocus}
          />

          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>

          {/* Right Controls (Flash & Autofocus) */}
          <View style={styles.rightControls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
              <Ionicons name={getFlashIcon()} size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlButton, styles.controlButtonSpacing]}
              onPress={toggleAutofocus}
            >
              <Ionicons
                name={autofocus === 'on' ? 'scan' : 'scan-outline'}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          {/* Zoom Controls */}
          <View style={styles.zoomContainer}>
            <TouchableOpacity style={styles.zoomButton} onPress={handleZoomOut}>
              <Ionicons name="remove" size={20} color="#fff" />
            </TouchableOpacity>

            <View style={styles.zoomDisplay}>
              <Text style={styles.zoomText}>{getZoomPercentage()}%</Text>
            </View>

            <TouchableOpacity style={styles.zoomButton} onPress={handleZoomIn}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Scan Frame */}
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <Text style={styles.scanText}>Scan Species</Text>

          {/* Processing Overlay */}
          {isProcessing && (
            <View style={styles.processingOverlay}>
              <View style={styles.processingCard}>
                <ActivityIndicator size="large" color="#5E936C" />
                <Text style={styles.processingText}>Analyzing...</Text>
                <Text style={styles.processingSubtext}>{processingStage}</Text>
                {processingStage.includes('database') && (
                  <Text style={styles.processingHint}>Using optimized search...</Text>
                )}
              </View>
            </View>
          )}

          {/* Premium Gate Modal */}
          <PremiumGate
            visible={showPremiumGate}
            onClose={closePremiumGate}
            onUpgrade={() => handleUpgrade(navigation)}
            limitType="scan"
            hoursUntilReset={usageLimits?.hoursUntilReset || 0}
            scansRemaining={usageLimits?.scansRemaining || 0}
            downloadsRemaining={usageLimits?.downloadsRemaining || 0}
          />

          {/* Bottom Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Gallery Button */}
            <TouchableOpacity
              style={[styles.galleryButton, isProcessing && styles.buttonDisabled]}
              onPress={onGalleryPress}
              disabled={isProcessing}
            >
              <Ionicons name="images" size={26} color="#fff" />
            </TouchableOpacity>

            {/* Capture Button */}
            <TouchableOpacity
              style={[
                styles.button,
                (!isCameraReady || isProcessing) && styles.buttonDisabled,
              ]}
              onPress={onCapturePress}
              disabled={!isCameraReady || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size={32} color="#666" />
              ) : (
                <Ionicons
                  name="camera"
                  size={32}
                  color={isCameraReady ? '#000' : '#666'}
                />
              )}
            </TouchableOpacity>

            {/* Placeholder for symmetry */}
            <View style={styles.placeholderButton} />
          </View>
        </View>
      </PinchGestureHandler>
    </GestureHandlerRootView>
  );
}