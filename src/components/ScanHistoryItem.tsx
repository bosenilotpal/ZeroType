// ============================================================
// ScanHistoryItem — Single row in history list
// ============================================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, Typography, Shadows } from '../theme/tokens';
import { ScanRecord } from '../storage/db';
import { IntentType } from '../engine/parser';

const INTENT_TYPE_META: Record<IntentType, { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; color: string }> = {
  phone:   { icon: 'phone-outline', label: 'Phone Contact',   color: Colors.primary },
  upi:     { icon: 'currency-inr',  label: 'Payment UPI',     color: Colors.primary },
  address: { icon: 'map-marker-outline', label: 'Location Pin', color: Colors.primary },
  email:   { icon: 'email-outline', label: 'Contact Detail',  color: Colors.primary },
  url:     { icon: 'link-variant', label: 'Secure Link',      color: Colors.primary },
};

const SOURCE_LABEL: Record<string, string> = {
  camera: 'Scanned via Camera',
  gallery: 'From Gallery',
};

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

interface ScanHistoryItemProps {
  record: ScanRecord;
  onPress: (record: ScanRecord) => void;
}

export default function ScanHistoryItem({ record, onPress }: ScanHistoryItemProps) {
  // Determine the primary intent to display
  const primaryIntent = record.intents[0];
  const meta = primaryIntent
    ? INTENT_TYPE_META[primaryIntent.type]
    : { icon: 'file-document-outline' as const, label: 'Scan', color: Colors.onSurfaceVariant };

  const displayValue = primaryIntent?.display ?? record.rawText.slice(0, 40);
  const truncated = displayValue.length > 28 ? displayValue.slice(0, 25) + '...' : displayValue;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => onPress(record)}
      activeOpacity={0.82}
    >
      {/* Icon thumbnail */}
      <View style={[styles.iconBox, { backgroundColor: Colors.surfaceContainerLow }]}>
        <MaterialCommunityIcons name={meta.icon} size={20} color={meta.color} />
      </View>

      {/* Text */}
      <View style={styles.textBlock}>
        <Text style={[styles.typeLabel, { color: meta.color }]}>{meta.label}</Text>
        <Text style={styles.valueText}>{truncated}</Text>
        <Text style={styles.meta}>
          {formatRelativeTime(record.timestamp)} · {SOURCE_LABEL[record.source] ?? 'OCR Scan'}
        </Text>
      </View>

      {/* Chevron */}
      <MaterialCommunityIcons name="chevron-right" size={18} color={Colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

export function ScanHistoryItemSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadows.card,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  typeLabel: {
    ...Typography.labelSm,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  valueText: {
    ...Typography.bodyLg,
    color: Colors.onSurface,
    fontFamily: 'Poppins_500Medium',
  },
  meta: {
    ...Typography.bodySm,
    color: Colors.onSurfaceVariant,
  },
  chevron: {
    fontSize: 22,
    color: Colors.onSurfaceVariant,
    lineHeight: 24,
  },
  separator: {
    height: Spacing.sm,
  },
});
