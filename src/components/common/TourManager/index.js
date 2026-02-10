import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { TOUR_STEPS, ALL_FEATURES } from '@constants/tourSteps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const [tooltipHeight, setTooltipHeight] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isSmallWidth = windowWidth < 360;
  const isCompactHeight = windowHeight < 700;
  const isCompactScreen = isSmallWidth || isCompactHeight;
  const tooltipMaxWidth = Math.min(420, windowWidth - 24);
  const tooltipSidePadding = Math.max(12, Math.floor((windowWidth - tooltipMaxWidth) / 2));
  const tooltipPadding = isCompactScreen ? 16 : 20;
  const tooltipMaxHeight = Math.max(200, windowHeight - insets.top - insets.bottom - 24);

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
  }, [currentStep, visible, highlightAllMode, targetRefs, windowWidth, windowHeight, insets.top, insets.bottom]);

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
  const highlightPadding = step.highlightPadding ?? 8;

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
          <View
            style={[
              styles.highlightAllCloseContainer,
              {
                bottom: Math.max(20, insets.bottom + 12),
                left: Math.max(16, tooltipSidePadding),
                right: Math.max(16, tooltipSidePadding),
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.highlightAllCloseButton,
                { maxWidth: Math.min(windowWidth - 32, 320) },
              ]}
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
                left: targetLayout.x - highlightPadding,
                top: targetLayout.y - highlightPadding,
                width: targetLayout.width + highlightPadding * 2,
                height: targetLayout.height + highlightPadding * 2,
              },
            ]}
          />
        )}

        {/* Tooltip - Dynamic positioning */}
        {targetLayout && (
          <View
            style={[
              styles.tooltip,
              getTooltipPosition(targetLayout, step, {
                windowHeight,
                windowWidth,
                insets,
                sidePadding: tooltipSidePadding,
                tooltipHeight,
                isCompact: isCompactScreen,
              }),
              {
                maxWidth: tooltipMaxWidth,
                maxHeight: tooltipMaxHeight,
                padding: tooltipPadding,
              },
            ]}
            onLayout={(event) => {
              const { height } = event.nativeEvent.layout;
              if (height !== tooltipHeight) {
                setTooltipHeight(height);
              }
            }}
          >
            <Text style={[styles.tooltipTitle, isCompactScreen && styles.tooltipTitleSmall]}>
              {step.title}
            </Text>
            <Text
              style={[
                styles.tooltipDescription,
                isCompactScreen && styles.tooltipDescriptionSmall,
              ]}
            >
              {step.description}
            </Text>

            {/* Progress indicator */}
            <View style={[styles.progressContainer, isCompactScreen && styles.progressContainerSmall]}>
              {TOUR_STEPS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressDot,
                    isCompactScreen && styles.progressDotSmall,
                    index === currentStep && styles.progressDotActive,
                    isCompactScreen && index === currentStep && styles.progressDotActiveSmall,
                  ]}
                />
              ))}
            </View>

            {/* Buttons */}
            <View style={[styles.buttonContainer, isSmallWidth && styles.buttonContainerStacked]}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  styles.buttonFlex1,
                  isCompactScreen && styles.buttonCompact,
                  isSmallWidth && styles.buttonFullWidth,
                ]}
                onPress={handleSkip}
              >
                <Text style={[styles.secondaryButtonText, isCompactScreen && styles.secondaryButtonTextCompact]}>
                  Skip
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  styles.buttonFlex1,
                  isCompactScreen && styles.buttonCompact,
                  isSmallWidth && styles.buttonFullWidth,
                ]}
                onPress={handleHighlightAll}
              >
                <Text style={[styles.secondaryButtonText, isCompactScreen && styles.secondaryButtonTextCompact]}>
                  Highlight{'\n'}All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  styles.buttonFlex1,
                  isCompactScreen && styles.buttonCompact,
                  isSmallWidth && styles.buttonFullWidth,
                ]}
                onPress={isLastStep ? handleFinish : handleNext}
              >
                <Text style={[styles.primaryButtonText, isCompactScreen && styles.primaryButtonTextCompact]}>
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
function getTooltipPosition(targetLayout, step, metrics) {
  const { windowHeight, insets, sidePadding, tooltipHeight, isCompact } = metrics;
  const TOOLTIP_MARGIN = sidePadding;
  const TOOLTIP_OFFSET = 16;
  const EDGE_PADDING = 8;
  const estimatedHeight = tooltipHeight || (isCompact ? 240 : 280);
  const safeTop = insets.top + EDGE_PADDING;
  const safeBottom = windowHeight - insets.bottom - EDGE_PADDING;
  const spaceAbove = targetLayout.y - insets.top;
  const spaceBelow = windowHeight - insets.bottom - (targetLayout.y + targetLayout.height);
  const preferBelow = step?.position === 'bottom';
  const canBelow = spaceBelow >= estimatedHeight + TOOLTIP_OFFSET;
  const canAbove = spaceAbove >= estimatedHeight + TOOLTIP_OFFSET;

  let top;

  if (preferBelow) {
    if (canBelow) {
      top = targetLayout.y + targetLayout.height + TOOLTIP_OFFSET;
    } else if (canAbove) {
      top = targetLayout.y - estimatedHeight - TOOLTIP_OFFSET;
    }
  } else {
    if (canAbove) {
      top = targetLayout.y - estimatedHeight - TOOLTIP_OFFSET;
    } else if (canBelow) {
      top = targetLayout.y + targetLayout.height + TOOLTIP_OFFSET;
    }
  }

  if (top === undefined) {
    top =
      spaceBelow >= spaceAbove
        ? targetLayout.y + targetLayout.height + TOOLTIP_OFFSET
        : targetLayout.y - estimatedHeight - TOOLTIP_OFFSET;
  }

  const maxTop = Math.max(safeTop, safeBottom - estimatedHeight);
  top = Math.max(safeTop, Math.min(top, maxTop));

  return {
    top,
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (targetRef?.current) {
      setTimeout(() => {
        targetRef.current.measureInWindow((pageX, pageY, width, height) => {
          setLayout({ x: pageX, y: pageY, width, height });
        });
      }, 150);
    }
  }, [targetRef, windowWidth, windowHeight]);

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
            left: Math.max(10, Math.min(windowWidth - 90, layout.x + layout.width / 2 - 40)),
            top: Math.max(
              insets.top + 8,
              Math.min(windowHeight - insets.bottom - 28, layout.y - 40)
            ),
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
  tooltipTitleSmall: {
    fontSize: 18,
  },
  tooltipDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 16,
    textAlign: 'center',
  },
  tooltipDescriptionSmall: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 6,
  },
  progressContainerSmall: {
    marginBottom: 12,
    gap: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
  },
  progressDotSmall: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  progressDotActive: {
    width: 24,
    backgroundColor: '#5E936C',
  },
  progressDotActiveSmall: {
    width: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    gap: 8,
  },
  buttonContainerStacked: {
    flexDirection: 'column',
  },
  buttonFlex1: {
    flex: 1,
    minWidth: 0, // Allow flex shrinking
  },
  buttonFullWidth: {
    width: '100%',
  },
  buttonCompact: {
    paddingVertical: 10,
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
  primaryButtonTextCompact: {
    fontSize: 14,
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
  secondaryButtonTextCompact: {
    fontSize: 12,
    lineHeight: 14,
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
    bottom: 20,
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
  },
  highlightAllCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
