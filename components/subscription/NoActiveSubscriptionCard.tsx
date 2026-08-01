import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { PillButton } from '../ui/PillButton';
import { colors, spacing } from '../../theme/tokens';

export type NoActiveSubscriptionCardProps = {
  title?: string;
  onVerify: () => void;
  verifying?: boolean;
};

/**
 * Compliance-critical: this card must never show a price, a "buy"/"subscribe" button, or an
 * external link to a sales page. Subscribing happens entirely on the web, outside the app —
 * showing any of that in-app risks App Store Guideline 3.1.1 / Google Play Payments Policy
 * rejection. Keep the copy neutral and limited to "check status" only; any other action
 * (logout, back) belongs outside this card, rendered by the screen that uses it.
 */
export function NoActiveSubscriptionCard({
  title = 'Assinatura não encontrada',
  onVerify,
  verifying,
}: NoActiveSubscriptionCardProps) {
  return (
    <Card variant="dark" style={styles.card}>
      <Text variant="h1" weight="bold" color={colors.white}>
        {title}
      </Text>
      <Text variant="body" color={colors.white} style={styles.subtitle}>
        Sua conta não possui uma assinatura ativa no momento. Se você já assinou via web, aguarde
        alguns instantes e toque em &quot;Verificar Assinatura&quot;.
      </Text>
      <PillButton
        title={verifying ? 'Verificando...' : 'Verificar Assinatura'}
        variant="light"
        onPress={onVerify}
        disabled={verifying}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
