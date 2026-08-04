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
import { useClassStore } from '../store/classStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const logout = useAuthStore((s) => s.logout);
  const userId = useAuthStore((s) => s.user?.id);
  const hydrateExams = useExamStore((s) => s.hydrate);
  const examsHydratedUserId = useExamStore((s) => s.hydratedUserId);
  const hydrateClasses = useClassStore((s) => s.hydrate);
  const classesHydratedUserId = useClassStore((s) => s.hydratedUserId);

  useEffect(() => {
    hydrateAuth();
    setSessionExpiredHandler(() => logout());
  }, [hydrateAuth, logout]);

  useEffect(() => {
    if (!userId) return;
    hydrateExams(userId);
    hydrateClasses(userId);
  }, [userId, hydrateExams, hydrateClasses]);

  const ready =
    fontsLoaded && authHydrated && (!userId || (examsHydratedUserId === userId && classesHydratedUserId === userId));

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
