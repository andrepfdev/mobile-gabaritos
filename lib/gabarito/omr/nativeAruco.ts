import OmrOpencv from 'omr-opencv';
import { ARUCO_CORNER_IDS } from '../arucoPatterns';
import { CornerQuad, PixelPoint, quadLooksPlausible } from './geometry';

export type NativeArucoMotor = 'OpenCV-ArUco' | 'JS-ArUco';

export type NativeOmrErrorCode =
  | 'incomplete_markers'
  | 'buffer_mismatch'
  | 'native_throw'
  | 'unavailable'
  | 'init_failed';

export class NativeOmrError extends Error {
  code: NativeOmrErrorCode;
  imageWidth?: number;
  imageHeight?: number;
  markersFound: number[];
  arucoScore?: number;

  constructor(
    code: NativeOmrErrorCode,
    message: string,
    info?: {
      imageWidth?: number;
      imageHeight?: number;
      markersFound?: number[];
      arucoScore?: number;
    },
  ) {
    super(message);
    this.name = 'NativeOmrError';
    this.code = code;
    this.imageWidth = info?.imageWidth;
    this.imageHeight = info?.imageHeight;
    this.markersFound = info?.markersFound ?? [];
    this.arucoScore = info?.arucoScore;
  }
}

export type NativeOmrWarpHit = {
  corners: CornerQuad;
  score: number;
  ids: number[];
  flipMode: 'none' | 'x' | 'y' | 'xy';
  detectWidth: number;
  detectHeight: number;
  warpedWidth: number;
  warpedHeight: number;
  warpedGray: Uint8Array;
};

type LayoutCornerPct = {
  topLeft: { xPct: number; yPct: number };
  topRight: { xPct: number; yPct: number };
  bottomRight: { xPct: number; yPct: number };
  bottomLeft: { xPct: number; yPct: number };
};

type NativeMarker = {
  id: number;
  center: PixelPoint;
  corners?: PixelPoint[];
};

function markerSize(marker: NativeMarker): number {
  const pts = marker.corners;
  if (!pts || pts.length < 4) return 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

function pickMarkersById(markers: NativeMarker[]) {
  const byId = new Map<number, NativeMarker>();
  for (const m of markers) {
    const prev = byId.get(m.id);
    if (!prev || markerSize(m) > markerSize(prev)) byId.set(m.id, m);
  }
  return {
    tl: byId.get(ARUCO_CORNER_IDS.topLeft),
    tr: byId.get(ARUCO_CORNER_IDS.topRight),
    br: byId.get(ARUCO_CORNER_IDS.bottomRight),
    bl: byId.get(ARUCO_CORNER_IDS.bottomLeft),
  };
}

/** Map IDs→CornerQuad. When `requirePlausible` is false, trust native 4/4 and skip JS recheck. */
function cornersFromMarkers(
  markers: NativeMarker[],
  requirePlausible: boolean,
): { corners: CornerQuad; score: number; ids: number[] } | null {
  const { tl, tr, br, bl } = pickMarkersById(markers);
  if (!tl || !tr || !br || !bl) return null;

  const corners: CornerQuad = {
    topLeft: tl.center,
    topRight: tr.center,
    bottomRight: br.center,
    bottomLeft: bl.center,
  };

  if (requirePlausible) {
    if (!quadLooksPlausible(corners)) return null;
    if (corners.topLeft.x >= corners.topRight.x || corners.bottomLeft.x >= corners.bottomRight.x) return null;
    if (corners.topLeft.y >= corners.bottomLeft.y || corners.topRight.y >= corners.bottomRight.y) return null;
  }

  return {
    corners,
    score: 400 + markerSize(tl) + markerSize(tr) + markerSize(br) + markerSize(bl),
    ids: [tl.id, tr.id, br.id, bl.id],
  };
}

export function isNativeArucoAvailable(): boolean {
  try {
    return OmrOpencv?.isAvailable() === true;
  } catch {
    return false;
  }
}

/**
 * Full native path: OpenCV detect (CLAHE/SUBPIX/multi-flip) + warpPerspective.
 * Throws NativeOmrError with typed codes — never swallows native failures as "null".
 */
export async function detectAndWarpNativeOmr(
  imageUri: string,
  outWidth: number,
  outHeight: number,
  layoutCorners: LayoutCornerPct,
): Promise<NativeOmrWarpHit> {
  if (!OmrOpencv) {
    throw new NativeOmrError('unavailable', 'Módulo OpenCV nativo não está linkado neste build.');
  }
  if (!isNativeArucoAvailable()) {
    throw new NativeOmrError(
      'init_failed',
      'OpenCV nativo não inicializou. Reinstale o APK/dev-client (Expo Go não inclui o módulo).',
    );
  }

  let result;
  try {
    result = await OmrOpencv.detectAndWarpOmr(imageUri, {
      outWidth,
      outHeight,
      tlXPct: layoutCorners.topLeft.xPct,
      tlYPct: layoutCorners.topLeft.yPct,
      trXPct: layoutCorners.topRight.xPct,
      trYPct: layoutCorners.topRight.yPct,
      brXPct: layoutCorners.bottomRight.xPct,
      brYPct: layoutCorners.bottomRight.yPct,
      blXPct: layoutCorners.bottomLeft.xPct,
      blYPct: layoutCorners.bottomLeft.yPct,
    });
  } catch (error) {
    throw new NativeOmrError(
      'native_throw',
      error instanceof Error ? error.message : 'Falha nativa no OpenCV ao analisar a foto.',
    );
  }

  const markersFound = (result?.markers ?? []).map((m) => m.id);
  const imageWidth = result?.width ?? 0;
  const imageHeight = result?.height ?? 0;

  if (!result?.available) {
    throw new NativeOmrError('unavailable', 'OpenCV reportou unavailable.', {
      imageWidth,
      imageHeight,
      markersFound,
    });
  }

  if (!result.complete || !result.warpedGray || result.warpedGray.length === 0) {
    throw new NativeOmrError(
      'incomplete_markers',
      `OpenCV não encontrou as 4 marcas ArUco (IDs 0–3). Detectados: [${markersFound.join(', ') || 'nenhum'}].`,
      {
        imageWidth,
        imageHeight,
        markersFound,
        arucoScore: result.arucoScore,
      },
    );
  }

  const expected = result.warpedWidth * result.warpedHeight;
  const warpedGray = result.warpedGray;
  if (warpedGray.length !== expected) {
    throw new NativeOmrError(
      'buffer_mismatch',
      `Buffer canônico inválido (${warpedGray.length} bytes, esperado ${expected}).`,
      { imageWidth, imageHeight, markersFound },
    );
  }

  // Native already required 4/4 + plausible quad — don't discard warp on JS recheck.
  const mapped = cornersFromMarkers(result.markers, false);
  if (!mapped) {
    throw new NativeOmrError(
      'incomplete_markers',
      'OpenCV marcou complete mas faltam centros dos IDs 0–3 no payload.',
      { imageWidth, imageHeight, markersFound, arucoScore: result.arucoScore },
    );
  }

  const flipMode = (['none', 'x', 'y', 'xy'] as const).includes(result.flipMode)
    ? result.flipMode
    : 'none';

  return {
    corners: mapped.corners,
    score: Number(result.arucoScore) || mapped.score,
    ids: mapped.ids,
    flipMode,
    detectWidth: imageWidth,
    detectHeight: imageHeight,
    warpedWidth: result.warpedWidth,
    warpedHeight: result.warpedHeight,
    warpedGray,
  };
}
