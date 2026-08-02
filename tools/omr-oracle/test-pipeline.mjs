/**
 * Offline oracle (Node): synthetic sheet with 4 corner marks + filled bubbles,
 * including a stress case where filled bubbles compete with fiducials for "extreme"
 * corners. Proves corner→warp→relative-fill before device testing.
 *
 * Run: npm run omr:oracle
 */

const CORNER_INSET = 0.04;
const MARK = 0.05;
const HEADER = 0.125;
const HEADER_OMR_GAP = 0.028;
const GRID_TOP_GAP = 0.028;
const ROW_H = 0.09;
const LABEL_RATIO = 0.09;
const PITCH = 2.2;
const BUBBLE_H = 0.85;
const PAD = 0.02;
const COLUMN_GAP = 0.04;
const MAX_ROWS_PER_COLUMN = 25;

function buildLayout(questionCount, options = ['A', 'B', 'C', 'D', 'E']) {
  const columns = questionCount > MAX_ROWS_PER_COLUMN ? 2 : 1;
  const rowsPerColumn = Math.ceil(questionCount / columns);
  const columnWidthW = (1 - 2 * CORNER_INSET - (columns - 1) * COLUMN_GAP) / columns;
  const labelWidthW = columnWidthW * LABEL_RATIO;
  const maxD = (columnWidthW - labelWidthW) / ((options.length - 1) * PITCH + 1);
  const bubbleD = Math.min(ROW_H * BUBBLE_H, maxD);
  const bubbleR = bubbleD / 2;
  const pitch = bubbleD * PITCH;
  const markHalf = MARK / 2;
  const topCorner = HEADER + HEADER_OMR_GAP + markHalf;
  const gridTop = topCorner + markHalf + GRID_TOP_GAP;
  const bottomCorner = gridTop + rowsPerColumn * ROW_H + GRID_TOP_GAP + markHalf;
  const totalH = bottomCorner + markHalf + HEADER_OMR_GAP;
  const toY = (v) => v / totalH;
  const rows = [];
  for (let q = 1; q <= questionCount; q++) {
    const columnIndex = Math.floor((q - 1) / rowsPerColumn);
    const rowIndex = (q - 1) % rowsPerColumn;
    const columnLeft = CORNER_INSET + columnIndex * (columnWidthW + COLUMN_GAP);
    const rowCenter = gridTop + rowIndex * ROW_H + ROW_H / 2;
    const groupLeft = columnLeft + columnWidthW * PAD;
    const optionsLeft = groupLeft + labelWidthW;
    rows.push({
      question: q,
      options: options.map((option, i) => ({
        option,
        xPct: optionsLeft + bubbleR + i * pitch,
        yPct: toY(rowCenter),
      })),
    });
  }
  return {
    aspectRatio: 1 / totalH,
    bubbleRadiusPct: bubbleR,
    corners: {
      topLeft: { xPct: CORNER_INSET, yPct: toY(topCorner) },
      topRight: { xPct: 1 - CORNER_INSET, yPct: toY(topCorner) },
      bottomLeft: { xPct: CORNER_INSET, yPct: toY(bottomCorner) },
      bottomRight: { xPct: 1 - CORNER_INSET, yPct: toY(bottomCorner) },
    },
    rows,
  };
}

function computeHomography(c) {
  const { topLeft: p0, topRight: p1, bottomRight: p2, bottomLeft: p3 } = c;
  const dx1 = p1.x - p2.x,
    dy1 = p1.y - p2.y;
  const dx2 = p3.x - p2.x,
    dy2 = p3.y - p2.y;
  const sx = p0.x - p1.x + p2.x - p3.x,
    sy = p0.y - p1.y + p2.y - p3.y;
  const denom = dx1 * dy2 - dy1 * dx2;
  const g = denom ? (sx * dy2 - sy * dx2) / denom : 0;
  const h = denom ? (dx1 * sy - dy1 * sx) / denom : 0;
  return {
    a: p1.x - p0.x + g * p1.x,
    b: p3.x - p0.x + h * p3.x,
    c: p0.x,
    d: p1.y - p0.y + g * p1.y,
    e: p3.y - p0.y + h * p3.y,
    f: p0.y,
    g,
    h,
  };
}

