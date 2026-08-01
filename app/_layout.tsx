import React, { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Slot } from 'expo-router';
import { fontAssets } from '../theme/fonts';
import { queryClient } from '../api/queryClient';
import { setSessionExpiredHandler } from '../api/authInterceptor';
import { useAuthStore } from '../store/authStore';
import { useExamStore } from '../store/examStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const logout = useAuthStore((s) => s.logout);
  const hydrateExams = useExamStore((s) => s.hydrate);
  const examsHydrated = useExamStore((s) => s.hydrated);

  useEffect(() => {
    hydrateAuth();
    hydrateExams();
    setSessionExpiredHandler(() => logout());
  }, [hydrateAuth, hydrateExams, logout]);

  const ready = fontsLoaded && authHydrated && examsHydrated;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Slot />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
