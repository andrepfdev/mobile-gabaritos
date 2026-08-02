import { GabaritoLayout } from './layout';
import { findCornerMarksScored } from './omr/corners';
import {
  BubbleRowDebug,
  ScanAnswers,
  readBubblesOnCanonical,
  unansweredRatio,
  scoreAgainstAnswerKey,
} from './omr/bubbles';
import { CornerQuad, warpToCanonical } from './omr/geometry';
import { flipGrayX, flipGrayY, loadGrayImage } from './omr/loadGray';
import {
  detectAndWarpNativeOmr,
  isNativeArucoAvailable,
  NativeArucoMotor,
  NativeOmrError,
} from './omr/nativeAruco';

export { unansweredRatio, scoreAgainstAnswerKey };
export type { ScanAnswers };
/** Fraction of blank answers at/above which UI asks for rescan (~10%). */
export const AMBIGUOUS_RATIO_THRESHOLD = 0.1;

const CANONICAL_WIDTH = 1000;
const FLIP_MODES: ScanFlipMode[] = ['none', 'x', 'y', 'xy'];

export class GabaritoScanError extends Error {
  imageWidth?: number;
  imageHeight?: number;
  corners?: Partial<CornerQuad>;
  motor?: NativeArucoMotor;
  code?: string;
  markersFound?: number[];

  constructor(
    message: string,
    info?: {
      imageWidth?: number;
      imageHeight?: number;
      corners?: GabaritoScanError['corners'];
      motor?: NativeArucoMotor;
      code?: string;
      markersFound?: number[];
    },
  ) {
    super(message);
    this.name = 'GabaritoScanError';
    this.imageWidth = info?.imageWidth;
    this.imageHeight = info?.imageHeight;
    this.corners = info?.corners;
    this.motor = info?.motor;
    this.code = info?.code;
    this.markersFound = info?.markersFound;
  }
}

export type ScanFlipMode = 'none' | 'x' | 'y' | 'xy';

export type ScanDebugInfo = {
  imageWidth: number;
  imageHeight: number;
  canonicalWidth: number;
  canonicalHeight: number;
  sampleSize: number;
  corners: CornerQuad;
  rows: BubbleRowDebug[];
  /** @deprecated use flipMode */
  flippedY: boolean;
  flipMode: ScanFlipMode;
  motor: NativeArucoMotor;
  arucoIds: number[];
  arucoScore: number;
};

type PipelineHit = {
  answers: ScanAnswers;
  rows: BubbleRowDebug[];
  corners: CornerQuad;
  canonicalHeight: number;
  imageWidth: number;
  imageHeight: number;
  flipMode: ScanFlipMode;
  arucoScore: number;
  arucoIds: number[];
  motor: NativeArucoMotor;
};

function applyFlip(gray: Uint8Array, width: number, height: number, flipMode: ScanFlipMode): Uint8Array {
  if (flipMode === 'none') return gray;
  if (flipMode === 'x') return flipGrayX(gray, width, height);
  if (flipMode === 'y') return flipGrayY(gray, width, height);
  return flipGrayY(flipGrayX(gray, width, height), width, height);
}

/** Approximate CLAHE: stretch luminance using p5–p95 (JS fallback path only). */
function equalizeGrayRough(gray: Uint8Array): Uint8Array {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  const pLo = total * 0.05;
  const pHi = total * 0.95;
  for (let i = 0; i < 256; i++) {
    acc += hist[i];
    if (acc >= pLo && lo === 0) lo = i;
    if (acc >= pHi) {
      hi = i;
      break;
    }
  }
  const span = Math.max(1, hi - lo);
  const out = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) {
    out[i] = Math.max(0, Math.min(255, Math.round(((gray[i] - lo) * 255) / span)));
  }
  return out;
}

async function analyzeWithOpenCv(photoUri: string, layout: GabaritoLayout): Promise<PipelineHit> {
  const canonicalHeight = Math.max(200, Math.round(CANONICAL_WIDTH / layout.aspectRatio));
  const hit = await detectAndWarpNativeOmr(photoUri, CANONICAL_WIDTH, canonicalHeight, layout.corners);

  const { answers, rows } = readBubblesOnCanonical(
    hit.warpedGray,
    hit.warpedWidth,
    hit.warpedHeight,
    layout,
  );

  return {
    answers,
    rows,
    corners: hit.corners,
    canonicalHeight: hit.warpedHeight,
    imageWidth: hit.detectWidth,
    imageHeight: hit.detectHeight,
    flipMode: hit.flipMode,
    arucoScore: hit.score,
    arucoIds: hit.ids,
    motor: 'OpenCV-ArUco',
  };
}

