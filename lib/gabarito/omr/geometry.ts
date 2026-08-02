export type PixelPoint = { x: number; y: number };

export type CornerQuad = {
  topLeft: PixelPoint;
  topRight: PixelPoint;
  bottomLeft: PixelPoint;
  bottomRight: PixelPoint;
};

export type Homography = {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  g: number;
  h: number;
};

/** Unit square (0,0)-(1,0)-(1,1)-(0,1) → photo quad. */
export function computeHomography(corners: CornerQuad): Homography {
  const x0 = corners.topLeft.x;
  const y0 = corners.topLeft.y;
  const x1 = corners.topRight.x;
  const y1 = corners.topRight.y;
  const x2 = corners.bottomRight.x;
  const y2 = corners.bottomRight.y;
  const x3 = corners.bottomLeft.x;
  const y3 = corners.bottomLeft.y;

  const dx1 = x1 - x2;
  const dy1 = y1 - y2;
  const dx2 = x3 - x2;
  const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;

  const denom = dx1 * dy2 - dy1 * dx2;
  const g = denom !== 0 ? (sx * dy2 - sy * dx2) / denom : 0;
  const h = denom !== 0 ? (dx1 * sy - dy1 * sx) / denom : 0;

  return {
    a: x1 - x0 + g * x1,
    b: x3 - x0 + h * x3,
    c: x0,
    d: y1 - y0 + g * y1,
    e: y3 - y0 + h * y3,
    f: y0,
    g,
    h,
  };
}

export function toPixel(homography: Homography, u: number, v: number): PixelPoint {
  const w = homography.g * u + homography.h * v + 1;
  return {
    x: (homography.a * u + homography.b * v + homography.c) / w,
    y: (homography.d * u + homography.e * v + homography.f) / w,
  };
}

export function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

export function sampleBilinear(gray: Uint8Array, width: number, height: number, x: number, y: number): number {
  if (x < 0 || y < 0 || x >= width - 1 || y >= height - 1) {
    const xi = Math.min(width - 1, Math.max(0, Math.round(x)));
    const yi = Math.min(height - 1, Math.max(0, Math.round(y)));
    return gray[yi * width + xi];
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const fx = x - x0;
  const fy = y - y0;
  const v00 = gray[y0 * width + x0];
  const v10 = gray[y0 * width + x1];
  const v01 = gray[y1 * width + x0];
  const v11 = gray[y1 * width + x1];
  return v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;
}

/**
 * Warps the photo so the detected corner marks land on the four corners of the output image.
 * Bubble layout percentages are then remapped with the same corner-inset normalization used before.
 */
export function warpToCanonical(
  gray: Uint8Array,
  width: number,
  height: number,
  corners: CornerQuad,
  outWidth: number,
  outHeight: number,
): Uint8Array {
  const homography = computeHomography(corners);
  const out = new Uint8Array(outWidth * outHeight);
  const maxU = Math.max(1, outWidth - 1);
  const maxV = Math.max(1, outHeight - 1);

  for (let y = 0; y < outHeight; y++) {
    const v = y / maxV;
    for (let x = 0; x < outWidth; x++) {
      const u = x / maxU;
      const src = toPixel(homography, u, v);
      out[y * outWidth + x] = Math.round(sampleBilinear(gray, width, height, src.x, src.y));
    }
  }
  return out;
}

export function quadLooksPlausible(corners: CornerQuad): boolean {
  const left = Math.hypot(corners.bottomLeft.x - corners.topLeft.x, corners.bottomLeft.y - corners.topLeft.y);
  const right = Math.hypot(corners.bottomRight.x - corners.topRight.x, corners.bottomRight.y - corners.topRight.y);
  const top = Math.hypot(corners.topRight.x - corners.topLeft.x, corners.topRight.y - corners.topLeft.y);
  const bottom = Math.hypot(corners.bottomRight.x - corners.bottomLeft.x, corners.bottomRight.y - corners.bottomLeft.y);
  const sideRatio = Math.max(left, right) / Math.max(1, Math.min(left, right));
  const topBottomRatio = Math.max(top, bottom) / Math.max(1, Math.min(top, bottom));
  return sideRatio <= 3.5 && topBottomRatio <= 3.5 && top > 20 && left > 20;
}
