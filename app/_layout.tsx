import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
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
import { Text } from '../components/ui/Text';
import { PillButton } from '../components/ui/PillButton';
import { colors, spacing } from '../theme/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts(fontAssets);
  const hydrateAuth = useAuthStore((s) => s.hydrate);
  const authHydrated = useAuthStore((s) => s.hydrated);
  const logout = useAuthStore((s) => s.logout);
  const userId = useAuthStore((s) => s.user?.id);
  const hydrateExams = useExamStore((s) => s.hydrate);
  const examsHydratedUserId = useExamStore((s) => s.hydratedUserId);
  const examsError = useExamStore((s) => s.hydrateError);
  const hydrateClasses = useClassStore((s) => s.hydrate);
  const classesHydratedUserId = useClassStore((s) => s.hydratedUserId);
  const classesError = useClassStore((s) => s.hydrateError);

  useEffect(() => {
    hydrateAuth();
    setSessionExpiredHandler(() => logout());
  }, [hydrateAuth, logout]);

  const retryLocalData = React.useCallback(() => {
    if (!userId) return;
    hydrateExams(userId);
    hydrateClasses(userId);
  }, [userId, hydrateExams, hydrateClasses]);

  useEffect(() => {
    retryLocalData();
  }, [retryLocalData]);

  const hasError = !!(examsError || classesError);
  const ready =
    fontsLoaded && authHydrated && (!userId || (examsHydratedUserId === userId && classesHydratedUserId === userId));

  useEffect(() => {
    if (ready || hasError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, hasError]);

  if (hasError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text variant="h2" weight="bold" style={styles.errorTitle}>
          Não foi possível abrir o app
        </Text>
        <Text variant="body" color={colors.textMuted} style={styles.errorMessage}>
          {examsError ?? classesError}
        </Text>
        <PillButton title="Tentar novamente" onPress={retryLocalData} />
      </SafeAreaView>
    );
  }

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

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.bgCream,
  },
  errorTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  errorMessage: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
