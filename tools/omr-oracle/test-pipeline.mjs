/**
 * Offline oracle (Node): synthetic sheet with 4 corner marks + filled bubbles,
 * including a stress case where filled bubbles compete with fiducials for "extreme"
 * corners. Proves corner→warp→relative-fill before device testing.
 *
 * Run: npm run omr:oracle
 */

const CORNER_INSET = 0.04;
const MARK = 0.05;
const HEADER = 0.115;
const GRID_TOP_GAP = 0.02;
const ROW_H = 0.082;
const BOTTOM = CORNER_INSET + MARK;
const LABEL_RATIO = 0.09;
const PITCH = 2.2;
const BUBBLE_H = 0.85;
const PAD = 0.02;

function buildLayout(questionCount, options = ['A', 'B', 'C', 'D', 'E']) {
  const columnWidthW = 1 - 2 * CORNER_INSET;
  const labelWidthW = columnWidthW * LABEL_RATIO;
  const maxD = (columnWidthW - labelWidthW) / ((options.length - 1) * PITCH + 1);
  const bubbleD = Math.min(ROW_H * BUBBLE_H, maxD);
  const bubbleR = bubbleD / 2;
  const pitch = bubbleD * PITCH;
  const gridTop = HEADER + GRID_TOP_GAP;
  const totalH = gridTop + questionCount * ROW_H + BOTTOM;
  const toY = (v) => v / totalH;
  const rows = [];
  for (let q = 1; q <= questionCount; q++) {
    const rowCenter = gridTop + (q - 1) * ROW_H + ROW_H / 2;
    const groupLeft = CORNER_INSET + columnWidthW * PAD;
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
      topLeft: { xPct: CORNER_INSET, yPct: toY(CORNER_INSET) },
      topRight: { xPct: 1 - CORNER_INSET, yPct: toY(CORNER_INSET) },
      bottomLeft: { xPct: CORNER_INSET, yPct: toY(totalH - CORNER_INSET) },
      bottomRight: { xPct: 1 - CORNER_INSET, yPct: toY(totalH - CORNER_INSET) },
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

function normalize(v, min, max) {
  return (v - min) / (max - min);
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
      if (fill < 0.22 || fill > 0.97) continue;
      if (fill > 0.73 && fill < 0.87) continue;
      candidates.push({
        center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
        size: (bw + bh) / 2,
        fill,
      });
    }
  }
  if (candidates.length < 4) return null;

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

function warp(gray, width, height, corners, outW, outH) {
  const H = computeHomography(corners);
  const out = new Uint8Array(outW * outH);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const p = toPixel(H, x / (outW - 1), y / (outH - 1));
      out[y * outW + x] = Math.round(sampleBilinear(gray, width, height, p.x, p.y));
    }
  }
  return out;
}

function scoreBubble(gray, width, height, cx0, cy0, radius, searchRadius) {
  const step = Math.max(2, Math.round(searchRadius / 3));
  let bestFill = -1;
  for (let dy = -searchRadius; dy <= searchRadius; dy += step) {
    for (let dx = -searchRadius; dx <= searchRadius; dx += step) {
      if (dx * dx + dy * dy > searchRadius * searchRadius) continue;
      const cx = cx0 + dx;
      const cy = cy0 + dy;
      const vals = [];
      const paper = [];
      const r = Math.max(2, Math.round(radius));
      const r2 = r * r;
      const in2 = (r * 1.15) * (r * 1.15);
      const out2 = (r * 1.75) * (r * 1.75);
      for (let y = Math.floor(cy - r * 1.75); y <= Math.ceil(cy + r * 1.75); y++) {
        for (let x = Math.floor(cx - r * 1.75); x <= Math.ceil(cx + r * 1.75); x++) {
          if (x < 0 || y < 0 || x >= width || y >= height) continue;
          const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
          if (d <= r2) vals.push(gray[y * width + x]);
          else if (d > in2 && d <= out2) paper.push(gray[y * width + x]);
        }
      }
      if (!vals.length) continue;
      vals.sort((a, b) => a - b);
      const n = Math.max(1, Math.round(vals.length * 0.35));
      let s = 0;
      for (let i = 0; i < n; i++) s += vals[i];
      const inner = s / n;
      const pap = paper.length ? paper.reduce((a, b) => a + b, 0) / paper.length : 245;
      const fill = Math.max(0, Math.min(1, (pap - inner) / 255));
      if (fill > bestFill) bestFill = fill;
    }
  }
  return Math.max(0, bestFill);
}

