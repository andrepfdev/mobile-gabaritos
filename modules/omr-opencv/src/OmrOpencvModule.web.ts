import { NativeModule, registerWebModule } from 'expo';
import type { DetectAndWarpOptions } from './OmrOpencvModule';
import type { ArucoFlipMode, NativeArucoDetection, NativeOmrWarpResult } from './OmrOpencv.types';

class OmrOpencvModule extends NativeModule {
  isAvailable(): boolean {
    return false;
  }

  async detectArucoCorners(_imageUri: string, _flipMode: ArucoFlipMode): Promise<NativeArucoDetection> {
    return { available: false, width: 0, height: 0, markers: [] };
  }

  async detectAndWarpOmr(_imageUri: string, options: DetectAndWarpOptions): Promise<NativeOmrWarpResult> {
    return {
      available: false,
      complete: false,
      errorCode: 'unavailable',
      width: 0,
      height: 0,
      markers: [],
      flipMode: 'none',
      arucoScore: 0,
      warpedWidth: options.outWidth,
      warpedHeight: options.outHeight,
      warpedGrayBase64: '',
    };
  }
}

export default registerWebModule(OmrOpencvModule, 'OmrOpencv');
