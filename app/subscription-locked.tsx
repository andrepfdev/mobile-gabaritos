import React, { useCallback, useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { NoActiveSubscriptionCard } from '../components/subscription/NoActiveSubscriptionCard';
import { PillButton } from '../components/ui/PillButton';
import { colors, spacing } from '../theme/tokens';
import { useSubscriptionStatus } from '../hooks/useSubscriptionStatus';
import { useAuthStore } from '../store/authStore';

/**
 * Hard paywall for accounts whose subscription is no longer active (cancelled, past due,
 * paused). Reached only via the guard in app/(tabs)/_layout.tsx. There is intentionally no
 * "subscribe"/"buy" button or external link here — see NoActiveSubscriptionCard for why.
 */
export default function SubscriptionLocked() {
  const router = useRouter();
  const { hasActiveSubscription, isLoading, refetch } = useSubscriptionStatus();
  const logout = useAuthStore((s) => s.logout);
  const [verifying, setVerifying] = useState(false);

  const checkStatus = useCallback(async () => {
    setVerifying(true);
    try {
      const { data } = await refetch();
      if (data?.activeSubscription?.status === 'AUTHORIZED') {
        router.replace('/(tabs)/exams');
      }
    } finally {
      setVerifying(false);
    }
  }, [refetch, router]);

  // Re-check whenever this screen regains focus (e.g. navigating back to it).
  useFocusEffect(
    useCallback(() => {
      checkStatus();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  // Re-check when the app comes back to the foreground — the realistic case is the teacher
  // subscribing on the website in the browser, then switching back to this app.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkStatus();
    });
    return () => subscription.remove();
  }, [checkStatus]);

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  if (!isLoading && hasActiveSubscription) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <NoActiveSubscriptionCard onVerify={checkStatus} verifying={verifying || isLoading} />
        <PillButton title="Sair" variant="outline" onPress={onLogout} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCream,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
});