function toPixel(H, u, v) {
  const w = H.g * u + H.h * v + 1;
  return { x: (H.a * u + H.b * v + H.c) / w, y: (H.d * u + H.e * v + H.f) / w };
}

function paintSquare(gray, w, h, cx, cy, size, value) {
  const half = size / 2;
  const x0 = Math.max(0, Math.round(cx - half));
  const y0 = Math.max(0, Math.round(cy - half));
  const x1 = Math.min(w - 1, Math.round(cx + half));
  const y1 = Math.min(h - 1, Math.round(cy + half));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) gray[y * w + x] = value;
}

function paintDisk(gray, w, h, cx, cy, r, value) {
  const r2 = r * r;
  const x0 = Math.max(0, Math.floor(cx - r));
  const y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(w - 1, Math.ceil(cx + r));
  const y1 = Math.min(h - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx,
        dy = y - cy;
      if (dx * dx + dy * dy <= r2) gray[y * w + x] = value;
    }
  }
}

function sampleBilinear(gray, width, height, x, y) {
  if (x < 0 || y < 0 || x >= width - 1 || y >= height - 1) {
    const xi = Math.min(width - 1, Math.max(0, Math.round(x)));
    const yi = Math.min(height - 1, Math.max(0, Math.round(y)));
    return gray[yi * width + xi];
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  return (
    gray[y0 * width + x0] * (1 - fx) * (1 - fy) +
    gray[y0 * width + x0 + 1] * fx * (1 - fy) +
    gray[(y0 + 1) * width + x0] * (1 - fx) * fy +
    gray[(y0 + 1) * width + x0 + 1] * fx * fy
  );
}

function otsuThreshold(gray) {
  const hist = new Array(256).fill(0);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0,
    wB = 0,
    maxVar = 0,
    threshold = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
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

function quadLooksPlausible(corners) {
  const left = Math.hypot(corners.bottomLeft.x - corners.topLeft.x, corners.bottomLeft.y - corners.topLeft.y);
  const right = Math.hypot(corners.bottomRight.x - corners.topRight.x, corners.bottomRight.y - corners.topRight.y);
  const top = Math.hypot(corners.topRight.x - corners.topLeft.x, corners.topRight.y - corners.topLeft.y);
  const bottom = Math.hypot(corners.bottomRight.x - corners.bottomLeft.x, corners.bottomRight.y - corners.bottomLeft.y);
  const sideRatio = Math.max(left, right) / Math.max(1, Math.min(left, right));
  const topBottomRatio = Math.max(top, bottom) / Math.max(1, Math.min(top, bottom));
  return sideRatio <= 3.5 && topBottomRatio <= 3.5 && top > 20 && left > 20;
}

function quadArea(c) {
  const a = c.topLeft,
    b = c.topRight,
    cbr = c.bottomRight,
    d = c.bottomLeft;
  return Math.abs(
    (a.x * b.y + b.x * cbr.y + cbr.x * d.y + d.x * a.y - (a.y * b.x + b.y * cbr.x + cbr.y * d.x + d.y * a.x)) / 2,
  );
}

function morphCloseDark(binary, width, height) {
  const dilate = new Uint8Array(binary.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let dark = 0;
      for (let dy = -1; dy <= 1 && !dark; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy;
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
          const nx = x + dx,
            ny = y + dy;
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

function findPaperExtremes(gray, width, height) {
  const paperThresh = Math.max(170, otsuThreshold(gray) + 40);
  let tl = null,
    tr = null,
    bl = null,
    br = null;
  let tlScore = Infinity,
    trScore = Infinity,
    blScore = Infinity,
    brScore = Infinity;
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

/** Mirrors lib/gabarito/omr/corners.ts selection logic. */
function findCorners(gray, width, height) {
  const threshold = Math.min(140, Math.max(60, otsuThreshold(gray)));
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) binary[i] = gray[i] < threshold ? 1 : 0;
  const closed = morphCloseDark(binary, width, height);
  const visited = new Uint8Array(width * height);
  const candidates = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (visited[i] || !closed[i]) continue;
      let minX = x,
        maxX = x,
        minY = y,
        maxY = y,
        count = 0;
      const qx = [x],
        qy = [y];
      visited[i] = 1;
      while (qx.length) {
        const cx = qx.pop(),
          cy = qy.pop();
        count++;
        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx,
              ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
            const ni = ny * width + nx;
            if (visited[ni] || !closed[ni]) continue;
            visited[ni] = 1;
            qx.push(nx);
            qy.push(ny);
          }
      }
      if (count < 20) continue;
      const bw = maxX - minX + 1,
        bh = maxY - minY + 1;
      const aspect = bw / bh;
      const fill = count / (bw * bh);
      const minDim = Math.min(width, height);
      if (aspect < 0.45 || aspect > 2.2) continue;
      if (bw < minDim * 0.015 || bh < minDim * 0.015 || bw > minDim * 0.12) continue;
      if (fill < 0.2 || fill > 0.98) continue;
      candidates.push({
        center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
        size: (bw + bh) / 2,
        fill,
      });
    }
  }
  if (candidates.length < 4) return null;

  // ArUco ID decode (same idea as lib/gabarito/omr/aruco.ts)
  const rotate90 = (g) => {
    const n = g.length;
    const o = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) o[c][n - 1 - r] = g[r][c];
    return o;
  };
  const decodeOne = (center, size) => {
    const half = size / 2;
    const left = center.x - half;
    const top = center.y - half;
    const module = size / 6;
    if (module < 2) return null;
    const inset = module * 0.22;
    const means = Array.from({ length: 6 }, () => Array(6).fill(255));
    const samples = [];
    for (let r = 0; r < 6; r++)
      for (let c = 0; c < 6; c++) {
        let sum = 0,
          n = 0;
        const x0 = Math.max(0, Math.floor(left + c * module + inset));
        const y0 = Math.max(0, Math.floor(top + r * module + inset));
        const x1 = Math.min(width - 1, Math.ceil(left + (c + 1) * module - inset));
        const y1 = Math.min(height - 1, Math.ceil(top + (r + 1) * module - inset));
        for (let y = y0; y <= y1; y++)
          for (let x = x0; x <= x1; x++) {
            sum += gray[y * width + x];
            n++;
          }
        const m = n ? sum / n : 255;
        means[r][c] = m;
        samples.push(m);
      }
    samples.sort((a, b) => a - b);
    // ~8/36 modules are white — p75 stays in black; use p10/p90.
    const darkRef = samples[Math.floor(samples.length * 0.1)];
    const lightRef = samples[Math.min(samples.length - 1, Math.floor(samples.length * 0.9))];
    if (lightRef - darkRef < 25) return null;
    const thr = (darkRef + lightRef) / 2;
    const bits = means.map((row) => row.map((v) => (v >= thr ? 1 : 0)));
    let borderBlack = 0,
      borderTotal = 0;
    for (let i = 0; i < 6; i++) {
      for (const b of [bits[0][i], bits[5][i], bits[i][0], bits[i][5]]) {
        borderTotal++;
        if (b === 0) borderBlack++;
      }
    }
    if (borderBlack / borderTotal < 0.75) return null;
    const inner = [];
    for (let r = 0; r < 4; r++) inner.push([bits[r + 1][1], bits[r + 1][2], bits[r + 1][3], bits[r + 1][4]]);
    let bestId = -1,
      bestScore = -1;
    for (const [idStr, pattern] of Object.entries(ARUCO_INNER)) {
      let g = pattern;
      for (let rot = 0; rot < 4; rot++) {
        let match = 0;
        for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (inner[r][c] === g[r][c]) match++;
        if (match > bestScore) {
          bestScore = match;
          bestId = Number(idStr);
        }
        g = rotate90(g);
      }
    }
    if (bestId < 0 || bestScore < 14) return null;
    return { id: bestId, center, score: bestScore / 16 };
  };
  const byId = new Map();
  const remember = (hit) => {
    if (!hit) return;
    const prev = byId.get(hit.id);
    if (!prev || hit.score > prev.score) byId.set(hit.id, hit);
  };
  for (const c of candidates) {
    for (const scale of [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.35]) {
      remember(decodeOne(c.center, c.size * scale));
    }
  }
  // Seeds cover header-below marks (top ~10–22% of height), not only image corners.
  const minDim = Math.min(width, height);
  const mark = minDim * 0.05;
  const insetX = minDim * 0.045;
  const seedYs = [0.05, 0.1, 0.14, 0.18, 0.22, 0.78, 0.84, 0.9, 0.95].map((f) => height * f);
  for (const y of seedYs) {
    for (const x of [insetX, width - insetX]) {
      for (const dx of [-4, 0, 4]) {
        for (const dy of [-4, 0, 4]) {
          for (const scale of [0.85, 0.95, 1.0, 1.1, 1.2]) {
            remember(decodeOne({ x: x + dx, y: y + dy }, mark * scale));
          }
        }
      }
    }
  }
  if (byId.has(0) && byId.has(1) && byId.has(2) && byId.has(3)) {
    return {
      topLeft: byId.get(0).center,
      topRight: byId.get(1).center,
      bottomRight: byId.get(2).center,
      bottomLeft: byId.get(3).center,
    };
  }

  const paper = findPaperExtremes(gray, width, height);
  const minSep = Math.min(width, height) * 0.18;
  const medianSize = [...candidates].sort((a, b) => a.size - b.size)[Math.floor(candidates.length / 2)].size;
  const pool = [...candidates]
    .sort((a, b) => Math.abs(a.size - medianSize) - Math.abs(b.size - medianSize))
    .slice(0, 18);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  let best = null;
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
          const corners = {
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
          const sizes = pts.map((p) => p.size);
          const mean = sizes.reduce((s, v) => s + v, 0) / 4;
          const cons =
            1 - Math.min(1, Math.sqrt(sizes.reduce((s, v) => s + (v - mean) * (v - mean), 0) / 4) / mean);
          let paperFit = 1;
          if (paper) {
            const fit =
              dist(corners.topLeft, paper.topLeft) +
              dist(corners.topRight, paper.topRight) +
              dist(corners.bottomLeft, paper.bottomLeft) +
              dist(corners.bottomRight, paper.bottomRight);
            paperFit = 1 / (1 + fit / (Math.min(width, height) * 0.25));
          }
          const score = area * (0.25 + 0.2 * cons + 0.55 * paperFit);
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

function inverseToUnit(H, x, y) {
  let u = 0.5;
  let v = 0.5;
  for (let i = 0; i < 12; i++) {
    const p = toPixel(H, u, v);
    const eps = 1e-3;
    const pu = toPixel(H, u + eps, v);
    const pv = toPixel(H, u, v + eps);
    const dxdu = (pu.x - p.x) / eps;
    const dxdv = (pv.x - p.x) / eps;
    const dydu = (pu.y - p.y) / eps;
    const dydv = (pv.y - p.y) / eps;
    const det = dxdu * dydv - dxdv * dydu;
    if (Math.abs(det) < 1e-9) break;
    u += ((x - p.x) * dydv - (y - p.y) * dxdv) / det;
    v += (-(x - p.x) * dydu + (y - p.y) * dxdu) / det;
  }
  return { u, v };
}

/** Pin all 4 layout corners (parity with lib/gabarito/omr/geometry.ts). */
function warp(gray, width, height, corners, outW, outH, layoutCorners) {
  const maxX = outW - 1;
  const maxY = outH - 1;
  const layoutPix = {
    topLeft: { x: layoutCorners.topLeft.xPct * maxX, y: layoutCorners.topLeft.yPct * maxY },
    topRight: { x: layoutCorners.topRight.xPct * maxX, y: layoutCorners.topRight.yPct * maxY },
    bottomRight: { x: layoutCorners.bottomRight.xPct * maxX, y: layoutCorners.bottomRight.yPct * maxY },
    bottomLeft: { x: layoutCorners.bottomLeft.xPct * maxX, y: layoutCorners.bottomLeft.yPct * maxY },
  };
  const Hphoto = computeHomography(corners);
  const Hlayout = computeHomography(layoutPix);
  const out = new Uint8Array(outW * outH);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const { u, v } = inverseToUnit(Hlayout, x, y);
      const p = toPixel(Hphoto, u, v);
      out[y * outW + x] = Math.round(sampleBilinear(gray, width, height, p.x, p.y));
    }
  }
  return out;
}

const ARUCO_INNER = {
  0: [
    [1, 0, 1, 1],
    [0, 1, 0, 1],
    [0, 0, 1, 1],
    [0, 0, 1, 0],
  ],
  1: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [1, 0, 0, 1],
    [1, 0, 1, 0],
  ],
  2: [
    [0, 0, 1, 1],
    [0, 0, 1, 1],
    [0, 0, 1, 0],
    [1, 1, 0, 1],
  ],
  3: [
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [0, 1, 0, 0],
    [0, 1, 1, 0],
  ],
};

