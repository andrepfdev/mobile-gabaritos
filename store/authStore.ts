import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearTokens, getAccessToken, setTokens } from '../api/tokenStorage';
import { STORAGE_KEYS } from '../lib/localDb/schema';
import { User } from '../api/types';
import { queryClient } from '../api/queryClient';
import { useExamStore } from './examStore';
import { useClassStore } from './classStore';

type CalibrationTourStep = 'card' | 'export' | 'done';

function calibrationTourKey(userId: string): string {
  return `@provazero/calibrationTourSeen:${userId}`;
}

type AuthStore = {
  hydrated: boolean;
  isAuthenticated: boolean;
  hasSeenOnboarding: boolean;
  user: User | null;
  /** One-time in-app tour pointing at the seeded "Gabarito de Calibração" (see
   *  components/tour/TourHint.tsx), guiding the teacher to print and scan it before real exams.
   *  Tracked per account (like `user`), not per device (like `hasSeenOnboarding`), since a second
   *  account on the same device has its own fresh calibration exam to be guided through. */
  calibrationTourStep: CalibrationTourStep;

  hydrate: () => Promise<void>;
  login: (tokens: { accessToken: string; refreshToken: string }, user: User) => Promise<void>;
  logout: () => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
  setUser: (user: User) => void;
  advanceCalibrationTour: () => void;
  skipCalibrationTour: () => void;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  hydrated: false,
  isAuthenticated: false,
  hasSeenOnboarding: false,
  user: null,
  calibrationTourStep: 'done',

  hydrate: async () => {
    const [accessToken, onboardingSeen, storedUserJson] = await Promise.all([
      getAccessToken(),
      AsyncStorage.getItem(STORAGE_KEYS.onboardingSeen),
      AsyncStorage.getItem(STORAGE_KEYS.currentUser),
    ]);
    const user = accessToken && storedUserJson ? (JSON.parse(storedUserJson) as User) : null;
    const tourSeen = user ? await AsyncStorage.getItem(calibrationTourKey(user.id)) : null;
    set({
      isAuthenticated: !!accessToken,
      user,
      hasSeenOnboarding: onboardingSeen === 'true',
      calibrationTourStep: tourSeen === 'true' ? 'done' : 'card',
      hydrated: true,
    });
  },

  login: async (tokens, user) => {
    const [, , tourSeen] = await Promise.all([
      setTokens(tokens.accessToken, tokens.refreshToken),
      AsyncStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user)),
      AsyncStorage.getItem(calibrationTourKey(user.id)),
    ]);
    set({ isAuthenticated: true, user, calibrationTourStep: tourSeen === 'true' ? 'done' : 'card' });
  },

  logout: async () => {
    await Promise.all([clearTokens(), AsyncStorage.removeItem(STORAGE_KEYS.currentUser)]);
    set({ isAuthenticated: false, user: null, calibrationTourStep: 'done' });
    useExamStore.getState().reset();
    useClassStore.getState().reset();
    queryClient.clear();
  },

  markOnboardingSeen: async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.onboardingSeen, 'true');
    set({ hasSeenOnboarding: true });
  },

  setUser: (user) => {
    AsyncStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user)).catch(() => {});
    set({ user });
  },

  advanceCalibrationTour: () => {
    const { calibrationTourStep, user } = get();
    if (calibrationTourStep === 'card') {
      set({ calibrationTourStep: 'export' });
    } else if (calibrationTourStep === 'export' && user) {
      AsyncStorage.setItem(calibrationTourKey(user.id), 'true').catch(() => {});
      set({ calibrationTourStep: 'done' });
    }
  },

  skipCalibrationTour: () => {
    const { user } = get();
    if (user) {
      AsyncStorage.setItem(calibrationTourKey(user.id), 'true').catch(() => {});
    }
    set({ calibrationTourStep: 'done' });
  },
}));
