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
  buildTelegramLink,
  buildTelLink,
  buildUpiPayLink,
  buildWhatsAppLink,
} from '../engine/actions';

const ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  phone: 'phone-outline',
  whatsapp: 'message-outline',
  telegram: 'send-outline',
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

const INTENT_META: Record<
  Intent['type'],
  { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; color: string; bgColor: string }
> = {
  phone: { label: 'Phone Number', icon: 'phone-outline', color: Colors.phoneGreen, bgColor: Colors.phoneGreenContainer },
  upi:   { label: 'UPI ID',       icon: 'currency-inr', color: Colors.upiPurple, bgColor: Colors.upiPurpleContainer },
  address: { label: 'Address', icon: 'map-marker-outline', color: Colors.addressBlue, bgColor: Colors.addressBlueContainer },
  email: { label: 'Email Address', icon: 'email-outline', color: Colors.emailOrange, bgColor: Colors.emailOrangeContainer },
  url:   { label: 'Web Link',      icon: 'link-variant', color: Colors.urlTeal, bgColor: Colors.urlTealContainer },
};

interface ActionButtonProps {
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  color?: string;
  toneColor?: string;
  toneBg?: string;
}

function ActionButton({
  label,
  icon,
  onPress,
  primary = false,
  color,
  toneColor,
  toneBg,
}: ActionButtonProps) {
  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };
  const iconColor = primary ? Colors.onPrimary : (toneColor ?? Colors.onSurfaceVariant);
  const textColor = primary ? Colors.onPrimary : (toneColor ?? Colors.onSurfaceVariant);
  return (
    <TouchableOpacity
      style={[
        styles.actionBtn,
        primary && styles.actionBtnPrimary,
        primary && color ? { backgroundColor: color } : {},
        !primary && toneBg ? { backgroundColor: toneBg } : {},
        !primary && toneColor ? { borderColor: `${toneColor}40` } : {},
      ]}
      onPress={handlePress}
      activeOpacity={0.86}
    >
      <MaterialCommunityIcons
        name={icon}
        size={16}
        color={iconColor}
      />
      <Text style={[styles.actionBtnLabel, primary && styles.actionBtnLabelPrimary, !primary ? { color: textColor } : {}]}>
        {label}
      </Text>
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

  const openTelegram = useCallback(() => {
    Linking.openURL(buildTelegramLink(intent.value)).catch(() => {
      Alert.alert('Telegram not found', 'Please install Telegram to use this feature.');
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
          <View style={styles.actionsRow}>
            <ActionButton label="CALL" icon={ICONS.phone} onPress={openPhone} primary color={Colors.phoneGreen} />
            <ActionButton
              label="WHATSAPP"
              icon={ICONS.whatsapp}
              onPress={openWhatsApp}
              toneColor={Colors.phoneGreen}
              toneBg={Colors.phoneGreenContainer}
            />
            <ActionButton
              label="TELEGRAM"
              icon={ICONS.telegram}
              onPress={openTelegram}
              toneColor={Colors.phoneGreen}
              toneBg={Colors.phoneGreenContainer}
            />
            <ActionButton
              label="SAVE"
              icon={ICONS.save}
              onPress={saveContact}
              toneColor={Colors.phoneGreen}
              toneBg={Colors.phoneGreenContainer}
            />
          </View>
        );
      case 'upi':
        return (
          <View style={styles.actionsRow}>
            <ActionButton label="PAY NOW" icon={ICONS.upi} onPress={openUpi} primary color={Colors.upiPurple} />
            <ActionButton
              label="COPY"
              icon={ICONS.copy}
              onPress={copyToClipboard}
              toneColor={Colors.upiPurple}
              toneBg={Colors.upiPurpleContainer}
            />
          </View>
        );
      case 'address':
        return (
          <View style={styles.actionsRow}>
            <ActionButton label="NAVIGATE" icon={ICONS.navigate} onPress={openMaps} primary color={Colors.primary} />
            <ActionButton
              label="COPY"
              icon={ICONS.copy}
              onPress={copyToClipboard}
              toneColor={Colors.addressBlue}
              toneBg={Colors.addressBlueContainer}
            />
          </View>
        );
      case 'email':
        return (
          <View style={styles.actionsRow}>
            <ActionButton label="COMPOSE" icon={ICONS.email} onPress={openEmail} primary color={Colors.emailOrange} />
            <ActionButton
              label="COPY"
              icon={ICONS.copy}
              onPress={copyToClipboard}
              toneColor={Colors.emailOrange}
              toneBg={Colors.emailOrangeContainer}
            />
          </View>
        );
      case 'url':
        return (
          <View style={styles.actionsRow}>
            <ActionButton label="OPEN" icon={ICONS.open} onPress={openUrl} primary color={Colors.urlTeal} />
            <ActionButton
              label="COPY"
              icon={ICONS.copy}
              onPress={copyToClipboard}
              toneColor={Colors.urlTeal}
              toneBg={Colors.urlTealContainer}
            />
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
    borderRadius: Radii.lg,
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
    width: 44,
    height: 44,
    borderRadius: Radii.md,
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
    fontFamily: 'Inter_500Medium',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.lg,
    backgroundColor: Colors.surfaceContainerLow,
    flex: 1,
    minWidth: 120,
    minHeight: 44,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.primary,
    flexGrow: 2,
  },
  actionBtnLabel: {
    ...Typography.labelMd,
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.1,
    textTransform: 'none',
  },
  actionBtnLabelPrimary: {
    color: Colors.onPrimary,
  },
});
