import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { NoActiveSubscriptionCard } from '../../../components/subscription/NoActiveSubscriptionCard';
import { PillButton } from '../../../components/ui/PillButton';
import { colors, spacing } from '../../../theme/tokens';
import { FREE_EXAM_LIMIT } from '../../../hooks/useCanCreateExam';
import { useSubscriptionStatus } from '../../../hooks/useSubscriptionStatus';

export default function Paywall() {
  const router = useRouter();
  const { refetch, isLoading } = useSubscriptionStatus();
  const [verifying, setVerifying] = useState(false);

  const onVerify = async () => {
    setVerifying(true);
    try {
      const { data } = await refetch();
      if (data?.activeSubscription?.status === 'AUTHORIZED') {
        router.back();
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <NoActiveSubscriptionCard
          title={`Limite de ${FREE_EXAM_LIMIT} provas grátis atingido`}
          onVerify={onVerify}
          verifying={verifying || isLoading}
        />
        <PillButton title="Voltar" variant="outline" onPress={() => router.back()} />
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