function paintAruco(gray, w, h, cx, cy, size, id) {
  const inner = ARUCO_INNER[id];
  const half = size / 2;
  const module = size / 6;
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      let bit = 0; // black border
      if (r >= 1 && r <= 4 && c >= 1 && c <= 4) bit = inner[r - 1][c - 1];
      const value = bit ? 245 : 20;
      const x0 = Math.max(0, Math.round(cx - half + c * module));
      const y0 = Math.max(0, Math.round(cy - half + r * module));
      const x1 = Math.min(w - 1, Math.round(cx - half + (c + 1) * module));
      const y1 = Math.min(h - 1, Math.round(cy - half + (r + 1) * module));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) gray[y * w + x] = value;
    }
  }
}

/** Mirrors lib/gabarito/omr/bubbles.ts (priority A: light/partial ink). */
function scoreBubble(gray, width, height, cx0, cy0, radius, searchRadius) {
  const step = Math.max(2, Math.round(searchRadius / 3));
  let bestFill = -1;
  let bestOmr = 0;
  let bestGray = 255;
  for (let dy = -searchRadius; dy <= searchRadius; dy += step) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += step) {
      if (dx * dx + dy * dy > searchRadius * searchRadius) continue;
      const cx = cx0 + dx;
      const cy = cy0 + dy;
      const vals = [];
      const paper = [];
      const r = Math.max(2, Math.round(radius));
      const r2 = r * r;
      const in2 = r * 1.15 * (r * 1.15);
      const out2 = r * 1.9 * (r * 1.9);
      for (let y = Math.floor(cy - r * 1.9); y <= Math.ceil(cy + r * 1.9); y++) {
        for (let x = Math.floor(cx - r * 1.9); x <= Math.ceil(cx + r * 1.9); x++) {
          if (x < 0 || y < 0 || x >= width || y >= height) continue;
          const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
          if (d <= r2) vals.push(gray[y * width + x]);
          else if (d > in2 && d <= out2) paper.push(gray[y * width + x]);
        }
      }
      if (vals.length < 8) continue;
      const pap = paper.length ? paper.reduce((a, b) => a + b, 0) / paper.length : 245;
      const thr = Math.min(210, Math.max(100, pap - 18));
      let dark = 0;
      let sum = 0;
      for (const v of vals) {
        sum += v;
        if (v < thr) dark++;
      }
      const omrRatio = dark / vals.length;
      vals.sort((a, b) => a - b);
      const n = Math.max(1, Math.round(vals.length * 0.35));
      let coreSum = 0;
      for (let i = 0; i < n; i++) coreSum += vals[i];
      const core = coreSum / n;
      const coreDark = (255 - core) / 255;
      const contrast = Math.max(0, (pap - core) / 255);
      const softDensity = Math.max(0, Math.min(1, (pap - core) / 55));
      const fill = Math.max(
        0,
        Math.min(1, 0.32 * omrRatio + 0.28 * coreDark + 0.22 * contrast + 0.18 * softDensity),
      );
      if (fill > bestFill) {
        bestFill = fill;
        bestOmr = omrRatio;
        bestGray = core;
      }
    }
  }
  return { fill: Math.max(0, bestFill), omr: bestOmr, gray: bestGray };
}

