export type ArucoPoint = {
  x: number;
  y: number;
};

export type NativeArucoMarker = {
  id: number;
  center: ArucoPoint;
  corners: ArucoPoint[];
};

export type NativeOmrErrorCode =
  | ''
  | 'incomplete_markers'
  | 'buffer_mismatch'
  | 'native_throw'
  | 'unavailable'
  | 'init_failed';

export type NativeArucoDetection = {
  available: boolean;
  width: number;
  height: number;
  markers: NativeArucoMarker[];
  arucoScore?: number;
  complete?: boolean;
  errorCode?: NativeOmrErrorCode | string;
};

export type NativeOmrWarpResult = {
  available: boolean;
  complete: boolean;
  errorCode?: NativeOmrErrorCode | string;
  width: number;
  height: number;
  markers: NativeArucoMarker[];
  flipMode: 'none' | 'x' | 'y' | 'xy';
  arucoScore: number;
  warpedWidth: number;
  warpedHeight: number;
  /** Raw grayscale bytes (length = warpedWidth * warpedHeight), delivered as a real Uint8Array (no base64). */
  warpedGray: Uint8Array;
};

export type ArucoFlipMode = 'none' | 'x' | 'y' | 'xy';