function analyzeWithJsAruco(
  gray: Uint8Array,
  width: number,
  height: number,
  layout: GabaritoLayout,
): PipelineHit | null {
  let best: PipelineHit | null = null;
  const canonicalHeight = Math.max(200, Math.round(CANONICAL_WIDTH / layout.aspectRatio));

  for (const flipMode of FLIP_MODES) {
    const flipped = applyFlip(gray, width, height, flipMode);
    const found = findCornerMarksScored(flipped, width, height);
    if (!found) continue;

    const canonical = warpToCanonical(
      flipped,
      width,
      height,
      found.corners,
      CANONICAL_WIDTH,
      canonicalHeight,
      layout.corners,
    );
    // Cheap illumination flatten (native path uses OpenCV CLAHE on the warped Mat).
    const normalized = equalizeGrayRough(canonical);
    const { answers, rows } = readBubblesOnCanonical(
      normalized,
      CANONICAL_WIDTH,
      canonicalHeight,
      layout,
    );
    const pipeline: PipelineHit = {
      answers,
      rows,
      corners: found.corners,
      canonicalHeight,
      imageWidth: width,
      imageHeight: height,
      flipMode,
      arucoScore: found.score,
      arucoIds: found.ids,
      motor: 'JS-ArUco',
    };
    if (!best || pipeline.arucoScore > best.arucoScore) best = pipeline;
  }

  return best;
}

/**
 * Canonical OMR pipeline:
 * 1) Android+OpenCV: native detect (CLAHE/SUBPIX) + warpPerspective → bubbles on same buffer
 * 2) Else (web/sim): JS ArUco 4/4 + JS warp
 * 3) Flip chosen by ArUco quality; missing 4/4 → explicit typed rescan error
 */
export async function analyzeGabarito(
  photoUri: string,
  layout: GabaritoLayout,
): Promise<{ answers: ScanAnswers; debug: ScanDebugInfo }> {
  const preferNative = isNativeArucoAvailable();

  let best: PipelineHit | null = null;

  if (preferNative) {
    try {
      best = await analyzeWithOpenCv(photoUri, layout);
    } catch (error) {
      if (error instanceof NativeOmrError) {
        throw new GabaritoScanError(
          error.code === 'incomplete_markers'
            ? `${error.message} Reenquadre a grade com as marcas nos cantos, boa luz e sem reflexo — e escaneie de novo.`
            : error.message,
          {
            imageWidth: error.imageWidth,
            imageHeight: error.imageHeight,
            corners: undefined,
            motor: 'OpenCV-ArUco',
            code: error.code,
            markersFound: error.markersFound,
          },
        );
      }
      throw new GabaritoScanError(
        error instanceof Error ? error.message : 'Falha desconhecida no OpenCV.',
        { motor: 'OpenCV-ArUco', code: 'native_throw' },
      );
    }
  } else {
    const { gray, width, height } = await loadGrayImage(photoUri);
    best = analyzeWithJsAruco(gray, width, height, layout);
    if (!best) {
      throw new GabaritoScanError(
        'Não foi possível localizar as 4 marcas ArUco de canto. Enquadre a folha inteira, com boa luz e sem objetos escuros atrás.',
        { imageWidth: width, imageHeight: height, corners: undefined, motor: 'JS-ArUco', code: 'incomplete_markers' },
      );
    }
  }

  if (!best) {
    throw new GabaritoScanError('Falha na leitura do gabarito.', { motor: preferNative ? 'OpenCV-ArUco' : 'JS-ArUco' });
  }

  const sampleSize = Math.max(6, Math.round(layout.bubbleRadiusPct * 2 * 1.5 * CANONICAL_WIDTH));

  return {
    answers: best.answers,
    debug: {
      imageWidth: best.imageWidth,
      imageHeight: best.imageHeight,
      canonicalWidth: CANONICAL_WIDTH,
      canonicalHeight: best.canonicalHeight,
      sampleSize,
      corners: best.corners,
      rows: best.rows,
      flippedY: best.flipMode === 'y' || best.flipMode === 'xy',
      flipMode: best.flipMode,
      motor: best.motor,
      arucoIds: best.arucoIds,
      arucoScore: best.arucoScore,
    },
  };
}
