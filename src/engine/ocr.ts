// ============================================================
// OCR Bridge — Camera → ML Kit Text Recognition
// ============================================================
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { Platform } from 'react-native';

export interface OCRResult {
  rawText: string;
  blocks: Array<{
    text: string;
    frame?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
}

let webWorkerPromise: Promise<any> | null = null;

async function initWebWorker() {
  const { createWorker } = await import('tesseract.js');
  const configs = [
    {
      // Primary: CDN-hosted assets with direct worker URL loading.
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@7/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@7',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      workerBlobURL: false,
      gzip: true,
      logger: () => {},
    },
    {
      // Fallback: use package defaults but avoid blob worker indirection.
      workerBlobURL: false,
      logger: () => {},
    },
    {
      // Last resort: library defaults.
      logger: () => {},
    },
  ];

  let lastError: unknown = null;
  for (const options of configs) {
    try {
      return await createWorker('eng', 1, options as any);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('Failed to initialize web OCR worker.');
}

async function getWebWorker() {
  if (!webWorkerPromise) {
    webWorkerPromise = initWebWorker();
  }
  try {
    return await webWorkerPromise;
  } catch (error) {
    webWorkerPromise = null;
    throw error;
  }
}

async function normalizeWebImageInput(imageUri: string): Promise<string | Blob> {
  // Tesseract.js is most reliable with Blob/data URLs across browser implementations.
  if (imageUri.startsWith('data:')) return imageUri;
  try {
    const res = await fetch(imageUri);
    const blob = await res.blob();
    return blob;
  } catch {
    return imageUri;
  }
}

/**
 * Runs on-device text recognition on a local image URI.
 * Uses @react-native-ml-kit/text-recognition (fully offline).
 */
export async function recognizeTextFromImage(imageUri: string): Promise<OCRResult> {
  try {
    if (Platform.OS === 'web') {
      const worker = await getWebWorker();
      const imageInput = await normalizeWebImageInput(imageUri);
      const result = await worker.recognize(imageInput);
      const rawText = (result?.data?.text ?? '').trim();

      const blocks = rawText
        ? rawText
            .split(/\n+/)
            .map((line: string) => line.trim())
            .filter(Boolean)
            .map((text: string) => ({ text }))
        : [];

      return { rawText, blocks };
    }

    const result = await TextRecognition.recognize(imageUri);

    const blocks =
      result.blocks?.map((block) => ({
        text: block.text ?? '',
        frame: block.frame
          ? {
              x: block.frame.left ?? 0,
              y: block.frame.top ?? 0,
              width: block.frame.width ?? 0,
              height: block.frame.height ?? 0,
            }
          : undefined,
      })) ?? [];

    const rawText = blocks.map((b) => b.text).join('\n');

    return { rawText, blocks };
  } catch (error) {
    console.error('[OCR] Recognition failed:', error);
    if (Platform.OS === 'web') {
      webWorkerPromise = null;
      const reason = (error as Error)?.message ?? 'Unknown web OCR error';
      throw new Error(
        `Web OCR failed (${reason}). Please check browser permissions, try a clearer image, and ensure internet access for first-time OCR model download.`
      );
    }
    throw new Error('Text recognition failed. Please try again with a clearer image.');
  }
}