function readAnswers(gray, width, height, layout, key) {
  const radius = layout.bubbleRadiusPct * width * 0.55;
  const pitch = layout.bubbleRadiusPct * 2 * 2.2 * width;
  const search = pitch * 0.12;
  const allOmr = [];
  const allFills = [];
  const rows = [];
  for (const row of layout.rows) {
    const scored = row.options.map((b) => {
      const cx = b.xPct * (width - 1);
      const cy = b.yPct * (height - 1);
      return scoreBubble(gray, width, height, cx, cy, radius, search);
    });
    rows.push({ row, scored });
    for (const s of scored) {
      allOmr.push(s.omr);
      allFills.push(s.fill);
    }
  }
  const sortedOmr = allOmr.slice().sort((a, b) => a - b);
  const sortedFills = allFills.slice().sort((a, b) => a - b);
  const emptyP90 = sortedOmr[Math.floor(sortedOmr.length * 0.9)] ?? 0;
  const fillP50 = sortedFills[Math.floor(sortedFills.length * 0.5)] ?? 0;
  const fillP85 = sortedFills[Math.floor(sortedFills.length * 0.85)] ?? 0;
  const markOmr = Math.max(0.12, Math.min(0.22, emptyP90 + 0.07));
  const minMarkFill = Math.max(0.08, Math.min(0.2, fillP50 + 0.04));
  const softFillFloor = Math.max(0.1, fillP85 * 0.55);

  let correct = 0;
  const got = [];
  for (const { row, scored } of rows) {
    const fills = scored.map((s) => s.fill);
    const omrRatios = scored.map((s) => s.omr);
    const grays = scored.map((s) => s.gray);
    let best = 0;
    for (let i = 1; i < fills.length; i++) if (fills[i] > fills[best]) best = i;
    const sorted = [...fills].sort((a, b) => b - a);
    const mean = fills.reduce((a, b) => a + b, 0) / fills.length;
    const std = Math.sqrt(fills.reduce((a, b) => a + (b - mean) * (b - mean), 0) / fills.length);
    const margin = sorted[0] - (sorted[1] ?? 0);
    const z = std > 0.012 ? (fills[best] - mean) / std : fills[best] - mean > 0.08 ? 3 : 0;
    let secondIdx = -1;
    let secondFill = -Infinity;
    for (let i = 0; i < fills.length; i++) {
      if (i === best) continue;
      if (fills[i] > secondFill) {
        secondFill = fills[i];
        secondIdx = i;
      }
    }
    const doubleMark =
      secondIdx >= 0 &&
      margin < 0.12 &&
      fills[secondIdx] >= Math.max(minMarkFill, fills[best] * 0.7) &&
      omrRatios[secondIdx] >= 0.32;
    const solid =
      omrRatios[best] >= markOmr && fills[best] >= minMarkFill && margin >= 0.055 && z >= 0.55;
    const soft =
      fills[best] >= softFillFloor &&
      margin >= 0.055 * 1.15 &&
      z >= 0.7 &&
      grays[best] <= 225 &&
      (omrRatios[best] >= 0.078 || fills[best] >= softFillFloor * 1.05);
    const marked = !doubleMark && grays[best] <= 225 && (solid || soft) ? row.options[best].option : undefined;
    got.push(marked);
    if (marked === key[row.question - 1]) correct++;
  }
  return { got, correct, total: key.length };
}

