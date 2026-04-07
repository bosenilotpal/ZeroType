// ============================================================
// useOCR — Camera Capture → OCR State Machine Hook
// States: idle → capturing → analyzing → results | error
// ============================================================
import { useState, useCallback, useRef } from 'react';
import { CameraView } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { recognizeTextFromImage } from '../engine/ocr';
import { parseIntents, Intent } from '../engine/parser';

export type OCRStatus = 'idle' | 'capturing' | 'analyzing' | 'results' | 'error';

export interface OCRState {
  status: OCRStatus;
  capturedImageUri: string | null;
  rawText: string | null;
  intents: Intent[];
  error: string | null;
}

export function useOCR() {
  const cameraRef = useRef<CameraView>(null);

  const [state, setState] = useState<OCRState>({
    status: 'idle',
    capturedImageUri: null,
    rawText: null,
    intents: [],
    error: null,
  });

  const capture = useCallback(async () => {
    if (!cameraRef.current || state.status === 'capturing' || state.status === 'analyzing' || state.status === 'results') return;

    try {
      // 1. Freeze frame — capturing
      setState((s) => ({ ...s, status: 'capturing' }));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
        skipProcessing: false,
      });

      if (!photo?.uri) throw new Error('Failed to capture image.');

      // 2. Run OCR
      setState((s) => ({ ...s, status: 'analyzing', capturedImageUri: photo.uri }));

      const { rawText } = await recognizeTextFromImage(photo.uri);

      // 3. Parse intents
      const intents = parseIntents(rawText);

      // 4. Haptic feedback on detection
      if (intents.length > 0) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }

      setState({
        status: 'results',
        capturedImageUri: photo.uri,
        rawText,
        intents,
        error: null,
      });
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setState((s) => ({
        ...s,
        status: 'error',
        error: err?.message ?? 'An unexpected error occurred.',
      }));
    }
  }, [state.status]);

  const captureFromUri = useCallback(async (uri: string) => {
    try {
      setState((s) => ({ ...s, status: 'analyzing', capturedImageUri: uri }));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const { rawText } = await recognizeTextFromImage(uri);
      const intents = parseIntents(rawText);

      if (intents.length > 0) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setState({
        status: 'results',
        capturedImageUri: uri,
        rawText,
        intents,
        error: null,
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        status: 'error',
        error: err?.message ?? 'Recognition failed.',
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', capturedImageUri: null, rawText: null, intents: [], error: null });
  }, []);

  return { state, cameraRef, capture, captureFromUri, reset };
}
