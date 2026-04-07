// ============================================================
// Camera Screen — Core Capture Interface
// Custom viewfinder, capture FAB, gallery import, OCR pipeline
// ============================================================
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
  Dimensions, StatusBar, Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, FadeIn, FadeOut, ZoomIn,
} from 'react-native-reanimated';
import { Colors, Spacing, Radii, Typography, Shadows } from '../../src/theme/tokens';
import { useOCR } from '../../src/hooks/useOCR';
import AnalyzingOverlay from '../../src/components/AnalyzingOverlay';
import ActionDrawer from '../../src/components/ActionDrawer';
import { insertScan } from '../../src/storage/db';

const { width, height } = Dimensions.get('window');
const VIEWFINDER_SIZE = width * 0.78;

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const { state, cameraRef, capture, captureFromUri, reset } = useOCR();

  // Viewfinder corner animation (breathing corners)
  const cornerScale = useSharedValue(1);
  useEffect(() => {
    cornerScale.value = withRepeat(
      withSequence(withTiming(1.05, { duration: 1200 }), withTiming(1, { duration: 1200 })),
      -1, true
    );
  }, []);

  const cornerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cornerScale.value }],
  }));

  // Request camera permission on mount
  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, []);

  const handleCapture = useCallback(async () => {
    await capture();
  }, [capture]);

  const handleGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await captureFromUri(result.assets[0].uri);
    }
  }, [captureFromUri]);

  const toggleFlash = useCallback(async () => {
    await Haptics.selectionAsync();
    setFlash((f) => (f === 'off' ? 'on' : 'off'));
  }, []);

  const handleSaveToHistory = useCallback(async () => {
    if (!state.rawText) return;
    try {
      await insertScan({
        rawText: state.rawText,
        intents: state.intents,
        imageUri: state.capturedImageUri,
        source: 'camera',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved!', 'Scan has been added to your history.');
    } catch (e) {
      Alert.alert('Error', 'Could not save scan to history.');
    }
  }, [state]);

  const handleDrawerClose = useCallback(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (state.status === 'error' && state.error) {
      Alert.alert('Scan failed', state.error);
    }
  }, [state.status, state.error]);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <Ionicons name="camera-outline" size={58} color={Colors.primary} style={styles.permissionIcon} />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionBody}>
          ScanIntent needs camera access to capture and recognize text from physical documents.
        </Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Camera Preview */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        flash={flash}
        enableTorch={flash === 'on'}
      />

      {/* Dark overlay with transparent viewfinder cutout feel */}
      <View style={styles.overlay} pointerEvents="none">
        {/* Top bar overlay */}
        <View style={styles.topOverlay} />
        {/* Viewfinder row */}
        <View style={styles.viewfinderRow}>
          <View style={styles.sideOverlay} />
          <View style={styles.viewfinderClear} />
          <View style={styles.sideOverlay} />
        </View>
        {/* Bottom overlay (partial — shows controls) */}
        <View style={styles.bottomOverlayFill} />
      </View>

      {/* Animated corner brackets */}
      <Animated.View style={[styles.viewfinderContainer, cornerStyle]} pointerEvents="none">
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </Animated.View>

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarPill}>
          <View style={styles.autoDotLive} />
          <Text style={styles.topBarText}>Auto Detecting</Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() =>
          Alert.alert('ScanIntent', 'Point your camera at text (business cards, banners, notes). Tap the shutter to capture and extract phone numbers, UPI IDs, addresses, and more — all offline.')
        }>
          <Ionicons name="information-circle-outline" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Hint text */}
      <Animated.View entering={FadeIn} style={styles.hintContainer} pointerEvents="none">
        <View style={styles.hintPill}>
          <Text style={styles.hintText}>Center text in the frame to scan</Text>
        </View>
      </Animated.View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {/* Gallery */}
        <TouchableOpacity style={styles.sideControl} onPress={handleGallery}>
          <Ionicons name="images-outline" size={22} color="#FFFFFF" />
          <Text style={styles.sideControlLabel}>Gallery</Text>
        </TouchableOpacity>

        {/* Capture FAB */}
        <TouchableOpacity
          style={[styles.captureBtn, state.status !== 'idle' && styles.captureBtnDisabled]}
          onPress={handleCapture}
          disabled={state.status !== 'idle'}
          activeOpacity={0.85}
        >
          <View style={styles.captureInner}>
            <Ionicons name="camera" size={26} color={Colors.onPrimary} />
          </View>
        </TouchableOpacity>

        {/* Flash */}
        <TouchableOpacity style={styles.sideControl} onPress={toggleFlash}>
          <Ionicons
            name={flash === 'on' ? 'flash' : 'flash-off-outline'}
            size={22}
            color="#FFFFFF"
          />
          <Text style={styles.sideControlLabel}>Light</Text>
        </TouchableOpacity>
      </View>

      {/* Analyzing Overlay (frozen frame + scan animation) */}
      <AnalyzingOverlay
        imageUri={state.capturedImageUri ?? ''}
        visible={state.status === 'analyzing' || state.status === 'capturing'}
      />

      {/* Action Drawer */}
      <ActionDrawer
        intents={state.intents}
        visible={state.status === 'results'}
        onClose={handleDrawerClose}
        onSaveAll={handleSaveToHistory}
      />

      {/* Error state — keep retry visible so scan never feels stuck */}
      {state.status === 'error' && (
        <View style={styles.errorBar}>
          <View style={styles.errorContent}>
            <Ionicons name="alert-circle-outline" size={18} color="#FEE2E2" />
            <Text style={styles.errorText} numberOfLines={2}>
              {state.error ?? 'Scan failed. Please try again.'}
            </Text>
          </View>
          <TouchableOpacity style={styles.errorRetryBtn} onPress={reset} activeOpacity={0.9}>
            <Text style={styles.errorRetryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const SIDE_OVERLAY = (width - VIEWFINDER_SIZE) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topOverlay: {
    height: (height - VIEWFINDER_SIZE) * 0.35,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  viewfinderRow: {
    flexDirection: 'row',
    height: VIEWFINDER_SIZE,
  },
  sideOverlay: {
    width: SIDE_OVERLAY,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  viewfinderClear: {
    flex: 1,
  },
  bottomOverlayFill: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },

  // Corner brackets
  viewfinderContainer: {
    position: 'absolute',
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
    left: SIDE_OVERLAY,
    top: (height - VIEWFINDER_SIZE) * 0.35,
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
    borderWidth: 2,
  },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },

  // Top Bar
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 32,
    left: Spacing.lg,
    right: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.full,
  },
  autoDotLive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primaryContainer,
  },
  topBarText: {
    ...Typography.labelMd,
    color: '#FFFFFF',
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  iconBtn: {
    position: 'absolute',
    right: 0,
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hint
  hintContainer: {
    position: 'absolute',
    bottom: 170,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintPill: {
    backgroundColor: 'rgba(0,0,0,0.50)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: Radii.full,
  },
  hintText: {
    ...Typography.bodyMd,
    color: 'rgba(255,255,255,0.85)',
  },

  // Bottom Controls
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 28,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: Spacing['2xl'],
  },
  sideControl: {
    alignItems: 'center',
    gap: 4,
    opacity: 0.85,
    minWidth: 72,
    minHeight: 44,
    justifyContent: 'center',
  },
  sideControlLabel: {
    ...Typography.labelSm,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'none',
    letterSpacing: 0.1,
  },
  captureBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnDisabled: {
    opacity: 0.4,
  },
  captureInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },

  // Permission screen
  permissionScreen: {
    flex: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['4xl'],
    gap: Spacing.lg,
  },
  permissionIcon: {
    marginBottom: Spacing.md,
  },
  permissionTitle: {
    ...Typography.displaySm,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  permissionBody: {
    ...Typography.bodyLg,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing['3xl'],
    paddingVertical: Spacing.lg,
    borderRadius: Radii.full,
    ...Shadows.fab,
  },
  permissionBtnText: {
    ...Typography.bodyLg,
    color: Colors.onPrimary,
    fontFamily: 'Inter_600SemiBold',
  },
  errorBar: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Platform.OS === 'ios' ? 140 : 120,
    borderRadius: Radii.lg,
    backgroundColor: 'rgba(127, 29, 29, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 202, 0.35)',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  errorText: {
    ...Typography.bodySm,
    color: '#FEE2E2',
    flex: 1,
  },
  errorRetryBtn: {
    alignSelf: 'flex-end',
    backgroundColor: '#FEE2E2',
    borderRadius: Radii.full,
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
  },
  errorRetryBtnText: {
    ...Typography.labelMd,
    color: '#7F1D1D',
    textTransform: 'none',
    letterSpacing: 0,
  },
});
