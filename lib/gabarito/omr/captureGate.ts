import OmrOpencv from 'omr-opencv';
import { isNativeArucoAvailable } from './nativeAruco';
import { findCornerMarksScored } from './corners';
import { loadGrayImage } from './loadGray';

export type CaptureGateResult =
  | { ok: true; ids: number[]; motor: 'OpenCV-ArUco' | 'JS-ArUco' }
  | { ok: false; reason: string; ids: number[]; motor: 'OpenCV-ArUco' | 'JS-ArUco' };

/**
 * Pre-check before navigating to scan-result: require ArUco IDs 0–3 (G12).
 * Prefer native OpenCV when available; otherwise JS decoder on the capture JPEG.
 */
export async function gateCaptureAruco(photoUri: string): Promise<CaptureGateResult> {
  if (isNativeArucoAvailable() && OmrOpencv?.detectArucoCorners) {
    // Try upright first — avoid 4× full decode on the common path (was a major lag source).
    const flips = ['none', 'xy', 'x', 'y'] as const;
    let bestIds: number[] = [];
    for (const flip of flips) {
      try {
        const det = await OmrOpencv.detectArucoCorners(photoUri, flip);
        const ids = [...new Set((det.markers ?? []).map((m) => m.id).filter((id) => id >= 0 && id <= 3))].sort(
          (a, b) => a - b,
        );
        if (ids.length > bestIds.length) bestIds = ids;
        if (det.complete || (ids.includes(0) && ids.includes(1) && ids.includes(2) && ids.includes(3))) {
          return { ok: true, ids: [0, 1, 2, 3], motor: 'OpenCV-ArUco' };
        }
      } catch {
        /* try next flip */
      }
    }
    return {
      ok: false,
      reason: `OpenCV viu só IDs [${bestIds.join(', ') || 'nenhum'}]. Precisa 0–3 nos cantos da grade.`,
      ids: bestIds,
      motor: 'OpenCV-ArUco',
    };
  }

  try {
    const { gray, width, height } = await loadGrayImage(photoUri);
    const found = findCornerMarksScored(gray, width, height);
    if (found && found.ids.length >= 4) {
      return { ok: true, ids: found.ids, motor: 'JS-ArUco' };
    }
    return {
      ok: false,
      reason: `ArUco incompleto ([${found?.ids.join(', ') || 'nenhum'}]). Reenquadre as 4 marcas.`,
      ids: found?.ids ?? [],
      motor: 'JS-ArUco',
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Falha ao validar marcas na captura.',
      ids: [],
      motor: 'JS-ArUco',
    };
  }
}
