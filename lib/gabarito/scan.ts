import { AlphaType, ColorType, Skia, SkImage } from '@shopify/react-native-skia';
import { GabaritoLayout } from './layout';

const MARK_THRESHOLD = 170; // 0-255 gray level; below this is considered "filled in"
const MIN_SEPARATION = 20; // required gap to the second-darkest bubble to avoid ambiguous double-marks
const CORNER_MARK_THRESHOLD = 100; // corner squares are printed solid near-black, stricter than bubble marks
const MIN_CORNER_DARK_PIXELS = 10;
export const AMBIGUOUS_RATIO_THRESHOLD = 0.4;

export type ScanAnswers = Record<number, string | undefined>;
type PixelPoint = { x: number; y: number };

function averageGray(pixels: Uint8Array | Float32Array | null): number {
  if (!pixels || pixels.length === 0) return 255;
  let sum = 0;
  for (let i = 0; i < pixels.length; i++) sum += pixels[i];
  return sum / pixels.length;
}

/**
 * The captured photo's frame is not the sheet — there's always margin around it (desk, hands,
 * whatever's behind it), and its exact position/scale in the frame isn't guaranteed to match the
 * on-screen alignment guide. So instead of trusting screen-space geometry, we locate the actual
 * printed corner marks in the photo (each is a small solid dark square) and use their detected
 * pixel positions as the source of truth for where the sheet really is.
 */
function findCornerMark(image: SkImage, region: { x: number; y: number; width: number; height: number }): PixelPoint | null {
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

  if (count < MIN_CORNER_DARK_PIXELS) return null;
  return { x: regionX + sumX / count, y: regionY + sumY / count };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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
export async function analyzeGabarito(photoUri: string, layout: GabaritoLayout): Promise<ScanAnswers> {
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

  const answers: ScanAnswers = {};

  for (const row of layout.rows) {
    let darkestOption: string | undefined;
    let darkestValue = Infinity;
    let secondDarkestValue = Infinity;

    for (const bubble of row.options) {
      const center = toPixel(corners, bubble.center.xPct, bubble.center.yPct);
      const x = Math.min(Math.max(0, Math.round(center.x - sampleSize / 2)), Math.max(0, width - sampleSize));
      const y = Math.min(Math.max(0, Math.round(center.y - sampleSize / 2)), Math.max(0, height - sampleSize));

      const pixels = image.readPixels(x, y, {
        width: sampleSize,
        height: sampleSize,
        colorType: ColorType.Gray_8,
        alphaType: AlphaType.Opaque,
      });
      const mean = averageGray(pixels);

      if (mean < darkestValue) {
        secondDarkestValue = darkestValue;
        darkestValue = mean;
        darkestOption = bubble.option;
      } else if (mean < secondDarkestValue) {
        secondDarkestValue = mean;
      }
    }

    const isMarked = darkestValue < MARK_THRESHOLD && secondDarkestValue - darkestValue >= MIN_SEPARATION;
    answers[row.question - 1] = isMarked ? darkestOption : undefined;
  }

  return answers;
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