function runCase(name, layout, truth, photoBuilder) {
  const { photo, photoW, photoH, expectedCorners } = photoBuilder(layout, truth);
  const corners = findCorners(photo, photoW, photoH);
  if (!corners) {
    console.error(`FAIL [${name}]: corners not found`);
    process.exit(1);
  }
  if (expectedCorners) {
    for (const key of Object.keys(expectedCorners)) {
      const err = Math.hypot(corners[key].x - expectedCorners[key].x, corners[key].y - expectedCorners[key].y);
      if (err > 40) {
        console.error(`FAIL [${name}]: ${key} off by ${err.toFixed(1)}px`, corners[key], expectedCorners[key]);
        process.exit(1);
      }
    }
  }
  const outW = 1000;
  const outH = Math.round(outW / layout.aspectRatio);
  const canonical = warp(photo, photoW, photoH, corners, outW, outH, layout.corners);
  const result = readAnswers(canonical, outW, outH, layout, truth);
  console.log(`[${name}] Corners :`, JSON.stringify(corners));
  console.log(`[${name}] Expected:`, truth.join(' '));
  console.log(`[${name}] Got     :`, result.got.map((g) => g || '-').join(' '));
  console.log(`[${name}] Score   : ${result.correct}/${result.total}`);
  if (result.correct !== result.total) {
    // Dump first-row fills for diagnosis
    console.error(`FAIL [${name}]: oracle did not recover all answers`);
    process.exit(1);
  }
}

