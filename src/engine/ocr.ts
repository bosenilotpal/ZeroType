// ============================================================
// OCR Bridge — Camera → ML Kit Text Recognition
// ============================================================
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { Image, Platform } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

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

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

function scoreRecognizedText(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const digits = (trimmed.match(/\d/g) ?? []).length;
  const lines = trimmed.split(/\n+/).filter(Boolean).length;
  return trimmed.length + digits * 3 + lines * 2;
}

function toBlocks(text: string): OCRResult['blocks'] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ text: line }));
}

async function recognizeNativeOnce(imageUri: string): Promise<OCRResult> {
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

  const blockText = blocks.map((b) => b.text).join('\n').trim();
  const fullText = (result as { text?: string }).text?.trim() ?? '';
  const rawText = blockText || fullText;
  if (blocks.length === 0 && fullText) {
    return { rawText: fullText, blocks: toBlocks(fullText) };
  }
  return { rawText, blocks };
}

async function buildNativeOcrVariants(imageUri: string): Promise<string[]> {
  const variants = new Set<string>([imageUri]);
  try {
    const rotated90 = await manipulateAsync(
      imageUri,
      [{ rotate: 90 }],
      { compress: 1, format: SaveFormat.JPEG }
    );
    variants.add(rotated90.uri);

    const rotated270 = await manipulateAsync(
      imageUri,
      [{ rotate: 270 }],
      { compress: 1, format: SaveFormat.JPEG }
    );
    variants.add(rotated270.uri);
  } catch {
    // Rotation fallback is best-effort only.
  }

  try {
    const { width, height } = await getImageSize(imageUri);
    const crops = [
      // Right side (ads commonly keep contact details here)
      { originX: Math.floor(width * 0.55), originY: 0, width: Math.floor(width * 0.45), height },
      // Bottom-right quadrant (contact strips)
      { originX: Math.floor(width * 0.5), originY: Math.floor(height * 0.45), width: Math.floor(width * 0.5), height: Math.floor(height * 0.55) },
      // Bottom strip
      { originX: 0, originY: Math.floor(height * 0.7), width, height: Math.floor(height * 0.3) },
    ];

    for (const crop of crops) {
      if (crop.width < 40 || crop.height < 40) continue;
      const cropped = await manipulateAsync(
        imageUri,
        [{ crop }],
        { compress: 1, format: SaveFormat.JPEG }
      );
      variants.add(cropped.uri);

      // Upscale small text regions for better OCR readability.
      const upscaledWidth = Math.min(2400, Math.max(crop.width * 2, 1200));
      const upscaled = await manipulateAsync(
        cropped.uri,
        [{ resize: { width: upscaledWidth } }],
        { compress: 1, format: SaveFormat.JPEG }
      );
      variants.add(upscaled.uri);
    }
  } catch {
    // Crop fallback is best-effort only.
  }

  return [...variants];
}

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

    const variants = await buildNativeOcrVariants(imageUri);
    let best: OCRResult = { rawText: '', blocks: [] };
    let bestScore = 0;
    const mergedLines = new Set<string>();

    for (const uri of variants) {
      try {
        const attempt = await recognizeNativeOnce(uri);
        const score = scoreRecognizedText(attempt.rawText);
        if (attempt.rawText.trim()) {
          for (const line of attempt.rawText.split(/\n+/).map((line) => line.trim()).filter(Boolean)) {
            mergedLines.add(line);
          }
        }
        if (score > bestScore) {
          best = attempt;
          bestScore = score;
        }
      } catch {
        // Ignore a failed variant and continue with others.
      }
    }

    const mergedText = [...mergedLines].join('\n').trim();
    if (mergedText) {
      return { rawText: mergedText, blocks: toBlocks(mergedText) };
    }
    return best;
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
