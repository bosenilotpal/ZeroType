import { Platform } from 'react-native';
import { Intent } from './parser';

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function normalizedPhoneForApps(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

export function buildTelLink(phoneValue: string): string {
  const normalized = normalizedPhoneForApps(phoneValue);
  return `tel:+${normalized}`;
}

export function buildWhatsAppLink(phoneValue: string): string {
  const normalized = normalizedPhoneForApps(phoneValue);
  return `https://wa.me/${normalized}`;
}

export function buildTelegramLink(phoneValue: string): string {
  const normalized = normalizedPhoneForApps(phoneValue);
  return `https://t.me/+${normalized}`;
}

export function buildMapsLink(addressValue: string): string {
  const query = encodeURIComponent(addressValue);
  if (Platform.OS === 'ios') return `maps:?q=${query}`;
  if (Platform.OS === 'android') return `geo:0,0?q=${query}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function buildGoogleMapsFallback(addressValue: string): string {
  const query = encodeURIComponent(addressValue);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function buildUpiPayLink(upiId: string, payeeName = 'ScanIntent'): string {
  return `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&cu=INR`;
}

export function buildIntentPrimaryLink(intent: Intent): string | null {
  switch (intent.type) {
    case 'phone':
      return buildTelLink(intent.value);
    case 'upi':
      return buildUpiPayLink(intent.value);
    case 'address':
      return buildMapsLink(intent.value);
    case 'email':
      return `mailto:${intent.value}`;
    case 'url':
      return intent.value;
    default:
      return null;
  }
}