const layout = buildLayout(10);
const truth = ['A', 'B', 'C', 'D', 'E', 'C', 'B', 'D', 'B', 'A'];

const CORNER_IDS = { topLeft: 0, topRight: 1, bottomRight: 2, bottomLeft: 3 };

function buildSheet(layout, truth, { aruco = true, ink = 25, fillScale = 1 } = {}) {
  const sheetW = 800;
  const sheetH = Math.round(sheetW / layout.aspectRatio);
  const sheet = new Uint8Array(sheetW * sheetH).fill(245);
  const size = MARK * sheetW;
  for (const key of Object.keys(layout.corners)) {
    const p = layout.corners[key];
    if (aruco) paintAruco(sheet, sheetW, sheetH, p.xPct * sheetW, p.yPct * sheetH, size, CORNER_IDS[key]);
    else paintSquare(sheet, sheetW, sheetH, p.xPct * sheetW, p.yPct * sheetH, size, 20);
  }
  for (let qi = 0; qi < layout.rows.length; qi++) {
    const bubble = layout.rows[qi].options.find((o) => o.option === truth[qi]);
    const r = layout.bubbleRadiusPct * sheetW * 0.9 * fillScale;
    paintDisk(sheet, sheetW, sheetH, bubble.xPct * sheetW, bubble.yPct * sheetH, r, ink);
  }
  return { sheet, sheetW, sheetH };
}