function readAnswers(gray, width, height, layout, key) {
  const uMin = layout.corners.topLeft.xPct;
  const uMax = layout.corners.topRight.xPct;
  const vMin = layout.corners.topLeft.yPct;
  const vMax = layout.corners.bottomLeft.yPct;
  const radius = layout.bubbleRadiusPct * width * 0.62;
  const pitch = layout.bubbleRadiusPct * 2 * 2.2 * width;
  const search = pitch * 0.28;
  let correct = 0;
  const got = [];
  for (const row of layout.rows) {
    const fills = row.options.map((b) => {
      const cx = normalize(b.xPct, uMin, uMax) * (width - 1);
      const cy = normalize(b.yPct, vMin, vMax) * (height - 1);
      return scoreBubble(gray, width, height, cx, cy, radius, search);
    });
    let best = 0;
    for (let i = 1; i < fills.length; i++) if (fills[i] > fills[best]) best = i;
    const sorted = [...fills].sort((a, b) => b - a);
    const mean = fills.reduce((a, b) => a + b, 0) / fills.length;
    const std = Math.sqrt(fills.reduce((a, b) => a + (b - mean) * (b - mean), 0) / fills.length);
    const margin = sorted[0] - sorted[1];
    const z = std > 0.02 ? (fills[best] - mean) / std : fills[best] - mean > 0.12 ? 3 : 0;
    const marked = margin >= 0.1 && z >= 1.05 && fills[best] >= 0.12 ? row.options[best].option : undefined;
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
  const canonical = warp(photo, photoW, photoH, corners, outW, outH);
  const result = readAnswers(canonical, outW, outH, layout, truth);
  console.log(`[${name}] Expected:`, truth.join(' '));
  console.log(`[${name}] Got     :`, result.got.map((g) => g || '-').join(' '));
  console.log(`[${name}] Score   : ${result.correct}/${result.total}`);
  if (result.correct !== result.total) {
    console.error(`FAIL [${name}]: oracle did not recover all answers`);
    process.exit(1);
  }
}

const layout = buildLayout(10);
const truth = ['A', 'B', 'C', 'D', 'E', 'C', 'B', 'D', 'B', 'A'];

function buildSheet(layout, truth) {
  const sheetW = 800;
  const sheetH = Math.round(sheetW / layout.aspectRatio);
  const sheet = new Uint8Array(sheetW * sheetH).fill(245);
  const size = MARK * sheetW;
  for (const key of Object.keys(layout.corners)) {
    const p = layout.corners[key];
    paintSquare(sheet, sheetW, sheetH, p.xPct * sheetW, p.yPct * sheetH, size, 20);
  }
  for (let qi = 0; qi < layout.rows.length; qi++) {
    const bubble = layout.rows[qi].options.find((o) => o.option === truth[qi]);
    const r = layout.bubbleRadiusPct * sheetW * 0.9;
    paintDisk(sheet, sheetW, sheetH, bubble.xPct * sheetW, bubble.yPct * sheetH, r, 25);
  }
  return { sheet, sheetW, sheetH };
}

// Case 1: mild keystone (legacy oracle)
runCase('skew-mild', layout, truth, (layout, truth) => {
  const { sheet, sheetW, sheetH } = buildSheet(layout, truth);
  const photoW = 1200;
  const photoH = 1600;
  const photo = new Uint8Array(photoW * photoH).fill(30);
  const marginX = 180;
  const marginY = 220;
  for (let y = 0; y < sheetH; y++) {
    for (let x = 0; x < sheetW; x++) {
      const u = x / sheetW;
      const v = y / sheetH;
      const px = Math.round(marginX + u * (sheetW * 0.85) + v * 40);
      const py = Math.round(marginY + v * (sheetH * 0.9) + u * 25);
      if (px >= 0 && py >= 0 && px < photoW && py < photoH) photo[py * photoW + px] = sheet[y * sheetW + x];
    }
  }
  return { photo, photoW, photoH, expectedCorners: null };
});

// Case 2: strong device-like perspective + filled bubbles trying to steal BL
runCase('device-perspective', layout, truth, (layout, truth) => {
  const { sheet, sheetW, sheetH } = buildSheet(layout, truth);
  const photoW = 1600;
  const photoH = 2133;
  // Desk must stay lighter than ink so Otsu doesn't glue the whole frame into one blob.
  const photo = new Uint8Array(photoW * photoH).fill(190);
  const dst = {
    topLeft: { x: 136, y: 1163 },
    topRight: { x: 1207, y: 1277 },
    bottomLeft: { x: 441, y: 2050 },
    bottomRight: { x: 1201, y: 2098 },
  };
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
      const ex = x - p.x;
      const ey = y - p.y;
      u += (ex * dydv - ey * dxdv) / det;
      v += (-ex * dydu + ey * dxdu) / det;
    }
    return { u, v };
  };
  for (let sy = 0; sy < sheetH; sy++) {
    for (let sx = 0; sx < sheetW; sx++) {
      const { u, v } = invUnit(Hsrc, sx, sy);
      const p = toPixel(Hdst, u, v);
      const px = Math.round(p.x);
      const py = Math.round(p.y);
      if (px >= 0 && py >= 0 && px < photoW && py < photoH) {
        photo[py * photoW + px] = sheet[sy * sheetW + sx];
      }
    }
  }
  return { photo, photoW, photoH, expectedCorners: dst };
});

console.log('OK: oracle pipeline recovered 100% on all cases');
