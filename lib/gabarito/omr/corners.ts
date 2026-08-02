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
    // Accept ArUco-like mid fill and solid square fiducials; reject clean filled disks (~0.78).
    if (fill < 0.22 || fill > 0.97) continue;
    if (fill > 0.73 && fill < 0.87) continue;
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

function quadArea(c: CornerQuad): number {
  const { topLeft: a, topRight: b, bottomRight: cbr, bottomLeft: d } = c;
  return Math.abs(
    (a.x * b.y + b.x * cbr.y + cbr.x * d.y + d.x * a.y - (a.y * b.x + b.y * cbr.x + cbr.y * d.x + d.y * a.x)) / 2,
  );
}

function sizeConsistency(sizes: number[]): number {
  const mean = sizes.reduce((s, v) => s + v, 0) / sizes.length;
  if (mean <= 0) return 0;
  const variance = sizes.reduce((s, v) => s + (v - mean) * (v - mean), 0) / sizes.length;
  return 1 - Math.min(1, Math.sqrt(variance) / mean);
}

function dist(a: PixelPoint, b: PixelPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Prefer the 4-candidate quad that is large, size-consistent, and near the paper extremes.
 * Extreme-picking alone latches onto filled bubbles near the sheet edge (esp. Q1A / Q10A).
 */
function selectBestQuad(
  candidates: SquareCandidate[],
  width: number,
  height: number,
  paper: CornerQuad | null,
): CornerQuad | null {
  const minSep = Math.min(width, height) * 0.18;
  const maxN = Math.min(candidates.length, 18);
  const medianSize = [...candidates].sort((a, b) => a.size - b.size)[Math.floor(candidates.length / 2)].size;
  const ranked = [...candidates].sort((a, b) => {
    const da = Math.abs(a.size - medianSize);
    const db = Math.abs(b.size - medianSize);
    return da - db;
  });
  const pool = ranked.slice(0, maxN);

  let best: CornerQuad | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < pool.length; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      for (let k = j + 1; k < pool.length; k++) {
        for (let l = k + 1; l < pool.length; l++) {
          const four = [pool[i], pool[j], pool[k], pool[l]];
          const tl = four.reduce((b, c) => (c.center.x + c.center.y < b.center.x + b.center.y ? c : b));
          const tr = four.reduce((b, c) =>
            width - c.center.x + c.center.y < width - b.center.x + b.center.y ? c : b,
          );
          const bl = four.reduce((b, c) =>
            c.center.x + (height - c.center.y) < b.center.x + (height - b.center.y) ? c : b,
          );
          const br = four.reduce((b, c) =>
            width - c.center.x + (height - c.center.y) < width - b.center.x + (height - b.center.y) ? c : b,
          );
          if (new Set([tl, tr, bl, br]).size < 4) continue;

          const corners: CornerQuad = {
            topLeft: tl.center,
            topRight: tr.center,
            bottomLeft: bl.center,
            bottomRight: br.center,
          };
          if (!quadLooksPlausible(corners)) continue;
          if (corners.topLeft.x >= corners.topRight.x || corners.bottomLeft.x >= corners.bottomRight.x) continue;
          if (corners.topLeft.y >= corners.bottomLeft.y || corners.topRight.y >= corners.bottomRight.y) continue;

          const pts = [tl, tr, bl, br];
          let sepOk = true;
          for (let a = 0; a < 4 && sepOk; a++) {
            for (let b = a + 1; b < 4; b++) {
              if (dist(pts[a].center, pts[b].center) < minSep) {
                sepOk = false;
                break;
              }
            }
          }
          if (!sepOk) continue;

          const area = quadArea(corners);
          const consistency = sizeConsistency(pts.map((p) => p.size));
          let paperFit = 1;
          if (paper) {
            const fit =
              dist(corners.topLeft, paper.topLeft) +
              dist(corners.topRight, paper.topRight) +
              dist(corners.bottomLeft, paper.bottomLeft) +
              dist(corners.bottomRight, paper.bottomRight);
            // Strong penalty: filled bubbles sit well inside the sheet vs fiducials at paper corners.
            paperFit = 1 / (1 + fit / (Math.min(width, height) * 0.25));
          }
          const score = area * (0.25 + 0.2 * consistency + 0.55 * paperFit);
          if (score > bestScore) {
            bestScore = score;
            best = corners;
          }
        }
      }
    }
  }

  return best;
}

/**
 * Finds the 4 printed corner fiducials (ArUco outer boxes / solid squares) by shape,
 * choosing the largest size-consistent quad near the paper extremes.
 */
export function findCornerMarks(gray: Uint8Array, width: number, height: number): CornerQuad | null {
  const threshold = Math.min(140, Math.max(60, otsuThreshold(gray)));
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) binary[i] = gray[i] < threshold ? 1 : 0;
  const closed = morphCloseDark(binary, width, height);
  const components = labelDarkComponents(closed, width, height);
  const candidates = toCandidates(components, width, height);
  if (candidates.length < 4) return null;

  const paper = findPaperExtremes(gray, width, height);
  return selectBestQuad(candidates, width, height, paper);
}