function projectSheetToPhoto(layout, sheet, sheetW, sheetH, photoW, photoH, dst, desk = 190) {
  const photo = new Uint8Array(photoW * photoH).fill(desk);
  const src = {
    topLeft: { x: layout.corners.topLeft.xPct * sheetW, y: layout.corners.topLeft.yPct * sheetH },
    topRight: { x: layout.corners.topRight.xPct * sheetW, y: layout.corners.topRight.yPct * sheetH },
    bottomLeft: { x: layout.corners.bottomLeft.xPct * sheetW, y: layout.corners.bottomLeft.yPct * sheetH },
    bottomRight: { x: layout.corners.bottomRight.xPct * sheetW, y: layout.corners.bottomRight.yPct * sheetH },
  };
  const Hdst = computeHomography(dst);
  const Hsrc = computeHomography(src);
  const invUnit = (H, x, y) => {
    let u = 0.5;
    let v = 0.5;
    for (let i = 0; i < 12; i++) {
      const p = toPixel(H, u, v);
      const eps = 1e-3;
      const pu = toPixel(H, u + eps, v);
      const pv = toPixel(H, u, v + eps);
      const dxdu = (pu.x - p.x) / eps;
      const dxdv = (pv.x - p.x) / eps;
      const dydu = (pu.y - p.y) / eps;
      const dydv = (pv.y - p.y) / eps;
      const det = dxdu * dydv - dxdv * dydu;
      if (Math.abs(det) < 1e-9) break;
      u += ((x - p.x) * dydv - (y - p.y) * dxdv) / det;
      v += (-(x - p.x) * dydu + (y - p.y) * dxdu) / det;
    }
    return { u, v };
  };
  for (let sy = 0; sy < sheetH; sy++) {
    for (let sx = 0; sx < sheetW; sx++) {
      const { u, v } = invUnit(Hsrc, sx, sy);
      const p = toPixel(Hdst, u, v);
      const px = Math.round(p.x);
      const py = Math.round(p.y);
      if (px >= 0 && py >= 0 && px < photoW && py < photoH) photo[py * photoW + px] = sheet[sy * sheetW + sx];
    }
  }
  return photo;
}

