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
 * OMR bubble reader — restores pre-ink accuracy while supporting blue/partial marks:
 * - native path supplies ink-aware gray (min R,G) after ArUco warp
 * - score = dark density + darkest core (partial fill)
 * - clear winner preferred; soft path only with strong margin/z
 * - two close strong marks → blank
 */
const MIN_FILL_MARGIN = 0.07;
const MIN_Z_SCORE = 0.7;
const MAX_MARK_GRAY = 220;
const MIN_OMR_RATIO = 0.16;
const DOUBLE_MARK_RATIO = 0.3;
const SAMPLE_RADIUS_FACTOR = 0.55;
const REFINE_PITCH_FRACTION = 0.12;
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

// Gray values are always 0-255 bytes. A 256-bucket histogram lets scoreBubble compute the
// same "mean of the darkest N pixels" that `disk.slice().sort()` used to (counting sort is
// exact for bounded integers, not an approximation) without allocating/sorting an array per
// search position — that per-position allocation was the actual bottleneck (~3.6-3.8s per
// scan), not the native OpenCV detect/warp/CLAHE step (~170ms).
const diskHist = new Int32Array(256);

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
  const r = Math.max(2, Math.round(radius));
  const r2 = r * r;
  const innerR = radius * 1.15;
  const outerR = radius * 1.9;
  const in2 = innerR * innerR;
  const out2 = outerR * outerR;

  let bestFill = -Infinity;
  let bestGray = 255;
  let bestOmr = 0;

  for (let dy = -searchRadius; dy <= searchRadius; dy += step) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += step) {
      if (dx * dx + dy * dy > searchRadius * searchRadius) continue;
      const cx = cx0 + dx;
      const cy = cy0 + dy;

      diskHist.fill(0);
      let diskCount = 0;
      let diskSum = 0;
      const dx0 = Math.max(0, Math.floor(cx - r));
      const dy0 = Math.max(0, Math.floor(cy - r));
      const dx1 = Math.min(width - 1, Math.ceil(cx + r));
      const dy1 = Math.min(height - 1, Math.ceil(cy + r));
      for (let y = dy0; y <= dy1; y++) {
        const ddy = y - cy;
        const ddy2 = ddy * ddy;
        for (let x = dx0; x <= dx1; x++) {
          const ddx = x - cx;
          if (ddx * ddx + ddy2 <= r2) {
            const v = gray[y * width + x];
            diskHist[v]++;
            diskCount++;
            diskSum += v;
          }
        }
      }
      if (diskCount < 8) continue;

      let annCount = 0;
      let annSum = 0;
      const ax0 = Math.max(0, Math.floor(cx - outerR));
      const ay0 = Math.max(0, Math.floor(cy - outerR));
      const ax1 = Math.min(width - 1, Math.ceil(cx + outerR));
      const ay1 = Math.min(height - 1, Math.ceil(cy + outerR));
      for (let y = ay0; y <= ay1; y++) {
        const ady2 = (y - cy) * (y - cy);
        for (let x = ax0; x <= ax1; x++) {
          const adx = x - cx;
          const d2 = adx * adx + ady2;
          if (d2 > in2 && d2 <= out2) {
            annSum += gray[y * width + x];
            annCount++;
          }
        }
      }
      const paper = annCount === 0 ? 245 : annSum / annCount;

      const thr = Math.min(200, Math.max(95, paper - 24));
      let dark = 0;
      for (let v = 0; v < 256 && v < thr; v++) dark += diskHist[v];
      const omrRatio = dark / diskCount;

      const coreN = Math.max(1, Math.round(diskCount * CORE_FRACTION));
      let coreSum = 0;
      let remaining = coreN;
      for (let v = 0; v < 256 && remaining > 0; v++) {
        const c = diskHist[v];
        if (c === 0) continue;
        const take = Math.min(remaining, c);
        coreSum += v * take;
        remaining -= take;
      }
      const core = coreSum / coreN;
      const inner = diskSum / diskCount;
      const coreDark = (255 - core) / 255;
      const darkness = (255 - inner) / 255;
      const contrast = Math.max(0, (paper - core) / 255);
      // Density dominates (black pen); core+contrast lift blue/partial without shadow bias.
      const fill = Math.max(
        0,
        Math.min(1, 0.45 * omrRatio + 0.25 * coreDark + 0.2 * contrast + 0.1 * darkness),
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
  const fillP90 = percentile(sortedFills, 0.9);

  const markOmr = Math.max(MIN_OMR_RATIO, emptyP90 + 0.1);
  const minMarkFill = Math.max(0.11, Math.min(0.26, fillP50 + 0.055));
  const softFillFloor = Math.max(0.14, fillP90 * 0.62);
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
    const zScore = std > 0.015 ? (fills[bestIdx] - meanFill) / std : fills[bestIdx] - meanFill > 0.1 ? 3 : 0;

    const doubleMark =
      secondIdx >= 0 &&
      margin < 0.1 &&
      fills[secondIdx] >= Math.max(minMarkFill, fills[bestIdx] * 0.72) &&
      omrRatios[secondIdx] >= DOUBLE_MARK_RATIO;

    const solidMark =
      omrRatios[bestIdx] >= markOmr &&
      fills[bestIdx] >= minMarkFill &&
      margin >= minMargin &&
      zScore >= MIN_Z_SCORE;

    // Blue/partial: only if clearly the unique winner (strong margin+z).
    const softMark =
      fills[bestIdx] >= softFillFloor &&
      omrRatios[bestIdx] >= MIN_OMR_RATIO * 0.85 &&
      margin >= minMargin * 1.35 &&
      zScore >= MIN_Z_SCORE + 0.25 &&
      grays[bestIdx] <= MAX_MARK_GRAY;

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
