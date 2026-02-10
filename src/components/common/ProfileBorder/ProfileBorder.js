// components/common/ProfileBorder/ProfileBorder.js - OVERLAY VERSION
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Image } from 'react-native';

/**
 * ProfileBorder - Border overlays ON TOP of avatar (avatar is background)
 * The border image has transparent center - avatar shows through
 */
export default function ProfileBorder({
  border,
  size = 100,
  children,
  showGlow = true,
  borderScale = 1.4,
  glowPadding = 40,
}) {
  const [glowAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (!border || !showGlow) return;

    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );

    glowAnimation.start();
    return () => glowAnimation.stop();
  }, [border, showGlow]);

  if (!border || !border.image) {
    return <>{children}</>;
  }

  // Border is larger than avatar to create frame effect
  const borderSize = size * borderScale;
  const glowSize = borderSize + glowPadding;

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.9],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  return (
    <View style={styles.container}>
      {showGlow && (
        <Animated.View
          style={[
            styles.glowLayer,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
              backgroundColor: border.glowColor || 'rgba(94, 147, 108, 0.3)',
              opacity: glowOpacity,
              transform: [{ scale: glowScale }],
            },
          ]}
        />
      )}

      {/* Avatar (renders FIRST - bottom layer) */}
      <View
        style={[
          styles.avatarWrapper,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        {children}
      </View>

      {/* Border overlay (renders ON TOP with absolute positioning) */}
      <Image
        source={border.image}
        style={[
          styles.borderOverlay,
          {
            width: borderSize,
            height: borderSize,
            borderRadius: borderSize / 2,
          },
        ]}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowLayer: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 10,
  },
  avatarWrapper: {
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1, // Behind border
  },
  borderOverlay: {
    position: 'absolute',
    zIndex: 2, // On top of avatar
  },
});