// Case 1: mild keystone with ArUco markers (dense project — no holes in fiducials)
runCase('skew-mild', layout, truth, (layout, truth) => {
  const { sheet, sheetW, sheetH } = buildSheet(layout, truth, { aruco: true });
  const photoW = 1200;
  const photoH = 1600;
  const dst = {
    topLeft: { x: 180, y: 220 },
    topRight: { x: 180 + sheetW * 0.85, y: 220 + 25 },
    bottomLeft: { x: 180 + 40, y: 220 + sheetH * 0.9 },
    bottomRight: { x: 180 + sheetW * 0.85 + 40, y: 220 + sheetH * 0.9 + 25 },
  };
  const photo = projectSheetToPhoto(layout, sheet, sheetW, sheetH, photoW, photoH, dst, 190);
  return { photo, photoW, photoH, expectedCorners: null };
});

// Case 2: strong device-like perspective + ArUco + filled bubbles trying to steal BL
runCase('device-perspective', layout, truth, (layout, truth) => {
  const { sheet, sheetW, sheetH } = buildSheet(layout, truth, { aruco: true });
  const photoW = 1600;
  const photoH = 2133;
  const dst = {
    topLeft: { x: 136, y: 1163 },
    topRight: { x: 1207, y: 1277 },
    bottomLeft: { x: 441, y: 2050 },
    bottomRight: { x: 1201, y: 2098 },
  };
  const photo = projectSheetToPhoto(layout, sheet, sheetW, sheetH, photoW, photoH, dst, 190);
  return { photo, photoW, photoH, expectedCorners: dst };
});

// Case 3: two-column sheet (26 questions) — layout parity with app MAX_ROWS_PER_COLUMN=25
const layout2col = buildLayout(26);
const truth2 = 'A B C D E C B D B A A B C D E C B D B A A B C D E C'.split(' ');
runCase('two-column-26', layout2col, truth2, (layout, truth) => {
  const { sheet, sheetW, sheetH } = buildSheet(layout, truth, { aruco: true });
  const photoW = 1200;
  const photoH = Math.round(photoW / layout.aspectRatio);
  const dst = {
    topLeft: { x: photoW * 0.08, y: photoH * 0.1 },
    topRight: { x: photoW * 0.9, y: photoH * 0.12 },
    bottomRight: { x: photoW * 0.92, y: photoH * 0.9 },
    bottomLeft: { x: photoW * 0.1, y: photoH * 0.88 },
  };
  const photo = projectSheetToPhoto(layout, sheet, sheetW, sheetH, photoW, photoH, dst, 245);
  return { photo, photoW, photoH, expectedCorners: dst };
});

// Case 4: light blue-like ink (~120) + partial fill (~55% radius) — priority A
runCase('light-partial-ink', layout, truth, (layout, truth) => {
  const { sheet, sheetW, sheetH } = buildSheet(layout, truth, { aruco: true, ink: 120, fillScale: 0.55 });
  const photoW = 1200;
  const photoH = 1600;
  const dst = {
    topLeft: { x: 180, y: 220 },
    topRight: { x: 180 + sheetW * 0.85, y: 220 + 25 },
    bottomLeft: { x: 180 + 40, y: 220 + sheetH * 0.9 },
    bottomRight: { x: 180 + sheetW * 0.85 + 40, y: 220 + sheetH * 0.9 + 25 },
  };
  const photo = projectSheetToPhoto(layout, sheet, sheetW, sheetH, photoW, photoH, dst, 190);
  return { photo, photoW, photoH, expectedCorners: null };
});

console.log('OK: oracle pipeline recovered 100% on all cases');
