import { Image } from 'react-native';
import { GLView } from 'expo-gl';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import { GabaritoLayout } from './layout';
import { findCornerMarks } from './omr/corners';
import {
  BubbleRowDebug,
  ScanAnswers,
  readBubblesOnCanonical,
  scoreAgainstAnswerKey,
  unansweredRatio,
} from './omr/bubbles';
import { CornerQuad, warpToCanonical } from './omr/geometry';

export { unansweredRatio, scoreAgainstAnswerKey };
export type { ScanAnswers };
export const AMBIGUOUS_RATIO_THRESHOLD = 0.35;

const CANONICAL_WIDTH = 1000;

export class GabaritoScanError extends Error {
  imageWidth?: number;
  imageHeight?: number;
  corners?: Partial<CornerQuad>;

  constructor(
    message: string,
    info?: { imageWidth: number; imageHeight: number; corners: GabaritoScanError['corners'] },
  ) {
    super(message);
    this.name = 'GabaritoScanError';
    this.imageWidth = info?.imageWidth;
    this.imageHeight = info?.imageHeight;
    this.corners = info?.corners;
  }
}

export type ScanDebugInfo = {
  imageWidth: number;
  imageHeight: number;
  canonicalWidth: number;
  canonicalHeight: number;
  sampleSize: number;
  corners: CornerQuad;
  rows: BubbleRowDebug[];
};

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });
}

function readGrayPixels(
  gl: ExpoWebGLRenderingContext,
  x: number,
  y: number,
  w: number,
  h: number,
): Uint8Array {
  const rgba = new Uint8Array(w * h * 4);
  gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return gray;
}

async function loadGrayImage(photoUri: string): Promise<{ gray: Uint8Array; width: number; height: number }> {
  const { width, height } = await getImageSize(photoUri);
  const gl = await GLView.createContextAsync();
  const texture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();

  try {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    (gl.texImage2D as (...args: unknown[]) => void)(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, {
      localUri: photoUri,
    });

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, width, height);

    const gray = readGrayPixels(gl, 0, 0, width, height);
    return { gray, width, height };
  } finally {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(framebuffer);
    gl.deleteTexture(texture);
    await GLView.destroyContextAsync(gl);
  }
}

/**
 * Canonical OMR pipeline:
 * 1) load grayscale photo
 * 2) find 4 fiducial squares/ArUco boxes by shape
 * 3) warp to a flat canonical sheet
 * 4) sample bubbles at layout ROIs with relative (z-score) classification
 */
export async function analyzeGabarito(
  photoUri: string,
  layout: GabaritoLayout,
): Promise<{ answers: ScanAnswers; debug: ScanDebugInfo }> {
  const { gray, width, height } = await loadGrayImage(photoUri);

  const corners = findCornerMarks(gray, width, height);
  if (!corners) {
    throw new GabaritoScanError(
      'Não foi possível localizar as 4 marcas de canto. Enquadre a folha inteira, com boa luz e sem objetos escuros atrás.',
      { imageWidth: width, imageHeight: height, corners: undefined },
    );
  }

  const canonicalHeight = Math.max(200, Math.round(CANONICAL_WIDTH / layout.aspectRatio));
  const canonical = warpToCanonical(gray, width, height, corners, CANONICAL_WIDTH, canonicalHeight);
  const { answers, rows } = readBubblesOnCanonical(canonical, CANONICAL_WIDTH, canonicalHeight, layout);

  const sampleSize = Math.max(6, Math.round(layout.bubbleRadiusPct * 2 * 1.5 * CANONICAL_WIDTH));

  return {
    answers,
    debug: {
      imageWidth: width,
      imageHeight: height,
      canonicalWidth: CANONICAL_WIDTH,
      canonicalHeight,
      sampleSize,
      corners,
      rows,
    },
  };
}
