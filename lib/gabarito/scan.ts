import { AlphaType, ColorType, Skia, SkImage } from '@shopify/react-native-skia';
import { GabaritoLayout } from './layout';

const MARK_THRESHOLD = 200; // 0-255 gray level; absolute safety ceiling, the darkest option must still be reasonably dark
const MIN_SEPARATION = 20; // required absolute gap to the second-darkest bubble to avoid ambiguous double-marks
// The darkest option must be at least this fraction darker than the row's own *lightest* reading
// (not a fixed absolute value) before we call it marked. A faint print or a shadowed photo
// compresses every reading in a row into a narrow, uniformly darker band — comparing against a
// fixed threshold is unstable there (small per-shot noise flips which option "wins"), but
// comparing each option against what that same row's blank paper actually looked like in this
// photo adapts automatically to the real contrast available, whatever it is.
const RELATIVE_DROP_RATIO = 0.35;
const DARKEST_FRACTION = 0.15; // fraction of the sample window's darkest pixels averaged per bubble
const CORNER_MARK_THRESHOLD = 100; // corner squares are printed solid near-black, stricter than bubble marks
const MIN_CORNER_DARK_PIXELS = 10;
export const AMBIGUOUS_RATIO_THRESHOLD = 0.4;

export type ScanAnswers = Record<number, string | undefined>;
type PixelPoint = { x: number; y: number };

// TEMPORARY diagnostic data — remove once the pixel-reading pipeline is confirmed working
// end-to-end on a real device. Lets scan-result.tsx show raw numbers instead of guessing.
export type ScanDebugInfo = {
  imageWidth: number;
  imageHeight: number;
  sampleSize: number;
  corners: { topLeft: PixelPoint; topRight: PixelPoint; bottomLeft: PixelPoint; bottomRight: PixelPoint };
  rows: {
    question: number;
    readings: { option: string; value: number }[];
    darkestOption?: string;
    darkestValue: number;
    secondDarkestValue: number;
    lightestValue: number;
    isMarked: boolean;
  }[];
};

/**
 * Average of the darkest `DARKEST_FRACTION` of pixels in the window, instead of the plain mean.
 * A handwritten pen mark rarely fills a bubble solidly — it's a loose scribble with a lot of
 * white still showing through, which dilutes a plain mean into a middling gray indistinguishable
 * from an unmarked (or merely shadowed) bubble. But the ink stroke itself is genuinely dark
 * wherever it touches, so averaging just the darkest slice of pixels picks that up reliably,
 * while a uniformly-lit or uniformly-shadowed blank bubble stays close to its true brightness
 * (shadows darken evenly — they rarely produce truly near-black pixels the way ink does).
 */
function darkestFractionGray(pixels: Uint8Array | Float32Array | null): number {
  if (!pixels || pixels.length === 0) return 255;
  const sorted = Array.from(pixels).sort((a, b) => a - b);
  const count = Math.max(1, Math.round(sorted.length * DARKEST_FRACTION));
  let sum = 0;
  for (let i = 0; i < count; i++) sum += sorted[i];
  return sum / count;
}

/** Centroid of every below-threshold pixel within `region`, or null if too few were found. */
function centroidOfDarkPixels(
  image: SkImage,
  region: { x: number; y: number; width: number; height: number },
  minDarkPixels: number,
): { point: PixelPoint; count: number } | null {
  const regionX = Math.max(0, Math.round(region.x));
  const regionY = Math.max(0, Math.round(region.y));
  const regionWidth = Math.max(1, Math.round(region.width));
  const regionHeight = Math.max(1, Math.round(region.height));

  const pixels = image.readPixels(regionX, regionY, {
    width: regionWidth,
    height: regionHeight,
    colorType: ColorType.Gray_8,
    alphaType: AlphaType.Opaque,
  });
  if (!pixels) return null;

  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (let row = 0; row < regionHeight; row++) {
    const rowOffset = row * regionWidth;
    for (let col = 0; col < regionWidth; col++) {
      if (pixels[rowOffset + col] < CORNER_MARK_THRESHOLD) {
        sumX += col;
        sumY += row;
        count++;
      }
    }
  }

  if (count < minDarkPixels) return null;
  return { point: { x: regionX + sumX / count, y: regionY + sumY / count }, count };
}

/**
 * The captured photo's frame is not the sheet — there's always margin around it (desk, hands,
 * whatever's behind it), and its exact position/scale in the frame isn't guaranteed to match the
 * on-screen alignment guide. So instead of trusting screen-space geometry, we locate the actual
 * printed corner marks in the photo (each is a small solid dark square) and use their detected
 * pixel positions as the source of truth for where the sheet really is.
 *
 * A quadrant of the photo can easily contain other dark stuff besides the mark (a dark desk,
 * a shadow, the photo background) — if that region is bigger than the small printed square, a
 * plain centroid over the whole quadrant gets pulled toward it instead of the actual mark. So we
 * locate a rough centroid first, then refine by recomputing the centroid within a tight window
 * around it — small enough to exclude distant background, generous enough to still contain the
 * mark even if the rough pass was somewhat off.
 */
