// ============================================================
// Settings Screen
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, Typography, Shadows } from '../../src/theme/tokens';
import { clearAllScans } from '../../src/storage/db';
import * as Haptics from 'expo-haptics';
import { useBiometrics } from '../../src/hooks/useBiometrics';

interface SettingRowProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description?: string;
  value?: boolean;
  onToggle?: (v: boolean) => void;
  onPress?: () => void;
  destructive?: boolean;
  showChevron?: boolean;
}

function SettingRow({ icon, label, description, value, onToggle, onPress, destructive = false, showChevron = false }: SettingRowProps) {
  const iconColor = destructive ? '#DC2626' : Colors.primary;
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={!onPress && onToggle === undefined}
      activeOpacity={0.7}
    >
      <View style={styles.settingRowLeft}>
        <View style={[styles.settingIcon, destructive && styles.settingIconDestructive]}>
          <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingLabel, destructive && { color: '#DC2626' }]}>{label}</Text>
          {description && <Text style={styles.settingDesc}>{description}</Text>}
        </View>
      </View>
      {onToggle !== undefined && value !== undefined && (
        <TouchableOpacity
          onPress={() => onToggle(!value)}
          activeOpacity={0.9}
          style={[
            styles.toggleTrack,
            value ? styles.toggleTrackOn : styles.toggleTrackOff,
          ]}
        >
          <View style={[styles.toggleThumb, value ? styles.toggleThumbOn : styles.toggleThumbOff]} />
        </TouchableOpacity>
      )}
      {showChevron && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function SettingsScreen() {
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [requireBiometrics, setRequireBiometrics] = useState(true);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const { isSupported, biometricType } = useBiometrics();

  const biometricLabel = biometricType === 'faceid'
    ? 'Face ID'
    : biometricType === 'fingerprint'
    ? 'Fingerprint'
    : 'Biometrics';

  const handleClearHistory = () => {
    Alert.alert(
      'Clear All History',
      'This will permanently delete all scan records from your device. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All', style: 'destructive', onPress: async () => {
            await clearAllScans();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Done', 'All scan history has been cleared.');
          }
        },
      ]
    );
  };

  const handleHapticsToggle = async (v: boolean) => {
    setHapticsEnabled(v);
    if (v) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Preferences</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Control privacy, feedback, and app data</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Privacy */}
      <Animated.View entering={FadeInDown.delay(60)}>
        <SectionCard title="PRIVACY & SECURITY">
          <SettingRow
            icon="shield-lock-outline"
            label={`Require ${biometricLabel} for History`}
            description={isSupported ? `Lock History Vault behind ${biometricLabel}` : 'No biometric hardware detected'}
            value={requireBiometrics && isSupported}
            onToggle={isSupported ? setRequireBiometrics : undefined}
          />
        </SectionCard>
      </Animated.View>

      {/* Experience */}
      <Animated.View entering={FadeInDown.delay(120)}>
        <SectionCard title="EXPERIENCE">
          <SettingRow
            icon="vibrate"
            label="Haptic Feedback"
            description="Vibrate when intents are detected"
            value={hapticsEnabled}
            onToggle={handleHapticsToggle}
          />
        </SectionCard>
      </Animated.View>

      {/* Appearance */}
      <Animated.View entering={FadeInDown.delay(150)}>
        <SectionCard title="APPEARANCE">
          <View style={styles.themeRow}>
            <Text style={styles.settingLabel}>Theme Mode</Text>
            <View style={styles.themeToggleGroup}>
              <TouchableOpacity
                style={[styles.themeToggleBtn, themeMode === 'light' && styles.themeToggleBtnActive]}
                onPress={() => setThemeMode('light')}
                activeOpacity={0.9}
              >
                <Text style={[styles.themeToggleText, themeMode === 'light' && styles.themeToggleTextActive]}>Light</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.themeToggleBtn, themeMode === 'dark' && styles.themeToggleBtnActive]}
                onPress={() => setThemeMode('dark')}
                activeOpacity={0.9}
              >
                <Text style={[styles.themeToggleText, themeMode === 'dark' && styles.themeToggleTextActive]}>Dark</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SectionCard>
      </Animated.View>

      {/* Data */}
      <Animated.View entering={FadeInDown.delay(210)}>
        <SectionCard title="DATA">
          <SettingRow
            icon="delete-outline"
            label="Clear Scan History"
            description="Permanently delete all scan records"
            onPress={handleClearHistory}
            destructive
          />
        </SectionCard>
      </Animated.View>

      {/* About */}
      <Animated.View entering={FadeInDown.delay(270)}>
        <SectionCard title="ABOUT">
          <View style={styles.aboutBlock}>
            <Text style={styles.appName}>ScanIntent</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <View style={styles.privacyBadge}>
              <MaterialCommunityIcons name="shield-check-outline" size={14} color={Colors.onSurfaceVariant} />
              <Text style={styles.privacyText}>100% On-Device · No Cloud · No Tracking</Text>
            </View>
            <Text style={styles.aboutDetail}>
              All OCR processing, data extraction, and storage happens locally on your device. 
              No data ever leaves your phone.
            </Text>
          </View>
        </SectionCard>
      </Animated.View>

      <View style={{ height: Spacing['5xl'] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  content: {
    paddingBottom: Spacing['4xl'],
    paddingTop: Spacing.md,
  },
  header: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing['2xl'],
    minHeight: 136,
    backgroundColor: Colors.headerDark,
    borderBottomLeftRadius: Radii.xl,
    borderBottomRightRadius: Radii.xl,
  },
  eyebrow: {
    ...Typography.labelMd,
    color: Colors.onHeaderMuted,
    marginBottom: 4,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  title: {
    ...Typography.displaySm,
    color: Colors.onHeader,
  },
  subtitle: {
    ...Typography.bodySm,
    color: Colors.onHeaderMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing['2xl'],
  },
  sectionTitle: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.md,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  sectionCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadows.card,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDestructive: {
    backgroundColor: '#FEE2E2',
  },
  settingText: {
    flex: 1,
    gap: 2,
  },
  settingLabel: {
    ...Typography.bodyLg,
    color: Colors.onSurface,
    fontFamily: 'Poppins_500Medium',
  },
  settingDesc: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
  },
  themeRow: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  themeToggleGroup: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.full,
    padding: 4,
    gap: 6,
    alignSelf: 'flex-start',
  },
  themeToggleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
  },
  themeToggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  themeToggleText: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    textTransform: 'none',
    letterSpacing: 0,
  },
  themeToggleTextActive: {
    color: Colors.onPrimary,
  },
  chevron: {
    fontSize: 22,
    color: Colors.onSurfaceVariant,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 3,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  toggleTrackOff: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D6DEE8',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  toggleThumbOff: {
    alignSelf: 'flex-start',
  },
  aboutBlock: {
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  appName: {
    ...Typography.headlineLg,
    color: Colors.primary,
  },
  aboutVersion: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    marginTop: Spacing.sm,
  },
  privacyText: {
    ...Typography.labelSm,
    color: Colors.onSurfaceVariant,
    textTransform: 'none',
    letterSpacing: 0,
  },
  aboutDetail: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.sm,
  },
});
