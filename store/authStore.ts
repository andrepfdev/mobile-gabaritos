import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearTokens, getAccessToken, setTokens } from '../api/tokenStorage';
import { STORAGE_KEYS } from '../lib/localDb/schema';
import { User } from '../api/types';

type AuthStore = {
  hydrated: boolean;
  isAuthenticated: boolean;
  hasSeenOnboarding: boolean;
  user: User | null;

  hydrate: () => Promise<void>;
  login: (tokens: { accessToken: string; refreshToken: string }, user: User) => Promise<void>;
  logout: () => Promise<void>;
  markOnboardingSeen: () => Promise<void>;
  setUser: (user: User) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  hydrated: false,
  isAuthenticated: false,
  hasSeenOnboarding: false,
  user: null,

  hydrate: async () => {
    const [accessToken, onboardingSeen] = await Promise.all([
      getAccessToken(),
      AsyncStorage.getItem(STORAGE_KEYS.onboardingSeen),
    ]);
    set({
      isAuthenticated: !!accessToken,
      hasSeenOnboarding: onboardingSeen === 'true',
      hydrated: true,
    });
  },

  login: async (tokens, user) => {
    await setTokens(tokens.accessToken, tokens.refreshToken);
    set({ isAuthenticated: true, user });
  },

  logout: async () => {
    await clearTokens();
    set({ isAuthenticated: false, user: null });
  },

  markOnboardingSeen: async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.onboardingSeen, 'true');
    set({ hasSeenOnboarding: true });
  },

  setUser: (user) => set({ user }),
}));
