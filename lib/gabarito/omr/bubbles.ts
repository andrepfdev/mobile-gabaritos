import { GabaritoLayout } from '../layout';

export type ScanAnswers = Record<number, string | undefined>;

export type BubbleRowDebug = {
  question: number;
  readings: { option: string; fill: number; gray: number }[];
  chosen?: string;
  margin: number;
  zScore: number;
  isMarked: boolean;
};

/**
 * Phone OMR tuned for real student marks (priority A — accept light/partial):
 * - blue or black pen (ink-aware gray upstream)
 * - partial human fill (core darkness + soft density)
 * - empty calibrated from the sheet
 * - two strong marks → blank (void)
 */
const MIN_FILL_MARGIN = 0.055;
const MIN_Z_SCORE = 0.55;
const MAX_MARK_GRAY = 225;
/** Soft absolute floor — light blue / ~half-filled still clears this. */
const MIN_OMR_RATIO = 0.12;
const DOUBLE_MARK_RATIO = 0.32;
const SAMPLE_RADIUS_FACTOR = 0.55;
const REFINE_PITCH_FRACTION = 0.12;
/** Darkest fraction of the disk — catches scribble / incomplete fill. */
const CORE_FRACTION = 0.35;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

function sampleDiskValues(
  gray: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
): number[] {
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
      if (dx * dx + dy * dy <= r2) values.push(gray[y * width + x]);
    }
  }
  return values;
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
  return mean(values);
}

/**
 * Mark score: soft OMR density + core (darkest pixels) so partial / light ink still wins.
 */
function scoreBubble(
  gray: Uint8Array,
  width: number,
  height: number,
  cx0: number,
  cy0: number,
  radius: number,
  searchRadius: number,
): { fill: number; gray: number; omrRatio: number } {
  const step = Math.max(2, Math.round(searchRadius / 3));
  let bestFill = -Infinity;
  let bestGray = 255;
  let bestOmr = 0;

  for (let dy = -searchRadius; dy <= searchRadius; dy += step) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += step) {
      if (dx * dx + dy * dy > searchRadius * searchRadius) continue;
      const cx = cx0 + dx;
      const cy = cy0 + dy;
      const disk = sampleDiskValues(gray, width, height, cx, cy, radius);
      if (disk.length < 8) continue;

      const paper = sampleAnnulusMean(gray, width, height, cx, cy, radius * 1.15, radius * 1.9);
      // Softer vs paper: light blue after CLAHE may sit only ~18–30 levels below paper.
      const thr = Math.min(210, Math.max(100, paper - 18));
      let dark = 0;
      let sum = 0;
      for (const v of disk) {
        sum += v;
        if (v < thr) dark++;
      }
      const omrRatio = dark / disk.length;
      const sorted = disk.slice().sort((a, b) => a - b);
      const coreN = Math.max(1, Math.round(sorted.length * CORE_FRACTION));
      let coreSum = 0;
      for (let i = 0; i < coreN; i++) coreSum += sorted[i];
      const core = coreSum / coreN;
      const inner = sum / disk.length;
      const coreDark = (255 - core) / 255;
      const darkness = (255 - inner) / 255;
      const contrast = Math.max(0, (paper - core) / 255);
      const softDensity = Math.max(0, Math.min(1, (paper - core) / 55));
      // Core + soft density help light/partial ink; omrRatio stays pure dark-pixel density
      // (never inflate with softDensity — that falsely triggers double-mark voids).
      const fill = Math.max(
        0,
        Math.min(1, 0.32 * omrRatio + 0.28 * coreDark + 0.22 * contrast + 0.18 * softDensity),
      );
      if (fill > bestFill) {
        bestFill = fill;
        bestGray = core;
        bestOmr = omrRatio;
      }
    }
  }

  if (!Number.isFinite(bestFill) || bestFill < 0) {
    return { fill: 0, gray: 255, omrRatio: 0 };
  }
  return { fill: bestFill, gray: bestGray, omrRatio: bestOmr };
}

/**
 * Reads bubbles on a canonical sheet (post-warp, ideally CLAHE + ink-aware gray).
 */
