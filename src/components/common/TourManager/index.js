import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { TOUR_STEPS, ALL_FEATURES } from '@constants/tourSteps';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * TourManager Component
 * Displays an interactive guided tour overlay for first-time users
 * 
 * @param {boolean} visible - Controls tour visibility
 * @param {function} onComplete - Callback when tour is completed/skipped
 * @param {object} targetRefs - Object containing refs to UI elements to highlight
 */
export default function TourManager({ visible, onComplete, targetRefs }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightAllMode, setHighlightAllMode] = useState(false);
  const [targetLayout, setTargetLayout] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate in when visible
  useEffect(() => {
    if (visible) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Measure target element position when step changes
  useEffect(() => {
    if (!visible || highlightAllMode) return;

    const step = TOUR_STEPS[currentStep];
    const targetRef = targetRefs[step.targetKey];

    if (targetRef?.current) {
      // Small delay to ensure layout is ready
      setTimeout(() => {
        targetRef.current.measureInWindow((pageX, pageY, width, height) => {
          setTargetLayout({ x: pageX, y: pageY, width, height });
        });
      }, 150);
    }
  }, [currentStep, visible, highlightAllMode, targetRefs]);

  // Handlers
  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    if (onComplete) onComplete();
  };

  const handleFinish = () => {
    if (onComplete) onComplete();
  };

  const handleHighlightAll = () => {
    setHighlightAllMode(true);
  };

  const handleCloseHighlightAll = () => {
    setHighlightAllMode(false);
  };

  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  // Render Highlight All Mode
  if (highlightAllMode) {
    return (
      <Modal transparent visible={visible} animationType="none">
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
          {/* Semi-transparent overlay */}
          <View style={styles.overlay} />

          {/* Highlight all features */}
          {ALL_FEATURES.map((feature) => {
            const ref = targetRefs[feature.key];
            if (!ref?.current) return null;

            return (
              <HighlightFeature
                key={feature.key}
                targetRef={ref}
                label={feature.label}
              />
            );
          })}

          {/* Close button */}
          <View style={styles.highlightAllCloseContainer}>
            <TouchableOpacity
              style={styles.highlightAllCloseButton}
              onPress={handleCloseHighlightAll}
            >
              <Text style={styles.highlightAllCloseText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    );
  }

  // Render Normal Tour Mode
  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Semi-transparent overlay */}
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPress={() => {}} // Prevent dismissal on overlay tap
        />

        {/* Spotlight highlight */}
        {targetLayout && (
          <View
            style={[
              styles.spotlight,
              {
                left: targetLayout.x - (step.highlightPadding || 8),
                top: targetLayout.y - (step.highlightPadding || 8),
                width: targetLayout.width + (step.highlightPadding || 8) * 2,
                height: targetLayout.height + (step.highlightPadding || 8) * 2,
              },
            ]}
          />
        )}

        {/* Tooltip - Dynamic positioning */}
        {targetLayout && (
          <View
            style={[
              styles.tooltip,
              getTooltipPosition(targetLayout, step)
            ]}
          >
            <Text style={styles.tooltipTitle}>{step.title}</Text>
            <Text style={styles.tooltipDescription}>{step.description}</Text>

            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              {TOUR_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    index === currentStep && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.secondaryButton, styles.buttonFlex1]}
                onPress={handleSkip}
              >
                <Text style={styles.secondaryButtonText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, styles.buttonFlex1]}
                onPress={handleHighlightAll}
              >
                <Text style={styles.secondaryButtonText}>Highlight{'\n'}All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, styles.buttonFlex1]}
                onPress={isLastStep ? handleFinish : handleNext}
              >
                <Text style={styles.primaryButtonText}>
                  {isLastStep ? 'Finish' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

/**
 * Calculate tooltip position based on target location and screen space
 */
function getTooltipPosition(targetLayout, step) {
  const TOOLTIP_MARGIN = 16;
  const TOOLTIP_OFFSET = 16;
  
  // For header items (scan button), show tooltip below
  if (targetLayout.y < 200) {
    return {
      top: targetLayout.y + targetLayout.height + TOOLTIP_OFFSET,
      left: TOOLTIP_MARGIN,
      right: TOOLTIP_MARGIN,
    };
  }
  
  // For bottom tab bar items, always show tooltip above
  if (targetLayout.y > SCREEN_HEIGHT - 200) {
    return {
      bottom: SCREEN_HEIGHT - targetLayout.y + TOOLTIP_OFFSET,
      left: TOOLTIP_MARGIN,
      right: TOOLTIP_MARGIN,
    };
  }
  
  // Default: center of screen
  return {
    top: SCREEN_HEIGHT / 2 - 150,
    left: TOOLTIP_MARGIN,
    right: TOOLTIP_MARGIN,
  };
}

/**
 * HighlightFeature Component
 * Highlights a single feature with label in "Highlight All" mode
 */
function HighlightFeature({ targetRef, label }) {
  const [layout, setLayout] = useState(null);

  useEffect(() => {
    if (targetRef?.current) {
      setTimeout(() => {
        targetRef.current.measureInWindow((pageX, pageY, width, height) => {
          setLayout({ x: pageX, y: pageY, width, height });
        });
      }, 150);
    }
  }, [targetRef]);

  if (!layout) return null;

  return (
    <>
      <View
        style={[
          styles.highlightBox,
          {
            left: layout.x - 8,
            top: layout.y - 8,
            width: layout.width + 16,
            height: layout.height + 16,
          },
        ]}
      />
      <View
        style={[
          styles.featureLabel,
          {
            left: Math.max(10, Math.min(SCREEN_WIDTH - 90, layout.x + layout.width / 2 - 40)),
            top: layout.y - 40,
          },
        ]}
      >
        <Text style={styles.featureLabelText}>{label}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  spotlight: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#5E936C',
    backgroundColor: 'rgba(94, 147, 108, 0.15)',
    shadowColor: '#5E936C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 15,
  },
  tooltip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  tooltipTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  tooltipDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
  },
  progressDotActive: {
    width: 24,
    backgroundColor: '#5E936C',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
  },
  buttonFlex1: {
    flex: 1,
    minWidth: 0, // Allow flex shrinking
  },
  primaryButton: {
    backgroundColor: '#5E936C',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5E936C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  // Highlight All Mode Styles
  highlightBox: {
    position: 'absolute',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#5E936C',
    backgroundColor: 'transparent',
    shadowColor: '#5E936C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 15,
  },
  featureLabel: {
    position: 'absolute',
    backgroundColor: '#5E936C',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  featureLabelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  highlightAllCloseContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  highlightAllCloseButton: {
    backgroundColor: '#5E936C',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    minWidth: 180,
    alignItems: 'center',
    bottom: 100,
  },
  highlightAllCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    bottom: 1,
  },
});