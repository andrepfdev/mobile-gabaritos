import { GabaritoLayout } from '../layout';
import { normalize } from './geometry';

export type ScanAnswers = Record<number, string | undefined>;

export type BubbleRowDebug = {
  question: number;
  readings: { option: string; fill: number; gray: number }[];
  chosen?: string;
  margin: number;
  zScore: number;
  isMarked: boolean;
};

/** Minimum fill advantage vs second place (absolute fill units 0..1). */
const MIN_FILL_MARGIN = 0.1;
/** Darkest option must beat row mean by this many stddevs (or soft floor when std is tiny). */
const MIN_Z_SCORE = 1.05;
const MAX_MARK_GRAY = 190;
/** Sample inside the bubble; avoid outline / neighbor ink. */
const SAMPLE_RADIUS_FACTOR = 0.62;
/** Local search radius as a fraction of bubble-to-bubble pitch. */
const REFINE_PITCH_FRACTION = 0.28;

function meanDarkest(values: number[], fraction: number): number {
  if (values.length === 0) return 255;
  const sorted = values.slice().sort((a, b) => a - b);
  const count = Math.max(1, Math.round(sorted.length * fraction));
  let sum = 0;
  for (let i = 0; i < count; i++) sum += sorted[i];
  return sum / count;
}

function sampleDiskMean(
  gray: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  darkestFraction: number,
): number {
  const r = Math.max(2, Math.round(radius));
  const values: number[] = [];
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(width - 1, Math.ceil(cx + r));
  const y1 = Math.min(height - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        values.push(gray[y * width + x]);
      }
    }
  }
  return meanDarkest(values, darkestFraction);
}

function sampleAnnulusMean(
  gray: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
): number {
  const values: number[] = [];
  const in2 = innerR * innerR;
  const out2 = outerR * outerR;
  const x0 = Math.max(0, Math.floor(cx - outerR));
  const y0 = Math.max(0, Math.floor(cy - outerR));
  const x1 = Math.min(width - 1, Math.ceil(cx + outerR));
  const y1 = Math.min(height - 1, Math.ceil(cy + outerR));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d2 > in2 && d2 <= out2) values.push(gray[y * width + x]);
    }
  }
  if (values.length === 0) return 245;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/**
 * Ink score: how much darker the bubble interior is vs local paper around it.
 * Corrects small alignment error by searching near the expected center.
 */
function scoreBubble(
  gray: Uint8Array,
  width: number,
  height: number,
  cx0: number,
  cy0: number,
  radius: number,
  searchRadius: number,
): { fill: number; gray: number } {
  const step = Math.max(2, Math.round(searchRadius / 3));
  let bestFill = -Infinity;
  let bestGray = 255;

  for (let dy = -searchRadius; dy <= searchRadius; dy += step) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += step) {
      if (dx * dx + dy * dy > searchRadius * searchRadius) continue;
      const cx = cx0 + dx;
      const cy = cy0 + dy;
      const inner = sampleDiskMean(gray, width, height, cx, cy, radius, 0.35);
      const paper = sampleAnnulusMean(gray, width, height, cx, cy, radius * 1.15, radius * 1.75);
      // Positive when interior is darker than surrounding paper.
      const contrast = (paper - inner) / 255;
      const fill = Math.max(0, Math.min(1, contrast));
      if (fill > bestFill) {
        bestFill = fill;
        bestGray = inner;
      }
    }
  }

  if (!Number.isFinite(bestFill) || bestFill < 0) {
    return { fill: 0, gray: 255 };
  }
  return { fill: bestFill, gray: bestGray };
}

/**
 * Reads bubbles on a *canonical* (warped) sheet image whose corner marks sit at the image corners.
 * Layout percentages are normalized onto the corner-to-corner span, then sampled with local
 * contrast (interior vs annulus) and a small positional refine so modest homography error
 * does not steal the mark from a neighbor.
 */
export function readBubblesOnCanonical(
  gray: Uint8Array,
  width: number,
  height: number,
  layout: GabaritoLayout,
): { answers: ScanAnswers; rows: BubbleRowDebug[] } {
  const uMin = layout.corners.topLeft.xPct;
  const uMax = layout.corners.topRight.xPct;
  const vMin = layout.corners.topLeft.yPct;
  const vMax = layout.corners.bottomLeft.yPct;
  const radius = layout.bubbleRadiusPct * width * SAMPLE_RADIUS_FACTOR;
  // Pitch ≈ diameter * 2.2; diameter = 2 * bubbleRadiusPct * width.
  const pitch = layout.bubbleRadiusPct * 2 * 2.2 * width;
  const searchRadius = pitch * REFINE_PITCH_FRACTION;

  const answers: ScanAnswers = {};
  const rows: BubbleRowDebug[] = [];

  for (const row of layout.rows) {
    const fills: number[] = [];
    const grays: number[] = [];
    const readings: BubbleRowDebug['readings'] = [];

    for (const bubble of row.options) {
      const u = normalize(bubble.center.xPct, uMin, uMax);
      const v = normalize(bubble.center.yPct, vMin, vMax);
      const cx = u * (width - 1);
      const cy = v * (height - 1);
      const { fill, gray: grayValue } = scoreBubble(gray, width, height, cx, cy, radius, searchRadius);
      fills.push(fill);
      grays.push(grayValue);
      readings.push({ option: bubble.option, fill: Number(fill.toFixed(3)), gray: Math.round(grayValue) });
    }

    const mean = fills.reduce((a, b) => a + b, 0) / fills.length;
    const variance = fills.reduce((a, b) => a + (b - mean) * (b - mean), 0) / fills.length;
    const std = Math.sqrt(variance);

    let bestIdx = 0;
    for (let i = 1; i < fills.length; i++) {
      if (fills[i] > fills[bestIdx]) bestIdx = i;
    }
    let second = -Infinity;
    for (let i = 0; i < fills.length; i++) {
      if (i === bestIdx) continue;
      if (fills[i] > second) second = fills[i];
    }
    if (!Number.isFinite(second)) second = 0;

    const margin = fills[bestIdx] - second;
    const zScore = std > 0.02 ? (fills[bestIdx] - mean) / std : fills[bestIdx] - mean > 0.12 ? 3 : 0;
    const isMarked =
      grays[bestIdx] <= MAX_MARK_GRAY &&
      margin >= MIN_FILL_MARGIN &&
      zScore >= MIN_Z_SCORE &&
      fills[bestIdx] >= 0.12;

    const chosen = isMarked ? row.options[bestIdx].option : undefined;
    answers[row.question - 1] = chosen;
    rows.push({
      question: row.question,
      readings,
      chosen,
      margin: Number(margin.toFixed(3)),
      zScore: Number(zScore.toFixed(2)),
      isMarked,
    });
  }

  return { answers, rows };
}

export function unansweredRatio(answers: ScanAnswers, questionCount: number): number {
  if (questionCount === 0) return 0;
  let unanswered = 0;
  for (let i = 0; i < questionCount; i++) {
    if (!answers[i]) unanswered++;
  }
  return unanswered / questionCount;
}

export function scoreAgainstAnswerKey(
  answers: ScanAnswers,
  answerKey: Record<number, string>,
  questionCount: number,
) {
  let correctCount = 0;
  for (let i = 0; i < questionCount; i++) {
    if (answers[i] && answers[i] === answerKey[i]) correctCount++;
  }
  const wrongCount = questionCount - correctCount;
  const scorePercent = questionCount === 0 ? 0 : Math.round((correctCount / questionCount) * 100);
  return { correctCount, wrongCount, scorePercent };
}
