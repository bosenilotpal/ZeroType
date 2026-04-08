// ============================================================
// History Screen — Biometric-gated scan vault
// Shows grouped scan list with date sections
// ============================================================
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, Modal,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, Typography, Shadows } from '../../src/theme/tokens';
import { useBiometrics } from '../../src/hooks/useBiometrics';
import ScanHistoryItem, { ScanHistoryItemSeparator } from '../../src/components/ScanHistoryItem';
import ActionDrawer from '../../src/components/ActionDrawer';
import { getScans, deleteScan, clearAllScans, getScanCount, ScanRecord } from '../../src/storage/db';
import * as Haptics from 'expo-haptics';

type Section = {
  title: string;
  data: ScanRecord[];
};

function groupByDate(records: ScanRecord[]): Section[] {
  const now = new Date();
  const today: ScanRecord[] = [];
  const yesterday: ScanRecord[] = [];
  const older: ScanRecord[] = [];

  for (const r of records) {
    const d = new Date(r.timestamp);
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) today.push(r);
    else if (diffDays === 1) yesterday.push(r);
    else older.push(r);
  }

  const sections: Section[] = [];
  if (today.length > 0) sections.push({ title: 'Today', data: today });
  if (yesterday.length > 0) sections.push({ title: 'Yesterday', data: yesterday });
  if (older.length > 0) sections.push({ title: 'Older Records', data: older });
  return sections;
}

const PAGE_SIZE = 10;

export default function HistoryScreen() {
  const { isAuthenticated, isSupported, authenticate, isLoading: bioLoading } = useBiometrics();
  const shouldRequireAuth = isSupported;
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<ScanRecord | null>(null);

  const loadRecords = useCallback(async (reset = false) => {
    if (isLoading) return;
    setIsLoading(true);
    const newOffset = reset ? 0 : offset;
    const data = await getScans(PAGE_SIZE, newOffset);
    const count = await getScanCount();
    setRecords((prev) => (reset ? data : [...prev, ...data]));
    setOffset(newOffset + data.length);
    setTotalCount(count);
    setIsLoading(false);
  }, [offset, isLoading]);

  useFocusEffect(
    useCallback(() => {
      if (!shouldRequireAuth || isAuthenticated) {
        loadRecords(true);
      }
    }, [shouldRequireAuth, isAuthenticated, loadRecords])
  );

  const handleAuth = useCallback(async () => {
    const ok = await authenticate();
    if (ok) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [authenticate]);

  const handleDelete = useCallback(async (id: number) => {
    Alert.alert('Delete Scan', 'Remove this scan from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteScan(id);
          setRecords((prev) => prev.filter((r) => r.id !== id));
          setTotalCount((c) => c - 1);
        }
      },
    ]);
  }, []);

  const handleClearAll = useCallback(() => {
    Alert.alert('Clear All History', 'This will permanently delete all scan records.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive', onPress: async () => {
          await clearAllScans();
          setRecords([]);
          setTotalCount(0);
          setOffset(0);
        }
      },
    ]);
  }, []);

  // LOCK GATE — shown when not authenticated
  if (shouldRequireAuth && !isAuthenticated) {
    return (
      <View style={styles.lockScreen}>
        <Animated.View entering={FadeIn} style={styles.lockCard}>
          <MaterialCommunityIcons name="shield-lock-outline" size={56} color={Colors.primary} />
          <Text style={styles.lockTitle}>History Vault</Text>
          <Text style={styles.lockSubtitle}>
            {isSupported
              ? 'Use biometrics to unlock your secure scan history.'
              : 'Unlock your scan history to continue.'}
          </Text>
          <TouchableOpacity style={styles.unlockBtn} onPress={handleAuth} disabled={bioLoading}>
            <Text style={styles.unlockBtnText}>
              {bioLoading ? 'Verifying...' : isSupported ? 'Unlock with Biometrics' : 'Unlock'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  const sections = groupByDate(records);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Recent Activity</Text>
          <Text style={styles.title}>
            Scan History
          </Text>
          <Text style={styles.subtitle}>{totalCount} records stored on device</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.liveChip}>
            <View style={styles.liveDot} />
            <Text style={styles.liveChipText}>Encrypted</Text>
          </View>
          <TouchableOpacity onPress={handleClearAll} style={{ marginTop: Spacing.sm }}>
            <MaterialCommunityIcons name="delete-outline" size={20} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100, gap: 0 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadRecords(true)}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item: section, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 60)}>
            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title.toUpperCase()}</Text>
            </View>

            {/* Records */}
            <View style={{ gap: Spacing.sm, paddingBottom: Spacing.md }}>
              {section.data.map((record) => (
                <ScanHistoryItem
                  key={record.id}
                  record={record}
                  onPress={(r) => setSelectedRecord(r)}
                />
              ))}
            </View>
          </Animated.View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="archive-outline" size={52} color={Colors.onSurfaceVariant} />
              <Text style={styles.emptyTitle}>No scans yet</Text>
              <Text style={styles.emptySubtitle}>Your captured scans will appear here.</Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          records.length < totalCount ? (
            <TouchableOpacity style={styles.loadMoreBtn} onPress={() => loadRecords(false)}>
              <Text style={styles.loadMoreText}>Load Full History</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Detail Drawer for selected record */}
      <ActionDrawer
        intents={selectedRecord?.intents ?? []}
        visible={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing['4xl'],
    paddingBottom: Spacing['2xl'],
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
  headerRight: {
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.headerDarkElevated,
    borderRadius: Radii.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Shadows.card,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.phoneGreen,
  },
  liveChipText: {
    ...Typography.labelSm,
    color: Colors.onHeader,
    textTransform: 'none',
    letterSpacing: 0,
    lineHeight: 12,
  },
  sectionHeader: {
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  sectionHeaderText: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: Spacing['5xl'],
    gap: Spacing.md,
  },
  emptyTitle: { ...Typography.headlineLg, color: Colors.onSurface },
  emptySubtitle: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadMoreText: {
    ...Typography.bodyLg,
    color: Colors.primary,
    fontFamily: 'Poppins_600SemiBold',
  },

  // Lock Gate
  lockScreen: {
    flex: 1,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing['3xl'],
  },
  lockCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.xl,
    padding: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.lg,
    width: '100%',
    ...Shadows.ambient,
  },
  lockIcon: { fontSize: 56 },
  lockTitle: { ...Typography.displaySm, color: Colors.onSurface },
  lockSubtitle: {
    ...Typography.bodyLg,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  unlockBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radii.full,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing['3xl'],
    ...Shadows.fab,
  },
  unlockBtnText: {
    ...Typography.bodyLg,
    color: Colors.onPrimary,
    fontFamily: 'Poppins_600SemiBold',
  },
});
