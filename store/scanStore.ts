import { create } from 'zustand';
import { ScanAnswers, ScanDebugInfo } from '../lib/gabarito/scan';

/** Wall-clock split of onCapture, for temporary on-device profiling (debug card only). */
export type ScanTimings = {
  captureMs: number;
  resizeMs: number;
  analyzeMs: number;
  totalMs: number;
};

export type ScanResult = {
  answers: ScanAnswers;
  debug: ScanDebugInfo;
  timings: ScanTimings;
};

type ScanStore = {
  result: ScanResult | null;
  setResult: (result: ScanResult) => void;
  clear: () => void;
};

/** Holds the last analyzed gabarito result in memory only — never persisted, discarded after review. */
export const useScanStore = create<ScanStore>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
