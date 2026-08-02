/**
 * TypeScript-only shim for jpeg-js (no Node Buffer in the public surface).
 * Mapped from "jpeg-js" via tsconfig paths so the package's index.d.ts is never loaded.
 */
export type RawImageData<T> = {
  width: number;
  height: number;
  data: T;
};

export function decode(
  jpegData: ArrayBuffer | Uint8Array,
  opts: {
    useTArray: true;
    colorTransform?: boolean;
    formatAsRGBA?: boolean;
    tolerantDecoding?: boolean;
    maxResolutionInMP?: number;
    maxMemoryUsageInMB?: number;
  },
): RawImageData<Uint8Array> & { comments?: string[] };

export function decode(
  jpegData: ArrayBuffer | Uint8Array,
  opts?: {
    useTArray?: false;
    colorTransform?: boolean;
    formatAsRGBA?: boolean;
    tolerantDecoding?: boolean;
    maxResolutionInMP?: number;
    maxMemoryUsageInMB?: number;
  },
): RawImageData<Uint8Array> & { comments?: string[] };

export function encode(
  imgData: RawImageData<ArrayBuffer | Uint8Array> & { comments?: string[] },
  quality?: number,
): RawImageData<Uint8Array>;
