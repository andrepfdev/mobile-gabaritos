import { ARUCO_4X4_PATTERNS, ARUCO_CORNER_IDS } from '../arucoPatterns';
import { CornerQuad, PixelPoint } from './geometry';

export type ArucoHit = {
  id: number;
  center: PixelPoint;
  size: number;
  score: number;
};

type BitGrid = number[][];

function rotate90(grid: BitGrid): BitGrid {
  const n = grid.length;
  const out: BitGrid = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[c][n - 1 - r] = grid[r][c];
    }
  }
  return out;
}

function allRotations(inner: BitGrid): BitGrid[] {
  const r0 = inner;
  const r1 = rotate90(r0);
  const r2 = rotate90(r1);
  const r3 = rotate90(r2);
  return [r0, r1, r2, r3];
}

const TARGET_ROTATIONS: Record<number, BitGrid[]> = Object.fromEntries(
  Object.entries(ARUCO_4X4_PATTERNS).map(([id, pattern]) => [Number(id), allRotations(pattern)]),
);

function sampleCellMean(
  gray: Uint8Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  const xa = Math.max(0, Math.floor(x0));
  const ya = Math.max(0, Math.floor(y0));
  const xb = Math.min(width - 1, Math.ceil(x1));
  const yb = Math.min(height - 1, Math.ceil(y1));
  if (xb < xa || yb < ya) return 255;
  let sum = 0;
  let n = 0;
  for (let y = ya; y <= yb; y++) {
    for (let x = xa; x <= xb; x++) {
      sum += gray[y * width + x];
      n++;
    }
  }
  return n ? sum / n : 255;
}

/**
 * Tries to decode a DICT_4X4 marker (ids 0–3) inside a square ROI.
 * Samples a 6×6 grid (black border + 4×4 payload), matches known patterns incl. rotations.
 */
export function decodeArucoInRoi(
  gray: Uint8Array,
  width: number,
  height: number,
  center: PixelPoint,
  size: number,
): ArucoHit | null {
  const half = size / 2;
  const left = center.x - half;
  const top = center.y - half;
  const module = size / 6;
  if (module < 2) return null;

  // Sample each module with an inset so we stay inside the cell (avoid border bleed).
  const inset = module * 0.22;
  const means: number[][] = Array.from({ length: 6 }, () => Array(6).fill(255));
  const samples: number[] = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const x0 = left + c * module + inset;
      const y0 = top + r * module + inset;
      const x1 = left + (c + 1) * module - inset;
      const y1 = top + (r + 1) * module - inset;
      const m = sampleCellMean(gray, width, height, x0, y0, x1, y1);
      means[r][c] = m;
      samples.push(m);
    }
  }

  samples.sort((a, b) => a - b);
  // Adaptive threshold between dark/light modules. A 6×6 ArUco has only ~8/36 white
  // modules (~22%), so p75 is still inside the black population — use p10/p90.
  const darkRef = samples[Math.floor(samples.length * 0.1)];
  const lightRef = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.9))];
  // Soft prints / phone glare: 18Δ is enough when border check still passes.
  if (lightRef - darkRef < 18) return null;
  const thr = (darkRef + lightRef) / 2;

  const bits: BitGrid = means.map((row) => row.map((v) => (v >= thr ? 1 : 0)));

  // Outer border must be mostly black.
  let borderBlack = 0;
  let borderTotal = 0;
  for (let i = 0; i < 6; i++) {
    const cells = [
      bits[0][i],
      bits[5][i],
      bits[i][0],
      bits[i][5],
    ];
    for (const b of cells) {
      borderTotal++;
      if (b === 0) borderBlack++;
    }
  }
  if (borderBlack / borderTotal < 0.75) return null;

  const inner: BitGrid = [];
  for (let r = 0; r < 4; r++) {
    inner.push([bits[r + 1][1], bits[r + 1][2], bits[r + 1][3], bits[r + 1][4]]);
  }

  let bestId = -1;
  let bestScore = -1;
  for (const [idStr, rotations] of Object.entries(TARGET_ROTATIONS)) {
    const id = Number(idStr);
    for (const target of rotations) {
      let match = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (inner[r][c] === target[r][c]) match++;
        }
      }
      if (match > bestScore) {
        bestScore = match;
        bestId = id;
      }
    }
  }

  // 14/16 ≈ tolerates a bit of print/camera noise.
  if (bestId < 0 || bestScore < 14) return null;
  return { id: bestId, center, size, score: bestScore / 16 };
}

export function cornersFromArucoHits(hits: ArucoHit[]): CornerQuad | null {
  const byId = new Map<number, ArucoHit>();
  for (const hit of hits) {
    const prev = byId.get(hit.id);
    if (!prev || hit.score > prev.score) byId.set(hit.id, hit);
  }

  const tl = byId.get(ARUCO_CORNER_IDS.topLeft);
  const tr = byId.get(ARUCO_CORNER_IDS.topRight);
  const br = byId.get(ARUCO_CORNER_IDS.bottomRight);
  const bl = byId.get(ARUCO_CORNER_IDS.bottomLeft);
  if (!tl || !tr || !br || !bl) return null;

  return {
    topLeft: tl.center,
    topRight: tr.center,
    bottomRight: br.center,
    bottomLeft: bl.center,
  };
}
