// ============================================================
// IntentCard — Displays a single detected intent with actions
// ============================================================
import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import * as Contacts from 'expo-contacts';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Radii, Typography, Shadows } from '../theme/tokens';
import { Intent } from '../engine/parser';
import {
  buildGoogleMapsFallback,
  buildMapsLink,
  buildTelLink,
  buildUpiPayLink,
  buildWhatsAppLink,
} from '../engine/actions';

const ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  phone: 'phone-outline',
  whatsapp: 'message-outline',
  save: 'account-plus-outline',
  navigate: 'map-marker-radius-outline',
  copy: 'content-copy',
  pay: 'currency-inr',
  email: 'email-outline',
  open: 'open-in-new',
  upi: 'currency-inr',
  address: 'map-marker-outline',
  url: 'link-variant',
};

const ACCENT = Colors.primary;
const ACCENT_BG = Colors.primaryContainer;

const INTENT_META: Record<
  Intent['type'],
  { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; bgColor: string }
> = {
  phone: { label: 'Phone Number', icon: 'phone-outline', color: ACCENT, bgColor: ACCENT_BG },
  upi:   { label: 'UPI ID',       icon: 'currency-inr', color: ACCENT, bgColor: ACCENT_BG },
  address: { label: 'Address', icon: 'map-marker-outline', color: ACCENT, bgColor: ACCENT_BG },
  email: { label: 'Email Address', icon: 'email-outline', color: ACCENT, bgColor: ACCENT_BG },
  url:   { label: 'Web Link',      icon: 'link-variant', color: ACCENT, bgColor: ACCENT_BG },
};

interface ActionButtonProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  primary?: boolean;
}

function IconCircleButton({
  icon,
  onPress,
  primary = false,
}: ActionButtonProps) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  return (
    <TouchableOpacity
      style={[styles.circleActionBtn, primary ? styles.circleActionBtnPrimary : styles.circleActionBtnSecondary]}
      onPress={handlePress}
      activeOpacity={0.86}
    >
      <MaterialCommunityIcons name={icon} size={18} color={primary ? Colors.onPrimary : ACCENT} />
    </TouchableOpacity>
  );
}

interface IntentCardProps {
  intent: Intent;
}

export default function IntentCard({ intent }: IntentCardProps) {
  const meta = INTENT_META[intent.type];

  const openPhone = useCallback(() => {
    Linking.openURL(buildTelLink(intent.value));
  }, [intent.value]);

  const openWhatsApp = useCallback(() => {
    Linking.openURL(buildWhatsAppLink(intent.value)).catch(() => {
      Alert.alert('WhatsApp not found', 'Please install WhatsApp to use this feature.');
    });
  }, [intent.value]);

  const saveContact = useCallback(async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Contacts permission is required to save this contact.');
      return;
    }
    const number = intent.value.replace(/\s/g, '');
    await Contacts.addContactAsync({
      name: 'Scanned Contact',
      phoneNumbers: [{ number, label: 'mobile' }],
    });
    Alert.alert('Saved!', 'Contact has been added to your phone.');
  }, [intent.value]);

  const openMaps = useCallback(() => {
    const url = buildMapsLink(intent.value);
    Linking.openURL(url).catch(() => {
      Linking.openURL(buildGoogleMapsFallback(intent.value));
    });
  }, [intent.value]);

  const copyToClipboard = useCallback(async () => {
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(intent.value);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [intent.value]);

  const openUpi = useCallback(() => {
    const url = buildUpiPayLink(intent.value);
    Linking.openURL(url).catch(() => {
      Alert.alert('UPI App not found', 'Please install a UPI payment app.');
    });
  }, [intent.value]);

  const openEmail = useCallback(() => {
    Linking.openURL(`mailto:${intent.value}`);
  }, [intent.value]);

  const openUrl = useCallback(() => {
    Linking.openURL(intent.value).catch(() => {
      Alert.alert('Cannot open URL', intent.value);
    });
  }, [intent.value]);

  const renderActions = () => {
    switch (intent.type) {
      case 'phone':
        return (
          <View style={styles.phoneIconActionsRow}>
            <IconCircleButton icon={ICONS.phone} onPress={openPhone} primary />
            <IconCircleButton icon={ICONS.whatsapp} onPress={openWhatsApp} />
            <IconCircleButton icon={ICONS.save} onPress={saveContact} />
          </View>
        );
      case 'upi':
        return (
          <View style={styles.phoneIconActionsRow}>
            <IconCircleButton icon={ICONS.upi} onPress={openUpi} primary />
            <IconCircleButton icon={ICONS.copy} onPress={copyToClipboard} />
          </View>
        );
      case 'address':
        return (
          <View style={styles.phoneIconActionsRow}>
            <IconCircleButton icon={ICONS.navigate} onPress={openMaps} primary />
            <IconCircleButton icon={ICONS.copy} onPress={copyToClipboard} />
          </View>
        );
      case 'email':
        return (
          <View style={styles.phoneIconActionsRow}>
            <IconCircleButton icon={ICONS.email} onPress={openEmail} primary />
            <IconCircleButton icon={ICONS.copy} onPress={copyToClipboard} />
          </View>
        );
      case 'url':
        return (
          <View style={styles.phoneIconActionsRow}>
            <IconCircleButton icon={ICONS.open} onPress={openUrl} primary />
            <IconCircleButton icon={ICONS.copy} onPress={copyToClipboard} />
          </View>
        );
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.iconBubble, { backgroundColor: meta.bgColor }]}>
          <MaterialCommunityIcons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.intentLabel, { color: meta.color }]}>{meta.label}</Text>
          <Text style={styles.intentValue} numberOfLines={2}>{intent.display}</Text>
        </View>
      </View>
      {renderActions()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    ...Shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  iconBubble: {
    width: 42,
    height: 42,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  intentLabel: {
    ...Typography.labelMd,
    marginBottom: 2,
    textTransform: 'none',
    letterSpacing: 0.2,
  },
  intentValue: {
    ...Typography.bodyLg,
    color: Colors.onSurface,
    fontFamily: 'Poppins_500Medium',
  },
  phoneIconActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 2,
  },
  circleActionBtn: {
    width: 42,
    height: 42,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  circleActionBtnPrimary: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  circleActionBtnSecondary: {
    backgroundColor: ACCENT_BG,
    borderColor: Colors.outlineVariant,
  },
});
