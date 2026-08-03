/**
 * Inner 4×4 bit patterns for OpenCV DICT_4X4_50 IDs 0–3 (rotation 0).
 * Bytes from OpenCV `DICT_4X4_1000_BYTES` (first 50 entries = DICT_4X4_50), MSB-first row-major.
 */
export const ARUCO_CORNER_IDS = {
  topLeft: 0,
  topRight: 1,
  bottomRight: 2,
  bottomLeft: 3,
} as const;

export type ArucoCornerKey = keyof typeof ARUCO_CORNER_IDS;

/** 1 = white module, 0 = black module (inner grid only; border is always black when rendered). */
export const ARUCO_4X4_PATTERNS: Record<number, number[][]> = {
  // bytes [181, 50] → 10110101 00110010
  0: [
    [1, 0, 1, 1],
    [0, 1, 0, 1],
    [0, 0, 1, 1],
    [0, 0, 1, 0],
  ],
  // bytes [15, 154] → 00001111 10011010
  1: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [1, 0, 0, 1],
    [1, 0, 1, 0],
  ],
  // bytes [51, 45] → 00110011 00101101
  2: [
    [0, 0, 1, 1],
    [0, 0, 1, 1],
    [0, 0, 1, 0],
    [1, 1, 0, 1],
  ],
  // bytes [153, 70] → 10011001 01000110
  3: [
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [0, 1, 0, 0],
    [0, 1, 1, 0],
  ],
};

/** Full marker grid including 1-module black border (6×6). */
export function arucoGridWithBorder(id: number): number[][] {
  const inner = ARUCO_4X4_PATTERNS[id];
  if (!inner) {
    throw new Error(`ArUco id ${id} não está no dicionário embutido.`);
  }
  const n = inner.length + 2;
  const grid: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let r = 0; r < inner.length; r++) {
    for (let c = 0; c < inner.length; c++) {
      grid[r + 1][c + 1] = inner[r][c];
    }
  }
  return grid;
}
