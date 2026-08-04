import React, { useEffect } from 'react';
import { Platform } from 'react-native';
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
import { useClassStore } from '../store/classStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

if (Platform.OS === 'android') {
  // Dark icons for the (now edge-to-edge, transparent) system nav bar — matches our light cream
  // background. The gray contrast scrim Android draws behind it by default is disabled via the
  // `enforceContrast: false` config plugin option in app.json.
  // Native module — the dev client needs a rebuild after the dependency was added before this
  // works, so this is guarded to avoid crashing on a client that hasn't been rebuilt yet.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NavigationBar } = require('expo-navigation-bar');
    NavigationBar.setStyle('dark');
  } catch {
    // Not available in this build yet — skip silently.
  }
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const logout = useAuthStore((s) => s.logout);
  const hydrateExams = useExamStore((s) => s.hydrate);
  const examsHydrated = useExamStore((s) => s.hydrated);
  const hydrateClasses = useClassStore((s) => s.hydrate);
  const classesHydrated = useClassStore((s) => s.hydrated);

  useEffect(() => {
    hydrateAuth();
    hydrateExams();
    hydrateClasses();
    setSessionExpiredHandler(() => logout());
  }, [hydrateAuth, hydrateExams, hydrateClasses, logout]);

  const ready = fontsLoaded && authHydrated && examsHydrated && classesHydrated;

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
