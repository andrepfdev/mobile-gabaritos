import React from 'react';
import { Linking, Pressable, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { PillButton } from '../ui/PillButton';
import { colors, spacing } from '../../theme/tokens';

export type NoActiveSubscriptionCardProps = {
  title?: string;
  onVerify: () => void;
  verifying?: boolean;
};

const SUBSCRIPTION_URL = 'https://provazero.app.br/login';

/**
 * Compliance-critical: this card must never show a price, a plan name with a value, or a
 * "buy"/"subscribe"/"upgrade" button — subscribing happens entirely on the web, outside the app,
 * and any of that in-app risks App Store Guideline 3.1.1 / Google Play Payments Policy rejection.
 * The one exception is the plain text link below: a bare link out to the website (no checkout
 * embedded, no price, no purchase-flavored copy, no URL spelled out in the label — generic
 * "Gerenciar assinatura" wording) is the standard "Reader App" pattern both stores accept — it's
 * just pointing somewhere else, not selling anything here. Keep everything else in this card
 * limited to "check status" only; any other action (logout, back) belongs outside this card,
 * rendered by the screen that uses it.
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
      <Pressable onPress={() => Linking.openURL(SUBSCRIPTION_URL)} hitSlop={8} style={styles.link}>
        <Text variant="body" weight="medium" color={colors.coral} style={styles.linkText}>
          Gerenciar assinatura
        </Text>
      </Pressable>
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
  link: {
    marginTop: spacing.md,
    alignSelf: 'center',
  },
  linkText: {
    textDecorationLine: 'underline',
  },
});
