import { AlphaType, ColorType, Skia, SkImage } from '@shopify/react-native-skia';
import { GabaritoLayout } from './layout';

const MARK_THRESHOLD = 130; // 0-255 gray level; below this is considered "filled in" (darkest-15% metric, not mean)
const MIN_SEPARATION = 25; // required gap to the second-darkest bubble to avoid ambiguous double-marks
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
  const rough = centroidOfDarkPixels(image, region, MIN_CORNER_DARK_PIXELS);
  if (!rough) return null;

  const refineSize = Math.max(region.width, region.height) * 0.15;
  const refined = centroidOfDarkPixels(
    image,
    {
      x: rough.point.x - refineSize / 2,
      y: rough.point.y - refineSize / 2,
      width: refineSize,
      height: refineSize,
    },
    MIN_CORNER_DARK_PIXELS,
  );

  return (refined ?? rough).point;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Rescales `value` from the [min, max] range onto 0..1. */
function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

/** Maps a layout percentage (0..1, 0..1) to an actual photo pixel using the 4 detected corners. */
function toPixel(corners: { topLeft: PixelPoint; topRight: PixelPoint; bottomLeft: PixelPoint; bottomRight: PixelPoint }, u: number, v: number): PixelPoint {
  const topX = lerp(corners.topLeft.x, corners.topRight.x, u);
  const topY = lerp(corners.topLeft.y, corners.topRight.y, u);
  const bottomX = lerp(corners.bottomLeft.x, corners.bottomRight.x, u);
  const bottomY = lerp(corners.bottomLeft.y, corners.bottomRight.y, u);
  return { x: lerp(topX, bottomX, v), y: lerp(topY, bottomY, v) };
}

/**
 * Decodes a captured gabarito photo once, locates its 4 printed corner marks, then for every
 * bubble in `layout` samples a small grayscale window at its position (mapped through the
 * detected corners, not raw photo percentages) to find the darkest (filled-in) option per
 * question. This tolerates the sheet being framed anywhere/any scale within the photo and mild
 * rotation, without needing a full perspective/homography correction.
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
  const sampleSize = Math.max(6, Math.round(layout.bubbleRadiusPct * 2 * sheetWidthPx));

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

  const answers: ScanAnswers = {};
  const debugRows: ScanDebugInfo['rows'] = [];

  for (const row of layout.rows) {
    let darkestOption: string | undefined;
    let darkestValue = Infinity;
    let secondDarkestValue = Infinity;
    const readings: { option: string; value: number }[] = [];

    for (const bubble of row.options) {
      const u = normalize(bubble.center.xPct, uMin, uMax);
      const v = normalize(bubble.center.yPct, vMin, vMax);
      const center = toPixel(corners, u, v);
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
    }

    const isMarked = darkestValue < MARK_THRESHOLD && secondDarkestValue - darkestValue >= MIN_SEPARATION;
    answers[row.question - 1] = isMarked ? darkestOption : undefined;
    debugRows.push({
      question: row.question,
      readings,
      darkestOption,
      darkestValue: Math.round(darkestValue),
      secondDarkestValue: Number.isFinite(secondDarkestValue) ? Math.round(secondDarkestValue) : -1,
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
