import { useState, useCallback } from 'react';
import {
  DEFAULT_ZOOM,
  MAX_ZOOM,
  MIN_ZOOM,
  ZOOM_INCREMENT,
  PINCH_ZOOM_SENSITIVITY,
  FLASH_MODES,
  AUTOFOCUS_MODES
} from '@screens/Main/ScanScreen/utils/constants';

/**
 * Custom hook for managing camera controls
 * Handles flash, zoom, autofocus, and camera ready state
 * 
 * @returns {Object} - Camera control state and functions
 */
const useCameraControls = () => {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [flashMode, setFlashMode] = useState(FLASH_MODES.OFF);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [autofocus, setAutofocus] = useState(AUTOFOCUS_MODES.ON);

  /**
   * Handle camera ready event
   */
  const onCameraReady = useCallback(() => {
    setIsCameraReady(true);
    console.log('📷 Camera ready');
  }, []);

  /**
   * Toggle flash mode: off -> on -> auto -> off
   */
  const toggleFlash = useCallback(() => {
    setFlashMode(prevMode => {
      if (prevMode === FLASH_MODES.OFF) return FLASH_MODES.ON;
      if (prevMode === FLASH_MODES.ON) return FLASH_MODES.AUTO;
      return FLASH_MODES.OFF;
    });
  }, []);

  /**
   * Toggle autofocus: on <-> off
   */
  const toggleAutofocus = useCallback(() => {
    setAutofocus(prevMode => 
      prevMode === AUTOFOCUS_MODES.ON 
        ? AUTOFOCUS_MODES.OFF 
        : AUTOFOCUS_MODES.ON
    );
  }, []);

  /**
   * Increase zoom level
   */
  const handleZoomIn = useCallback(() => {
    setZoom(prevZoom => Math.min(prevZoom + ZOOM_INCREMENT, MAX_ZOOM));
  }, []);

  /**
   * Decrease zoom level
   */
  const handleZoomOut = useCallback(() => {
    setZoom(prevZoom => Math.max(prevZoom - ZOOM_INCREMENT, MIN_ZOOM));
  }, []);

  /**
   * Set zoom to specific value
   * @param {number} newZoom - Zoom value (0-1)
   */
  const setZoomValue = useCallback((newZoom) => {
    if (typeof newZoom !== 'number') return;
    setZoom(Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM)));
  }, []);

  /**
   * Handle pinch gesture for zoom
   * @param {Object} event - Pinch gesture event
   */
  const handlePinchGesture = useCallback((event) => {
    const scale = event.nativeEvent.scale;
    
    if (scale > 1) {
      // Pinch out - zoom in
      setZoom(prevZoom => Math.min(prevZoom + PINCH_ZOOM_SENSITIVITY, MAX_ZOOM));
    } else if (scale < 1) {
      // Pinch in - zoom out
      setZoom(prevZoom => Math.max(prevZoom - PINCH_ZOOM_SENSITIVITY, MIN_ZOOM));
    }
  }, []);

  /**
   * Get appropriate icon name for current flash mode
   * @returns {string} - Ionicons name
   */
  const getFlashIcon = useCallback(() => {
    if (flashMode === FLASH_MODES.OFF) return 'flash-off';
    if (flashMode === FLASH_MODES.ON) return 'flash';
    return 'flash-outline'; // auto
  }, [flashMode]);

  /**
   * Get appropriate icon name for current autofocus mode
   * @returns {string} - Ionicons name
   */
  const getAutofocusIcon = useCallback(() => {
    return autofocus === AUTOFOCUS_MODES.ON ? 'scan' : 'scan-outline';
  }, [autofocus]);

  /**
   * Reset all camera controls to default
   */
  const resetControls = useCallback(() => {
    setFlashMode(FLASH_MODES.OFF);
    setZoom(DEFAULT_ZOOM);
    setAutofocus(AUTOFOCUS_MODES.ON);
    console.log('🔄 Camera controls reset');
  }, []);

  /**
   * Get zoom percentage for display
   * @returns {number} - Zoom percentage (0-100)
   */
  const getZoomPercentage = useCallback(() => {
    return Math.round(zoom * 100);
  }, [zoom]);

  /**
   * Check if zoom is at maximum
   * @returns {boolean}
   */
  const isMaxZoom = useCallback(() => {
    return zoom >= MAX_ZOOM;
  }, [zoom]);

  /**
   * Check if zoom is at minimum
   * @returns {boolean}
   */
  const isMinZoom = useCallback(() => {
    return zoom <= MIN_ZOOM;
  }, [zoom]);

  return {
    // State
    isCameraReady,
    flashMode,
    zoom,
    autofocus,
    
    // Setters
    setIsCameraReady,
    setFlashMode,
    setZoom: setZoomValue,
    setAutofocus,
    
    // Actions
    onCameraReady,
    toggleFlash,
    toggleAutofocus,
    handleZoomIn,
    handleZoomOut,
    handlePinchGesture,
    resetControls,
    
    // Getters
    getFlashIcon,
    getAutofocusIcon,
    getZoomPercentage,
    isMaxZoom,
    isMinZoom,
  };
};

export default useCameraControls;