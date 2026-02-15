import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TOUR_STEPS } from '@constants/tourSteps';

const STEP_ICON_MAP = {
  'home-tab': { name: 'home-outline', label: 'Home' },
  'scan-button': { name: 'scan-outline', label: 'Scan' },
  'notification-button': { name: 'notifications-outline', label: 'Notifications' },
  'favorites-tab': { name: 'heart-outline', label: 'Favorites' },
  'history-tab': { name: 'time-outline', label: 'History' },
  'profile-tab': { name: 'person-circle-outline', label: 'Profile' },
};

function getStepIcon(step) {
  return STEP_ICON_MAP[step?.targetKey] || { name: 'leaf-outline', label: 'Feature' };
}

/**
 * TourManager Component
 * Stable responsive tour: fixed bottom sheet only, no target overlays.
 */
export default function TourManager({ visible, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isNarrowScreen = windowWidth < 360;
  const isCompactHeight = windowHeight < 700;
  const isCompactScreen = isNarrowScreen || isCompactHeight;

  const sheetWidth = Math.min(windowWidth - 24, 480);
  const sheetLeft = (windowWidth - sheetWidth) / 2;
  const sheetBottom = Math.max(insets.bottom + 12, 16);
  const sheetPadding = isCompactScreen ? 16 : 20;

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, fadeAnim]);

  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const iconHint = getStepIcon(step);

  const handleSkip = () => {
    if (onComplete) onComplete();
  };

  const handleNext = () => {
    if (isLastStep) {
      if (onComplete) onComplete();
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {}}
        />

        <View
          style={[
            styles.sheet,
            {
              width: sheetWidth,
              left: sheetLeft,
              bottom: sheetBottom,
              padding: sheetPadding,
            },
          ]}
        >
          <View style={styles.iconHintRow}>
            <View style={styles.iconHintBubble}>
              <Ionicons name={iconHint.name} size={20} color="#2D5A3F" />
            </View>
            <Text style={styles.iconHintText}>{iconHint.label}</Text>
          </View>

          <Text style={[styles.title, isCompactScreen && styles.titleCompact]}>
            {step.title}
          </Text>

          <Text
            style={[
              styles.description,
              isCompactScreen && styles.descriptionCompact,
            ]}
          >
            {step.description}
          </Text>

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

          <View
            style={[
              styles.actionsRow,
              isNarrowScreen && styles.actionsColumn,
            ]}
          >
            <TouchableOpacity
              style={[
                styles.secondaryButton,
                styles.buttonFlex,
                isNarrowScreen && styles.fullWidthButton,
              ]}
              onPress={handleSkip}
            >
              <Text style={styles.secondaryButtonText}>Skip</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                styles.buttonFlex,
                isNarrowScreen && styles.fullWidthButton,
              ]}
              onPress={handleNext}
            >
              <Text style={styles.primaryButtonText}>
                {isLastStep ? 'Finish' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Modal>
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  sheet: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 14,
  },
  iconHintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  iconHintBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E9F3EC',
    borderWidth: 1,
    borderColor: '#CDE2D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHintText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D5A3F',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleCompact: {
    fontSize: 21,
  },
  description: {
    fontSize: 14,
    color: '#5D5D5D',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 14,
  },
  descriptionCompact: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D6D6D6',
  },
  progressDotActive: {
    width: 24,
    backgroundColor: '#5E936C',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionsColumn: {
    flexDirection: 'column',
  },
  buttonFlex: {
    flex: 1,
    minWidth: 0,
  },
  fullWidthButton: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#5E936C',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  secondaryButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
