import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import jpeg from 'jpeg-js';

/**
 * BT.601 gray for JS ArUco / gate. Native Android warps a separate ink-aware
 * buffer (min R,G) for bubbles — do not use min(R,G) here (hurts marker decode).
 */
function rgbaToGray(data: Uint8Array | Buffer, width: number, height: number): Uint8Array {
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    gray[i] = Math.round(0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]);
  }
  return gray;
}

/**
 * Decodes a local photo to grayscale with top-left origin — no WebGL/readPixels.
 * Prefers reading file bytes directly (no second JPEG). Falls back to one lossless
 * re-encode if fetch(file://) is unavailable on the platform.
 */
export async function loadGrayImage(photoUri: string): Promise<{ gray: Uint8Array; width: number; height: number }> {
  try {
    const response = await fetch(photoUri);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      const decoded = jpeg.decode(Buffer.from(buffer), { useTArray: true, formatAsRGBA: true });
      return {
        gray: rgbaToGray(decoded.data, decoded.width, decoded.height),
        width: decoded.width,
        height: decoded.height,
      };
    }
  } catch {
    /* some runtimes reject file:// fetch — fall through */
  }

  const encoded = await manipulateAsync(photoUri, [], {
    compress: 1,
    format: SaveFormat.JPEG,
    base64: true,
  });
  if (!encoded.base64) {
    throw new Error('Não foi possível decodificar a foto (base64 vazio).');
  }
  const decoded = jpeg.decode(Buffer.from(encoded.base64, 'base64'), {
    useTArray: true,
    formatAsRGBA: true,
  });
  return {
    gray: rgbaToGray(decoded.data, decoded.width, decoded.height),
    width: decoded.width,
    height: decoded.height,
  };
}

export function flipGrayY(gray: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(gray.length);
  for (let y = 0; y < height; y++) {
    const src = y * width;
    const dst = (height - 1 - y) * width;
    out.set(gray.subarray(src, src + width), dst);
  }
  return out;
}

export function flipGrayX(gray: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(gray.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      out[row + x] = gray[row + (width - 1 - x)];
    }
  }
  return out;
}
