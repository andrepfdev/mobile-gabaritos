import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import jpeg from 'jpeg-js';

/**
 * Ink-aware gray (matches native OpenCV path): min(R,G).
 * Blue ballpoint stays dark; BT.601 luminance washes blue toward paper white.
 */
function rgbaToGray(data: Uint8Array | Buffer, width: number, height: number): Uint8Array {
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const r = data[o];
    const g = data[o + 1];
    gray[i] = r < g ? r : g;
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
