import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { ArucoFlipMode, NativeArucoDetection, NativeOmrWarpResult } from './OmrOpencv.types';

export type DetectAndWarpOptions = {
  outWidth: number;
  outHeight: number;
  tlXPct: number;
  tlYPct: number;
  trXPct: number;
  trYPct: number;
  brXPct: number;
  brYPct: number;
  blXPct: number;
  blYPct: number;
};

declare class OmrOpencvModule extends NativeModule {
  isAvailable(): boolean;
  detectArucoCorners(imageUri: string, flipMode: ArucoFlipMode): Promise<NativeArucoDetection>;
  detectAndWarpOmr(imageUri: string, options: DetectAndWarpOptions): Promise<NativeOmrWarpResult>;
}

/** Null when the native binary is missing (Expo Go / web without stub). */
export default requireOptionalNativeModule<OmrOpencvModule>('OmrOpencv');
