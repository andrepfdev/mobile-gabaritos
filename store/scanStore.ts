import { create } from 'zustand';

type ScanStore = {
  photoUri: string | null;
  setPhotoUri: (uri: string | null) => void;
};

/** Holds the last captured gabarito photo in memory only — never persisted, discarded after review. */
export const useScanStore = create<ScanStore>((set) => ({
  photoUri: null,
  setPhotoUri: (photoUri) => set({ photoUri }),
}));
