import React from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { PillButton } from '../../../components/ui/PillButton';
import { StatusTag } from '../../../components/ui/StatusTag';
import { colors, spacing } from '../../../theme/tokens';
import { useCancelSubscription, useSubscription } from '../../../api/subscriptions';
import { usePayments } from '../../../api/payments';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  AUTHORIZED: 'Ativa',
  PAUSED: 'Pausada',
  CANCELED: 'Cancelada',
  PAST_DUE: 'Em atraso',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  IN_PROCESS: 'Em processamento',
  REJECTED: 'Rejeitado',
  REFUNDED: 'Reembolsado',
  CANCELLED: 'Cancelado',
};

export default function SubscriptionScreen() {
  const { data: subscription, isLoading } = useSubscription();
  const { data: payments } = usePayments();
  const cancelSubscription = useCancelSubscription();

  const onCancel = async () => {
    try {
      await cancelSubscription.mutateAsync();
    } catch {
      Alert.alert(
        'Não foi possível cancelar',
        'Não conseguimos cancelar sua assinatura agora. Tente novamente mais tarde ou entre em contato com o suporte.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={payments ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <Text variant="h1" weight="bold" style={styles.title}>
              Assinatura
            </Text>

            {isLoading ? (
              <Text variant="body" color={colors.textMuted}>
                Carregando...
              </Text>
            ) : subscription ? (
              <Card variant="dark" style={styles.card}>
                <View style={styles.statusRow}>
                  <Text variant="h2" weight="bold" color={colors.white}>
                    Plano ativo
                  </Text>
                  <StatusTag
                    label={STATUS_LABEL[subscription.status] ?? subscription.status}
                    dotColor={subscription.status === 'AUTHORIZED' ? colors.success : colors.tagYellow}
                  />
                </View>
                {subscription.currentPeriodEnd ? (
                  <Text variant="body" color="#c9c9c9" style={styles.periodText}>
                    {`Renova em ${new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}`}
                  </Text>
                ) : null}
                <PillButton
                  title="Cancelar assinatura"
                  variant="light"
                  onPress={onCancel}
                  disabled={cancelSubscription.isPending}
                />
              </Card>
            ) : (
              <Card variant="grayLight" style={styles.card}>
                <Text variant="body">Nenhuma assinatura ativa.</Text>
                {/* Compliance: no pricing/CTA to subscribe here — subscribing happens on the web. */}
              </Card>
            )}

            <Text variant="h2" weight="bold" style={styles.sectionTitle}>
              Histórico de pagamentos
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card variant="light" style={styles.paymentCard}>
            <Text variant="body" weight="medium">
              {PAYMENT_STATUS_LABEL[item.status] ?? item.status}
            </Text>
            <Text variant="caption" color={colors.textMuted}>
              {new Date(item.createdAt).toLocaleDateString('pt-BR')}
            </Text>
          </Card>
        )}
        ListEmptyComponent={
          <Text variant="body" color={colors.textMuted}>
            Nenhum pagamento registrado ainda.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCream,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 140,
  },
  title: {
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  periodText: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
});
