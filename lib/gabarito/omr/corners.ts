import { ArucoHit, cornersFromArucoHits, decodeArucoInRoi } from './aruco';
import { CornerQuad, PixelPoint, quadLooksPlausible } from './geometry';

type Component = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  count: number;
};

type SquareCandidate = {
  center: PixelPoint;
  size: number;
  fill: number;
};

function otsuThreshold(gray: Uint8Array): number {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let maxVar = 0;
  let threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > maxVar) {
      maxVar = between;
      threshold = t;
    }
  }
  return threshold;
}

/** Close 1px gaps in fiducials caused by perspective resampling / print dots. */
function morphCloseDark(binary: Uint8Array, width: number, height: number): Uint8Array {
  const dilate = new Uint8Array(binary.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dark = 0;
      for (let dy = -1; dy <= 1 && !dark; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (binary[ny * width + nx]) {
            dark = 1;
            break;
          }
        }
      }
      dilate[y * width + x] = dark;
    }
  }
  const closed = new Uint8Array(binary.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let all = 1;
      for (let dy = -1; dy <= 1 && all; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          if (!dilate[ny * width + nx]) {
            all = 0;
            break;
          }
        }
      }
      closed[y * width + x] = all;
    }
  }
  return closed;
}

function labelDarkComponents(binary: Uint8Array, width: number, height: number): Component[] {
  const visited = new Uint8Array(width * height);
  const components: Component[] = [];
  const stackX: number[] = [];
  const stackY: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx] || !binary[idx]) continue;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let count = 0;
      stackX.push(x);
      stackY.push(y);
      visited[idx] = 1;

      while (stackX.length) {
        const cx = stackX.pop()!;
        const cy = stackY.pop()!;
        count++;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const nidx = ny * width + nx;
            if (visited[nidx] || !binary[nidx]) continue;
            visited[nidx] = 1;
            stackX.push(nx);
            stackY.push(ny);
          }
        }
      }

      if (count >= 20) {
        components.push({ minX, minY, maxX, maxY, count });
      }
    }
  }
  return components;
}

function toCandidates(components: Component[], width: number, height: number): SquareCandidate[] {
  const minDim = Math.min(width, height);
  const minSize = minDim * 0.015;
  const maxSize = minDim * 0.12;
  const out: SquareCandidate[] = [];

  for (const c of components) {
    const w = c.maxX - c.minX + 1;
    const h = c.maxY - c.minY + 1;
    const aspect = w / h;
    // Allow foreshortened rectangles — strong phone keystone turns squares into ~2:1 boxes.
    if (aspect < 0.45 || aspect > 2.2) continue;
    if (w < minSize || h < minSize || w > maxSize || h > maxSize) continue;
    const boxArea = w * h;
    const fill = c.count / boxArea;
    // Keep a wide fill band so ArUco (mid-fill / print holes) still becomes a decode candidate.
    // Filled bubbles (~0.78) are filtered later by failed ArUco decode + quad scoring.
    if (fill < 0.2 || fill > 0.98) continue;
    out.push({
      center: { x: (c.minX + c.maxX) / 2, y: (c.minY + c.maxY) / 2 },
      size: (w + h) / 2,
      fill,
    });
  }
  return out;
}

/** Bright-paper extremes — true fiducials sit near these, filled bubbles do not. */
function findPaperExtremes(gray: Uint8Array, width: number, height: number): CornerQuad | null {
  const paperThresh = Math.max(170, otsuThreshold(gray) + 40);
  let tl: PixelPoint | null = null;
  let tr: PixelPoint | null = null;
  let bl: PixelPoint | null = null;
  let br: PixelPoint | null = null;
  let tlScore = Infinity;
  let trScore = Infinity;
  let blScore = Infinity;
  let brScore = Infinity;
  let found = 0;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (gray[y * width + x] < paperThresh) continue;
      found++;
      const sTL = x + y;
      const sTR = width - x + y;
      const sBL = x + (height - y);
      const sBR = width - x + (height - y);
      if (sTL < tlScore) {
        tlScore = sTL;
        tl = { x, y };
      }
      if (sTR < trScore) {
        trScore = sTR;
        tr = { x, y };
      }
      if (sBL < blScore) {
        blScore = sBL;
        bl = { x, y };
      }
      if (sBR < brScore) {
        brScore = sBR;
        br = { x, y };
      }
    }
  }

  if (found < 100 || !tl || !tr || !bl || !br) return null;
  return { topLeft: tl, topRight: tr, bottomLeft: bl, bottomRight: br };
}

function bestDecodeAt(
  gray: Uint8Array,
  width: number,
  height: number,
  center: PixelPoint,
  size: number,
  scaleFactors: number[],
): ArucoHit | null {
  let best: ArucoHit | null = null;
  for (const scale of scaleFactors) {
    const hit = decodeArucoInRoi(gray, width, height, center, size * scale);
    if (hit && (!best || hit.score > best.score)) best = hit;
  }
  return best;
}

/**
 * CC bboxes often miss one marker (merged border / JPEG). Seed ROIs near the four
 * image corners and paper extremes at multiple mark scales (3–8% minDim).
 */
