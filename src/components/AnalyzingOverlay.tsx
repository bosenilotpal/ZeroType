// ============================================================
// AnalyzingOverlay — Frozen frame + animated scanning indicator
// ============================================================
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, Dimensions } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, FadeIn, Easing,
} from 'react-native-reanimated';
import { Colors, Spacing, Radii, Typography } from '../theme/tokens';

const { width, height } = Dimensions.get('window');

interface AnalyzingOverlayProps {
  imageUri: string;
  visible: boolean;
}

export default function AnalyzingOverlay({ imageUri, visible }: AnalyzingOverlayProps) {
  const scanLineY = useSharedValue(0);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (visible) {
      // Scan line animation — sweeps top to bottom
      scanLineY.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      // Pulsing glow
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.4, { duration: 600 })
        ),
        -1,
        true
      );
    }
  }, [visible]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value * (height * 0.55) }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFillObject}>
      {/* Frozen camera frame */}
      <ImageBackground
        source={{ uri: imageUri }}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        blurRadius={1}
      >
        {/* Dark scrim */}
        <View style={styles.scrim} />

        {/* Highlighted detection zones (decorative) */}
        <View style={styles.scanZone}>
          <Animated.View style={[styles.detectionBox, styles.phoneBox, pulseStyle]}>
            <Text style={styles.tagLabel}>PHONE</Text>
          </Animated.View>
          <Animated.View style={[styles.detectionBox, styles.addressBox, pulseStyle]}>
            <Text style={styles.tagLabel}>ADDRESS</Text>
          </Animated.View>
        </View>

        {/* Animated scan line */}
        <Animated.View style={[styles.scanLine, scanLineStyle]} />

        {/* Status pill */}
        <View style={styles.statusContainer}>
          <View style={styles.statusPill}>
            <Animated.View style={[styles.statusDot, pulseStyle]} />
            <Text style={styles.statusText}>ANALYZING...</Text>
          </View>
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  backgroundImage: {
    resizeMode: 'contain',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  scanZone: {
    flex: 1,
    paddingHorizontal: Spacing['2xl'],
    paddingTop: 120,
    gap: Spacing.md,
  },
  detectionBox: {
    borderWidth: 2,
    borderRadius: Radii.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  phoneBox: {
    borderColor: Colors.primaryContainer,
    backgroundColor: 'rgba(108, 159, 255, 0.15)',
    alignSelf: 'flex-start',
    marginLeft: 32,
  },
  addressBox: {
    borderColor: Colors.primaryContainer,
    backgroundColor: 'rgba(108, 159, 255, 0.15)',
    alignSelf: 'flex-end',
    marginRight: 16,
  },
  tagLabel: {
    ...Typography.labelSm,
    color: Colors.primaryContainer,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 80,
    height: 2,
    backgroundColor: Colors.primaryContainer,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    opacity: 0.8,
  },
  statusContainer: {
    position: 'absolute',
    bottom: '48%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radii.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primaryContainer,
  },
  statusText: {
    ...Typography.labelLg,
    color: '#FFFFFF',
  },
});