function findCornerMark(image: SkImage, region: { x: number; y: number; width: number; height: number }): PixelPoint | null {
  let current = centroidOfDarkPixels(image, region, MIN_CORNER_DARK_PIXELS);
  if (!current) return null;

  // Two refinement passes, each in a tighter window centered on the previous result — each pass
  // further reduces the chance that background/shadow bigger than the mark itself is still
  // pulling the centroid away from the true small square.
  let windowSize = Math.max(region.width, region.height);
  for (let pass = 0; pass < 2; pass++) {
    windowSize *= 0.15;
    const refined = centroidOfDarkPixels(
      image,
      {
        x: current.point.x - windowSize / 2,
        y: current.point.y - windowSize / 2,
        width: windowSize,
        height: windowSize,
      },
      MIN_CORNER_DARK_PIXELS,
    );
    if (!refined) break;
    current = refined;
  }

  return current.point;
}

/** Rescales `value` from the [min, max] range onto 0..1. */
function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

type Homography = { a: number; b: number; c: number; d: number; e: number; f: number; g: number; h: number };

/**
 * Computes the projective transform (homography) mapping the unit square — (0,0)=top-left,
 * (1,0)=top-right, (1,1)=bottom-right, (0,1)=bottom-left — onto the 4 detected corner pixels.
 * Unlike plain bilinear interpolation (which only blends linearly and drifts further off the
 * further a point is from the corners), this accounts for the actual perspective/rotation of the
 * photographed sheet — the classic "unit square to quad" mapping used by graphics engines for
 * poly-to-poly transforms. Computed once per photo, then reused for every bubble.
 */
function computeHomography(corners: { topLeft: PixelPoint; topRight: PixelPoint; bottomLeft: PixelPoint; bottomRight: PixelPoint }): Homography {
  const x0 = corners.topLeft.x, y0 = corners.topLeft.y;
  const x1 = corners.topRight.x, y1 = corners.topRight.y;
  const x2 = corners.bottomRight.x, y2 = corners.bottomRight.y;
  const x3 = corners.bottomLeft.x, y3 = corners.bottomLeft.y;

  const dx1 = x1 - x2, dy1 = y1 - y2;
  const dx2 = x3 - x2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;

  const denom = dx1 * dy2 - dy1 * dx2;
  const g = denom !== 0 ? (sx * dy2 - sy * dx2) / denom : 0;
  const h = denom !== 0 ? (dx1 * sy - dy1 * sx) / denom : 0;

  return {
    a: x1 - x0 + g * x1,
    b: x3 - x0 + h * x3,
    c: x0,
    d: y1 - y0 + g * y1,
    e: y3 - y0 + h * y3,
    f: y0,
    g,
    h,
  };
}

/** Maps a layout percentage (0..1, 0..1) to an actual photo pixel through the sheet's homography. */
function toPixel(homography: Homography, u: number, v: number): PixelPoint {
  const w = homography.g * u + homography.h * v + 1;
  return {
    x: (homography.a * u + homography.b * v + homography.c) / w,
    y: (homography.d * u + homography.e * v + homography.f) / w,
  };
}

/**
 * Decodes a captured gabarito photo once, locates its 4 printed corner marks, computes the
 * perspective transform (homography) from those corners, then for every bubble in `layout`
 * samples a small grayscale window at its true photographed position (mapped through that
 * homography, not raw photo percentages) to find the darkest (filled-in) option per question.
 * This tolerates the sheet being framed anywhere/any scale/rotation/perspective tilt within the
 * photo — the homography corrects for a tilted camera angle, unlike a simpler bilinear blend.
 */
