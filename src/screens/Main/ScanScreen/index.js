import React, { useRef, useEffect, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, PinchGestureHandler } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { auth } from '@config/firebase';
import { isGuestUser, hasGuestReachedLimit } from '@utils/guest';

// Components
import { PremiumGate } from '@components/modals';
import GuestBlockModal from '@components/modals/GuestBlockModal'; // ✅ NEW

// Hooks
import useCameraControls from '@hooks/useCameraControls';
import useScanLimits from '@hooks/useScanLimits';
import useImageProcessing from '@hooks/useImageProcessing';

// Styles
import styles from './ScanScreen.styles';

/**
 * ScanScreen Component
 * Main screen for scanning and identifying plant/animal species
 */
export default function ScanScreen({ navigation }) {
  const cameraRef = useRef(null);
  const [isGuestBlocked, setIsGuestBlocked] = useState(false);

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
    // ✅ SEPARATE STATES
    showGuestBlockModal,
    showPremiumGate,
    usageLimits,
    checkScanLimit,
    decrementScanCountPostScan,
    handleGuestPostScan,
    // ✅ SEPARATE CLOSE FUNCTIONS
    closeGuestBlockModal,
    closePremiumGate,
    // ✅ SEPARATE HANDLERS
    handleUpgrade,
    handleGuestSignUp,
    // Setters
    setShowGuestBlockModal,
  } = useScanLimits();

  const {
    isProcessing,
    processingStage,
    initializeCache,
    handleCameraCapture,
    handleGalleryImage,
    setDecrementScanCount,
  } = useImageProcessing();

  useEffect(() => {
    if (decrementScanCountPostScan) {
      setDecrementScanCount(decrementScanCountPostScan);
    }
  }, [decrementScanCountPostScan, setDecrementScanCount]);

  useEffect(() => {
    initializeCache();
  }, [initializeCache]);

  /**
   * ✅ Check guest limit EVERY TIME screen is focused
   */
  useFocusEffect(
    useCallback(() => {
      const checkGuestStatus = async () => {
        const user = auth.currentUser;
        
        if (isGuestUser(user)) {
          const isBlocked = await hasGuestReachedLimit();
          
          if (isBlocked) {
            console.log('🚫 Guest user is PERMANENTLY BLOCKED');
            setIsGuestBlocked(true);
            setShowGuestBlockModal(true); // ✅ Show guest modal
          } else {
            setIsGuestBlocked(false);
          }
        } else {
          setIsGuestBlocked(false);
        }
      };

      checkGuestStatus();
    }, [setShowGuestBlockModal])
  );

  /**
   * Handle camera capture
   */
  const onCapturePress = async () => {
    if (!isCameraReady || !cameraRef.current || isProcessing) {
      return;
    }

    // ✅ Double-check guest block
    const user = auth.currentUser;
    if (isGuestUser(user)) {
      const isBlocked = await hasGuestReachedLimit();
      if (isBlocked) {
        console.log('🚫 Scan blocked - guest already used free scan');
        setShowGuestBlockModal(true);
        return;
      }
    }

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
   * Handle gallery picker
   */
  const onGalleryPress = async () => {
    if (isProcessing) {
      return;
    }

    // ✅ Double-check guest block
    const user = auth.currentUser;
    if (isGuestUser(user)) {
      const isBlocked = await hasGuestReachedLimit();
      if (isBlocked) {
        console.log('🚫 Gallery blocked - guest already used free scan');
        setShowGuestBlockModal(true);
        return;
      }
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to select images.',
          [{ text: 'OK' }]
        );
        return;
      }

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

      if (!selectedImage.base64) {
        const base64 = await FileSystem.readAsStringAsync(selectedImage.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        selectedImage.base64 = base64;
      }

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

  const onBackPress = () => {
    navigation.navigate('MainTabs', { screen: 'Home' });
  };

  // ===========================
  // RENDER: LOADING
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
          <CameraView
            style={styles.camera}
            facing="back"
            ref={cameraRef}
            onCameraReady={onCameraReady}
            enableTorch={flashMode === 'on'}
            zoom={zoom}
            autofocus={autofocus}
          />

          <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>

          <View style={styles.rightControls}>
            <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
              <Ionicons name={getFlashIcon()} size={24} color="#fff" />
            </TouchableOpacity>
          </View>

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
              </View>
            </View>
          )}

          {/* ✅ GUEST BLOCK MODAL - For guest users only */}
          <GuestBlockModal
            visible={showGuestBlockModal}
            onClose={closeGuestBlockModal}
            onSignUp={() => handleGuestSignUp(navigation)}
          />

          {/* ✅ PREMIUM GATE - For normal users who ran out of scans */}
          <PremiumGate
            visible={showPremiumGate}
            onClose={closePremiumGate}
            onUpgrade={() => handleUpgrade(navigation)}
            limitType="scan"
            hoursUntilReset={usageLimits?.hoursUntilReset || 0}
            scansRemaining={usageLimits?.scansRemaining || 0}
            downloadsRemaining={usageLimits?.downloadsRemaining || 0}
          />

          {/* Bottom Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.galleryButton,
                (isProcessing || isGuestBlocked) && styles.buttonDisabled
              ]}
              onPress={onGalleryPress}
              disabled={isProcessing || isGuestBlocked}
            >
              <Ionicons name="images" size={26} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                (!isCameraReady || isProcessing || isGuestBlocked) && styles.buttonDisabled,
              ]}
              onPress={onCapturePress}
              disabled={!isCameraReady || isProcessing || isGuestBlocked}
            >
              {isProcessing ? (
                <ActivityIndicator size={32} color="#666" />
              ) : (
                <Ionicons
                  name="camera"
                  size={32}
                  color={isCameraReady && !isGuestBlocked ? '#000' : '#666'}
                />
              )}
            </TouchableOpacity>

            <View style={styles.placeholderButton} />
          </View>
        </View>
      </PinchGestureHandler>
    </GestureHandlerRootView>
  );
}