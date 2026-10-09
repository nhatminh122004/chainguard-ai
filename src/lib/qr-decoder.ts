/**
 * Browser QR decoder — ChainGuard AI
 * Uses the native BarcodeDetector when available (Chrome/Edge on Android, macOS),
 * otherwise falls back to jsQR (pure JS, works everywhere).
 */

import jsQR from 'jsqr';

interface NativeBarcode {
  rawValue: string;
}
interface NativeBarcodeDetector {
  detect(source: CanvasImageSource | ImageData): Promise<NativeBarcode[]>;
}
type BarcodeDetectorCtor = {
  new (opts?: { formats?: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
};

let nativeDetectorPromise: Promise<NativeBarcodeDetector | null> | null = null;

function getNativeDetector(): Promise<NativeBarcodeDetector | null> {
  if (nativeDetectorPromise) return nativeDetectorPromise;
  nativeDetectorPromise = (async () => {
    if (typeof window === 'undefined') return null;
    const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Ctor) return null;
    try {
      const formats = (await Ctor.getSupportedFormats?.()) || [];
      if (!formats.includes('qr_code')) return null;
      return new Ctor({ formats: ['qr_code'] });
    } catch {
      return null;
    }
  })();
  return nativeDetectorPromise;
}

export async function getDecoderEngineName(): Promise<'BarcodeDetector' | 'jsQR'> {
  return (await getNativeDetector()) ? 'BarcodeDetector' : 'jsQR';
}

/**
 * Decode a QR code from a canvas that already contains the frame.
 * Returns the raw payload string or null.
 */
export async function decodeQrFromCanvas(canvas: HTMLCanvasElement): Promise<string | null> {
  const native = await getNativeDetector();
  if (native) {
    try {
      const codes = await native.detect(canvas);
      if (codes.length > 0 && codes[0].rawValue) return codes[0].rawValue;
      return null;
    } catch {
      // fall through to jsQR
    }
  }
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'attemptBoth' });
  return code?.data || null;
}

/**
 * Decode a QR code from an image data URL (uploaded file, preset, captured photo).
 * Large images are downscaled to keep jsQR fast.
 */
export async function decodeQrFromDataUrl(dataUrl: string, maxSide = 1200): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const img = await loadImage(dataUrl);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return decodeQrFromCanvas(canvas);
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Không tải được ảnh'));
    img.src = src;
  });
}
