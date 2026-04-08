// ============================================================
// ActionDrawer — @gorhom/bottom-sheet post-scan results
// Glassmorphism design with intent cards
// ============================================================
import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii, Typography, Shadows, Animation } from '../theme/tokens';
import IntentCard from './IntentCard';
import { Intent } from '../engine/parser';

interface ActionDrawerProps {
  intents: Intent[];
  visible: boolean;
  onClose: () => void;
  onSaveAll?: () => void;
}

export default function ActionDrawer({ intents, visible, onClose, onSaveAll }: ActionDrawerProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%', '90%'], []);
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const bottomSpacing = useMemo(
    () => Math.max(Spacing['5xl'], tabBarHeight + insets.bottom + Spacing.xl),
    [tabBarHeight, insets.bottom]
  );

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else if (!visible) {
      sheetRef.current?.close();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.4}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.close();
    onClose();
  }, [onClose]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onChange={(index) => {
        // Avoid firing on initial -1 while hidden; only notify close when drawer was shown.
        if (visible && index === -1) onClose();
      }}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      bottomInset={0}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.sheetBackground}
      style={styles.sheet}
    >
      {/* Sticky Header */}
      <View style={styles.drawerHeader}>
        <View>
          <Text style={styles.eyebrow}>Detected Data</Text>
          <Text style={styles.title}>Review Results</Text>
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <MaterialCommunityIcons name="close" size={18} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      <BottomSheetScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomSpacing }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Count Badge */}
        {intents.length > 0 && (
          <Animated.View entering={FadeIn.delay(Animation.fast)} style={styles.countBadge}>
            <Text style={styles.countBadgeText}>
              {intents.length} {intents.length === 1 ? 'item' : 'items'} found
            </Text>
          </Animated.View>
        )}

        {/* Intent Cards */}
        {intents.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="magnify" size={44} color={Colors.onSurfaceVariant} />
            <Text style={styles.emptyTitle}>No data detected</Text>
            <Text style={styles.emptySubtitle}>
              Try capturing a clearer image with better lighting.
            </Text>
          </View>
        ) : (
          intents.map((intent, i) => (
            <Animated.View
              key={intent.id}
              entering={FadeInDown.delay(i * 60).springify()}
            >
              <IntentCard intent={intent} />
            </Animated.View>
          ))
        )}

        {/* Save All Button */}
        {intents.length > 0 && onSaveAll && (
          <Animated.View entering={FadeInDown.delay(intents.length * 60 + Animation.fast)}>
            <TouchableOpacity style={styles.saveAllBtn} onPress={onSaveAll} activeOpacity={0.8}>
              <Text style={styles.saveAllBtnText}>Save Scan to History</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    ...Shadows.ambient,
  },
  sheetBackground: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  handle: {
    backgroundColor: Colors.outlineVariant,
    width: 36,
    height: 4,
    borderRadius: Radii.full,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  eyebrow: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    marginBottom: 4,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  title: {
    ...Typography.headlineLg,
    color: Colors.onSurface,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    marginBottom: Spacing.lg,
  },
  countBadgeText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    textTransform: 'none',
    letterSpacing: 0,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['4xl'],
    gap: Spacing.sm,
  },
  emptyTitle: {
    ...Typography.headlineMd,
    color: Colors.onSurface,
  },
  emptySubtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  saveAllBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    minHeight: 48,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    ...Shadows.card,
  },
  saveAllBtnText: {
    ...Typography.bodyLg,
    color: Colors.onPrimary,
    fontFamily: 'Poppins_600SemiBold',
  },
});