export function readBubblesOnCanonical(
  gray: Uint8Array,
  width: number,
  height: number,
  layout: GabaritoLayout,
): { answers: ScanAnswers; rows: BubbleRowDebug[] } {
  const radius = layout.bubbleRadiusPct * width * SAMPLE_RADIUS_FACTOR;
  const pitch = layout.bubbleRadiusPct * 2 * 2.2 * width;
  const searchRadius = pitch * REFINE_PITCH_FRACTION;

  type RowScore = {
    question: number;
    options: GabaritoLayout['rows'][0]['options'];
    fills: number[];
    omrRatios: number[];
    grays: number[];
    readings: BubbleRowDebug['readings'];
  };

  const scored: RowScore[] = [];
  const allFills: number[] = [];
  const allOmr: number[] = [];

  for (const row of layout.rows) {
    const fills: number[] = [];
    const omrRatios: number[] = [];
    const grays: number[] = [];
    const readings: BubbleRowDebug['readings'] = [];

    for (const bubble of row.options) {
      const cx = bubble.center.xPct * (width - 1);
      const cy = bubble.center.yPct * (height - 1);
      const { fill, gray: grayValue, omrRatio } = scoreBubble(
        gray,
        width,
        height,
        cx,
        cy,
        radius,
        searchRadius,
      );
      fills.push(fill);
      omrRatios.push(omrRatio);
      grays.push(grayValue);
      allFills.push(fill);
      allOmr.push(omrRatio);
      readings.push({ option: bubble.option, fill: Number(fill.toFixed(3)), gray: Math.round(grayValue) });
    }
    scored.push({ question: row.question, options: row.options, fills, omrRatios, grays, readings });
  }

  const sortedOmr = allOmr.slice().sort((a, b) => a - b);
  const emptyP90 = percentile(sortedOmr, 0.9);
  const sortedFills = allFills.slice().sort((a, b) => a - b);
  const fillP50 = percentile(sortedFills, 0.5);
  const fillP85 = percentile(sortedFills, 0.85);

  // Adaptive floors: sheet with light pens lowers the bar; still above empty baseline.
  const markOmr = Math.max(MIN_OMR_RATIO, Math.min(0.22, emptyP90 + 0.07));
  const minMarkFill = Math.max(0.08, Math.min(0.2, fillP50 + 0.04));
  const softFillFloor = Math.max(0.1, fillP85 * 0.55);
  const minMargin = MIN_FILL_MARGIN;

  const answers: ScanAnswers = {};
  const rows: BubbleRowDebug[] = [];

  for (const row of scored) {
    const { fills, omrRatios, grays, readings, options } = row;
    const meanFill = mean(fills);
    const variance = fills.reduce((a, b) => a + (b - meanFill) * (b - meanFill), 0) / fills.length;
    const std = Math.sqrt(variance);

    let bestIdx = 0;
    for (let i = 1; i < fills.length; i++) {
      if (fills[i] > fills[bestIdx]) bestIdx = i;
    }
    let second = -Infinity;
    let secondIdx = -1;
    for (let i = 0; i < fills.length; i++) {
      if (i === bestIdx) continue;
      if (fills[i] > second) {
        second = fills[i];
        secondIdx = i;
      }
    }
    if (!Number.isFinite(second)) second = 0;

    const margin = fills[bestIdx] - second;
    const zScore = std > 0.012 ? (fills[bestIdx] - meanFill) / std : fills[bestIdx] - meanFill > 0.08 ? 3 : 0;

    // Void only when two real competitors are close — never void a clear winner.
    const doubleMark =
      secondIdx >= 0 &&
      margin < 0.12 &&
      fills[secondIdx] >= Math.max(minMarkFill, fills[bestIdx] * 0.7) &&
      omrRatios[secondIdx] >= DOUBLE_MARK_RATIO;

    // Priority A: strong relative winner can pass with softer absolute density (light/partial ink).
    const solidMark =
      omrRatios[bestIdx] >= markOmr && fills[bestIdx] >= minMarkFill && margin >= minMargin && zScore >= MIN_Z_SCORE;
    const softMark =
      fills[bestIdx] >= softFillFloor &&
      margin >= minMargin * 1.15 &&
      zScore >= MIN_Z_SCORE + 0.15 &&
      grays[bestIdx] <= MAX_MARK_GRAY &&
      (omrRatios[bestIdx] >= MIN_OMR_RATIO * 0.65 || fills[bestIdx] >= softFillFloor * 1.05);

    const isMarked = !doubleMark && grays[bestIdx] <= MAX_MARK_GRAY && (solidMark || softMark);

    const chosen = isMarked ? options[bestIdx].option : undefined;
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
  let wrongCount = 0;
  let blankCount = 0;
  for (let i = 0; i < questionCount; i++) {
    const answered = answers[i];
    if (!answered) {
      blankCount++;
      continue;
    }
    if (answered === answerKey[i]) correctCount++;
    else wrongCount++;
  }
  const scorePercent = questionCount === 0 ? 0 : Math.round((correctCount / questionCount) * 100);
  return { correctCount, wrongCount, blankCount, scorePercent };
}
