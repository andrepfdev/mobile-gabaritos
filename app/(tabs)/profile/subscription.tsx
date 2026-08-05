import React from 'react';
import { Alert, FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { PillButton } from '../../../components/ui/PillButton';
import { StatusTag } from '../../../components/ui/StatusTag';
import { colors, spacing } from '../../../theme/tokens';
import { useCancelSubscription, useSubscription } from '../../../api/subscriptions';
import { usePayments } from '../../../api/payments';

const SUBSCRIPTION_URL = 'https://provazero.app.br/login';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pagamento pendente',
  AUTHORIZED: 'Ativa',
  PAUSED: 'Pausada',
  CANCELED: 'Cancelada',
  PAST_DUE: 'Pagamento em atraso',
};

// Plain-language explanation for each status, so the teacher understands what's happening
// without needing to know payment-gateway jargon (see AGENTS.md "Feedback visível ao usuário").
const STATUS_DESCRIPTION: Record<string, string> = {
  PENDING: 'Estamos aguardando a confirmação do seu pagamento. Isso pode levar alguns minutos.',
  PAUSED: 'Sua assinatura está pausada e não está sendo cobrada no momento.',
  CANCELED: 'Sua assinatura foi cancelada e não será renovada.',
  PAST_DUE: 'Não conseguimos confirmar seu último pagamento. Verifique seus dados de pagamento no site.',
};

const STATUS_DOT_COLOR: Record<string, string> = {
  PENDING: colors.tagYellow,
  AUTHORIZED: colors.success,
  PAUSED: colors.tagYellow,
  CANCELED: colors.tagGray,
  PAST_DUE: colors.danger,
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
                    Status
                  </Text>
                  <StatusTag
                    label={STATUS_LABEL[subscription.status] ?? subscription.status}
                    dotColor={STATUS_DOT_COLOR[subscription.status] ?? colors.tagYellow}
                  />
                </View>
                {STATUS_DESCRIPTION[subscription.status] ? (
                  <Text variant="body" color="#c9c9c9" style={styles.periodText}>
                    {STATUS_DESCRIPTION[subscription.status]}
                  </Text>
                ) : null}
                {subscription.status === 'AUTHORIZED' && subscription.currentPeriodEnd ? (
                  <Text variant="body" color="#c9c9c9" style={styles.periodText}>
                    {`Renova em ${new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR')}`}
                  </Text>
                ) : null}
                {subscription.status !== 'CANCELED' ? (
                  <PillButton
                    title="Cancelar assinatura"
                    variant="light"
                    onPress={onCancel}
                    disabled={cancelSubscription.isPending}
                  />
                ) : null}
              </Card>
            ) : (
              <Card variant="light" style={styles.card}>
                <Text variant="body">Nenhuma assinatura ativa.</Text>
                {/* Compliance: no pricing/plan name/"subscribe" CTA here — subscribing happens on
                    the web. A bare link out (no checkout, no price) is the allowed exception, see
                    AGENTS.md and components/subscription/NoActiveSubscriptionCard.tsx. */}
                <Pressable
                  onPress={() => Linking.openURL(SUBSCRIPTION_URL)}
                  hitSlop={8}
                  style={styles.subscribeLink}
                >
                  <Text variant="body" weight="medium" color={colors.coral} style={styles.subscribeLinkText}>
                    Gerenciar assinatura
                  </Text>
                </Pressable>
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
  subscribeLink: {
    marginTop: spacing.sm,
  },
  subscribeLinkText: {
    textDecorationLine: 'underline',
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