export async function analyzeGabarito(photoUri: string, layout: GabaritoLayout): Promise<{ answers: ScanAnswers; debug: ScanDebugInfo }> {
  const data = await Skia.Data.fromURI(photoUri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new Error('Não foi possível processar a imagem capturada.');
  }

  const width = image.width();
  const height = image.height();

  // Each corner mark is searched for within its own quadrant of the photo — the on-screen guide
  // gets the sheet roughly centered/filling the frame, so this is a generous-but-bounded search.
  const topLeft = findCornerMark(image, { x: 0, y: 0, width: width * 0.5, height: height * 0.5 });
  const topRight = findCornerMark(image, { x: width * 0.5, y: 0, width: width * 0.5, height: height * 0.5 });
  const bottomLeft = findCornerMark(image, { x: 0, y: height * 0.5, width: width * 0.5, height: height * 0.5 });
  const bottomRight = findCornerMark(image, { x: width * 0.5, y: height * 0.5, width: width * 0.5, height: height * 0.5 });

  if (!topLeft || !topRight || !bottomLeft || !bottomRight) {
    throw new Error('Não foi possível localizar as marcas de canto do gabarito na foto.');
  }
  const corners = { topLeft, topRight, bottomLeft, bottomRight };

  // Use the detected top edge span as the sheet's effective on-photo width, to size sample
  // windows relative to the sheet's actual scale in this photo (not the raw photo dimensions).
  const sheetWidthPx = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
  // 1.5x the bubble's own diameter, not just the diameter — gives margin for small residual
  // position error (homography is only as good as the detected corners) and for handwritten
  // scribbles that aren't perfectly centered in the printed circle, without overlapping the
  // neighboring bubble (spaced much further apart than this window is wide).
  const sampleSize = Math.max(6, Math.round(layout.bubbleRadiusPct * 2 * 1.5 * sheetWidthPx));

  // The corner marks themselves sit inset from the sheet's true edges (layout.corners.*.xPct/yPct
  // are e.g. ~0.035/~0.965, not exactly 0/1) — every bubble percentage must be renormalized onto
  // that same [corner, corner] span before the bilinear lerp below, otherwise u=0.15 gets treated
  // as "15% of the way from one corner mark to the other" when it's really ~15% of the *whole
  // page*, which is a bit further along the corner-to-corner span — this was silently shifting
  // every sampled bubble off by a fraction of a column.
  const uMin = layout.corners.topLeft.xPct;
  const uMax = layout.corners.topRight.xPct;
  const vMin = layout.corners.topLeft.yPct;
  const vMax = layout.corners.bottomLeft.yPct;

  const homography = computeHomography(corners);

  const answers: ScanAnswers = {};
  const debugRows: ScanDebugInfo['rows'] = [];

  for (const row of layout.rows) {
    let darkestOption: string | undefined;
    let darkestValue = Infinity;
    let secondDarkestValue = Infinity;
    let lightestValue = -Infinity;
    const readings: { option: string; value: number }[] = [];

    for (const bubble of row.options) {
      const u = normalize(bubble.center.xPct, uMin, uMax);
      const v = normalize(bubble.center.yPct, vMin, vMax);
      const center = toPixel(homography, u, v);
      const x = Math.min(Math.max(0, Math.round(center.x - sampleSize / 2)), Math.max(0, width - sampleSize));
      const y = Math.min(Math.max(0, Math.round(center.y - sampleSize / 2)), Math.max(0, height - sampleSize));

      const pixels = image.readPixels(x, y, {
        width: sampleSize,
        height: sampleSize,
        colorType: ColorType.Gray_8,
        alphaType: AlphaType.Opaque,
      });
      const value = darkestFractionGray(pixels);
      readings.push({ option: bubble.option, value: Math.round(value) });

      if (value < darkestValue) {
        secondDarkestValue = darkestValue;
        darkestValue = value;
        darkestOption = bubble.option;
      } else if (value < secondDarkestValue) {
        secondDarkestValue = value;
      }
      if (value > lightestValue) {
        lightestValue = value;
      }
    }

    const isMarked =
      darkestValue < MARK_THRESHOLD &&
      secondDarkestValue - darkestValue >= MIN_SEPARATION &&
      darkestValue <= lightestValue * (1 - RELATIVE_DROP_RATIO);
    answers[row.question - 1] = isMarked ? darkestOption : undefined;
    debugRows.push({
      question: row.question,
      readings,
      darkestOption,
      darkestValue: Math.round(darkestValue),
      secondDarkestValue: Number.isFinite(secondDarkestValue) ? Math.round(secondDarkestValue) : -1,
      lightestValue: Math.round(lightestValue),
      isMarked,
    });
  }

  return {
    answers,
    debug: { imageWidth: width, imageHeight: height, sampleSize, corners, rows: debugRows },
  };
}

export function unansweredRatio(answers: ScanAnswers, questionCount: number): number {
  if (questionCount === 0) return 0;
  let unanswered = 0;
  for (let i = 0; i < questionCount; i++) {
    if (!answers[i]) unanswered++;
  }
  return unanswered / questionCount;
}

export function scoreAgainstAnswerKey(answers: ScanAnswers, answerKey: Record<number, string>, questionCount: number) {
  let correctCount = 0;
  for (let i = 0; i < questionCount; i++) {
    if (answers[i] && answers[i] === answerKey[i]) correctCount++;
  }
  const wrongCount = questionCount - correctCount;
  const scorePercent = questionCount === 0 ? 0 : Math.round((correctCount / questionCount) * 100);
  return { correctCount, wrongCount, scorePercent };
}