function seedArucoHits(
  gray: Uint8Array,
  width: number,
  height: number,
  paper: CornerQuad | null,
): ArucoHit[] {
  const minDim = Math.min(width, height);
  const markSizes = [0.035, 0.05, 0.075].map((f) => minDim * f);
  const insetXs = [0.035, 0.06].map((f) => minDim * f);
  const scaleFactors = [0.8, 0.95, 1.0, 1.15];
  // Top ArUco sit below the identity header (~12–22% of sheet height), not at the image edge.
  const topYs = [0.08, 0.14, 0.2, 0.26].map((f) => height * f);
  const bottomYs = [0.74, 0.84, 0.92].map((f) => height * f);
  const seeds: PixelPoint[] = [];
  for (const insetX of insetXs) {
    for (const y of topYs) {
      seeds.push({ x: insetX, y }, { x: width - insetX, y });
    }
    for (const y of bottomYs) {
      seeds.push({ x: insetX, y }, { x: width - insetX, y });
    }
  }
  if (paper) {
    seeds.push(paper.topLeft, paper.topRight, paper.bottomLeft, paper.bottomRight);
  }

  const hits: ArucoHit[] = [];
  for (const center of seeds) {
    for (const mark of markSizes) {
      for (const dx of [-6, 0, 6]) {
        for (const dy of [-6, 0, 6]) {
          const hit = bestDecodeAt(
            gray,
            width,
            height,
            { x: center.x + dx, y: center.y + dy },
            mark,
            scaleFactors,
          );
          if (hit) hits.push(hit);
        }
      }
    }
  }
  return hits;
}

export type ArucoCornerFind = {
  corners: CornerQuad;
  score: number;
  ids: number[];
};

function findArucoCorners(
  gray: Uint8Array,
  width: number,
  height: number,
  candidates: SquareCandidate[],
  paper: CornerQuad | null,
): ArucoCornerFind | null {
  // CC bbox is often larger than the true marker (merged border / JPEG bleed).
  const scaleFactors = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.35];
  const hits: ArucoHit[] = [];
  for (const c of candidates) {
    const best = bestDecodeAt(gray, width, height, c.center, c.size, scaleFactors);
    if (best) hits.push(best);
  }
  hits.push(...seedArucoHits(gray, width, height, paper));

  const corners = cornersFromArucoHits(hits);
  if (!corners) return null;
  if (!quadLooksPlausible(corners)) return null;
  if (corners.topLeft.x >= corners.topRight.x || corners.bottomLeft.x >= corners.bottomRight.x) return null;
  if (corners.topLeft.y >= corners.bottomLeft.y || corners.topRight.y >= corners.bottomRight.y) return null;

  const byId = new Map<number, ArucoHit>();
  for (const hit of hits) {
    const prev = byId.get(hit.id);
    if (!prev || hit.score > prev.score) byId.set(hit.id, hit);
  }
  const ids = [...byId.keys()].sort((a, b) => a - b);
  let score = 0;
  for (const hit of byId.values()) score += hit.score;
  return { corners, score, ids };
}

/**
 * Finds the 4 corner fiducials via decoded ArUco IDs 0–3 (TL/TR/BR/BL).
 * No silent shape/bubble fallback — missing 4/4 means rescan.
 */
export function findCornerMarks(gray: Uint8Array, width: number, height: number): CornerQuad | null {
  return findCornerMarksScored(gray, width, height)?.corners ?? null;
}

/** Keep CC candidates near image corners (fiducials), not filled bubbles mid-sheet (G17). */
function isCornerBandCandidate(c: SquareCandidate, width: number, height: number): boolean {
  const xBand = width * 0.28;
  const yBand = height * 0.32;
  const x = c.center.x;
  const y = c.center.y;
  const nearX = x <= xBand || x >= width - xBand;
  const nearY = y <= yBand || y >= height - yBand;
  return nearX && nearY;
}

/** Same as findCornerMarks, with ArUco quality score for flip selection. */
export function findCornerMarksScored(
  gray: Uint8Array,
  width: number,
  height: number,
): ArucoCornerFind | null {
  const threshold = Math.min(140, Math.max(60, otsuThreshold(gray)));
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) binary[i] = gray[i] < threshold ? 1 : 0;
  // Light open (erode then dilate) instead of heavy close — less glue on dark desks.
  const closed = morphCloseDark(binary, width, height);
  const components = labelDarkComponents(closed, width, height);
  const allCandidates = toCandidates(components, width, height);
  const cornerBand = allCandidates.filter((c) => isCornerBandCandidate(c, width, height));
  const candidates = cornerBand.length >= 4 ? cornerBand : allCandidates;
  if (candidates.length < 4) {
    // Still try seeds-only path via empty candidate list + paper extremes.
    const paper = findPaperExtremes(gray, width, height);
    return findArucoCorners(gray, width, height, [], paper);
  }

  const paper = findPaperExtremes(gray, width, height);
  return findArucoCorners(gray, width, height, candidates, paper);
}
