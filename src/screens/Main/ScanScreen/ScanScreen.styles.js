import { StyleSheet } from 'react-native';

/**
 * Styles for ScanScreen component
 * Organized by UI sections for better maintainability
 */

export default StyleSheet.create({
  // ===========================
  // CONTAINER & CAMERA
  // ===========================
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },

  camera: {
    flex: 1,
    width: '100%',
  },

  // ===========================
  // NAVIGATION & CONTROLS
  // ===========================
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 25,
    zIndex: 10,
  },

  rightControls: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },

  controlButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 10,
    borderRadius: 25,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  controlButtonSpacing: {
    marginTop: 10,
  },

  // ===========================
  // ZOOM CONTROLS
  // ===========================
  zoomContainer: {
    position: 'absolute',
    left: 20,
    bottom: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 40,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },

  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  zoomDisplay: {
    width: 40,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },

  zoomText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // ===========================
  // SCAN FRAME & TEXT
  // ===========================
  scanFrame: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    right: '15%',
    height: '30%',
    zIndex: 1,
  },

  corner: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderColor: '#fff',
    borderWidth: 4,
  },

  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
  },

  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 10,
  },

  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
  },

  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 10,
  },

  scanText: {
    position: 'absolute',
    top: '64%',
    alignSelf: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    zIndex: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // ===========================
  // PROCESSING OVERLAY
  // ===========================
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },

  processingCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },

  processingText: {
    color: '#1a2e1b',
    fontSize: 20,
    marginTop: 15,
    fontWeight: '700',
  },

  processingSubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
    fontWeight: '500',
    textAlign: 'center',
  },

  processingHint: {
    color: '#5E936C',
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // ===========================
  // BOTTOM BUTTONS
  // ===========================
  buttonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },

  button: {
    height: 70,
    width: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  galleryButton: {
    height: 50,
    width: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(94, 147, 108, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  placeholderButton: {
    height: 50,
    width: 50,
    marginLeft: 30,
  },

  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },

  // ===========================
  // LOADING STATE
  // ===========================
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },

  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },

  // ===========================
  // PERMISSION STATE
  // ===========================
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 20,
  },

  permissionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },

  permissionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  permissionButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },

  orText: {
    color: '#888',
    fontSize: 14,
    marginVertical: 20,
  },

  galleryPermissionButton: {
    backgroundColor: '#5E936C',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  galleryPermissionIcon: {
    marginRight: 8,
  },
});