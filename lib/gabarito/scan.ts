import { AlphaType, ColorType, Skia } from '@shopify/react-native-skia';
import { GabaritoLayout } from './layout';

const MARK_THRESHOLD = 170; // 0-255 gray level; below this is considered "filled in"
const MIN_SEPARATION = 20; // required gap to the second-darkest bubble to avoid ambiguous double-marks
export const AMBIGUOUS_RATIO_THRESHOLD = 0.4;

export type ScanAnswers = Record<number, string | undefined>;

function averageGray(pixels: Uint8Array | Float32Array | null): number {
  if (!pixels || pixels.length === 0) return 255;
  let sum = 0;
  for (let i = 0; i < pixels.length; i++) sum += pixels[i];
  return sum / pixels.length;
}

/**
 * Decodes a captured gabarito photo once and, for every bubble in `layout`, samples a small
 * grayscale window at its known (percentage-based) position to find the darkest (filled-in)
 * option per question. No perspective correction is applied — the capture screen relies on the
 * teacher visually aligning the sheet to an on-screen guide, so sample windows are kept generous.
 */
export async function analyzeGabarito(photoUri: string, layout: GabaritoLayout): Promise<ScanAnswers> {
  const data = await Skia.Data.fromURI(photoUri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new Error('Não foi possível processar a imagem capturada.');
  }

  const width = image.width();
  const height = image.height();
  const answers: ScanAnswers = {};

  for (const row of layout.rows) {
    let darkestOption: string | undefined;
    let darkestValue = Infinity;
    let secondDarkestValue = Infinity;

    for (const bubble of row.options) {
      const sampleSize = Math.max(6, Math.round(layout.bubbleRadiusPct * 2 * Math.min(width, height)));
      const x = Math.min(Math.max(0, Math.round(bubble.center.xPct * width - sampleSize / 2)), Math.max(0, width - sampleSize));
      const y = Math.min(Math.max(0, Math.round(bubble.center.yPct * height - sampleSize / 2)), Math.max(0, height - sampleSize));

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
