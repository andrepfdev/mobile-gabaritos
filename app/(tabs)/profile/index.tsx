import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { PillButton } from '../../../components/ui/PillButton';
import { AuthTextField } from '../../../components/auth/AuthTextField';
import { StatusTag } from '../../../components/ui/StatusTag';
import { colors, spacing } from '../../../theme/tokens';
import { useCurrentUser, useUpdateMe } from '../../../api/users';
import { useAuthStore } from '../../../store/authStore';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  AUTHORIZED: 'Ativa',
  PAUSED: 'Pausada',
  CANCELED: 'Cancelada',
  PAST_DUE: 'Em atraso',
};

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export default function Profile() {
  const router = useRouter();
  const { data: user, isLoading } = useCurrentUser();
  const updateMe = useUpdateMe();
  const logout = useAuthStore((s) => s.logout);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const onStartEditing = () => {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setError(null);
    setEditing(true);
  };

  const onSave = async () => {
    if (!name.trim()) {
      setError('Informe seu nome.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Informe um e-mail válido.');
      return;
    }
    setError(null);
    await updateMe.mutateAsync({ name: name.trim(), email: email.trim() });
    setEditing(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold" style={styles.title}>
          Perfil
        </Text>

        <Card variant="light" style={styles.card}>
          {isLoading ? (
            <Text variant="body" color={colors.textMuted}>
              Carregando...
            </Text>
          ) : editing ? (
            <View>
              <AuthTextField label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />
              <AuthTextField
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                keyboardType="email-address"
                error={error ?? undefined}
              />
              <View style={styles.editActions}>
                <PillButton title="Salvar" variant="accent" onPress={onSave} disabled={updateMe.isPending} />
                <PillButton title="Cancelar" variant="outline" onPress={() => setEditing(false)} />
              </View>
            </View>
          ) : (
            <View>
              <Text variant="h2" weight="bold">
                {user?.name}
              </Text>
              <Text variant="body" color={colors.textMuted} style={styles.email}>
                {user?.email}
              </Text>
              <PillButton title="Editar dados" variant="outline" onPress={onStartEditing} />
            </View>
          )}
        </Card>

        <Card variant="cream" style={styles.card}>
          <View style={styles.subscriptionHeader}>
            <Text variant="h2" weight="bold">
              Assinatura
            </Text>
            {user?.activeSubscription ? (
              <StatusTag
                label={STATUS_LABEL[user.activeSubscription.status] ?? user.activeSubscription.status}
                dotColor={user.activeSubscription.status === 'AUTHORIZED' ? colors.success : colors.tagYellow}
              />
            ) : null}
          </View>
          <Text variant="body" color={colors.textMuted} style={styles.subscriptionSubtitle}>
            {user?.activeSubscription
              ? 'Gerencie sua assinatura e veja o histórico de pagamentos.'
              : 'Você ainda não tem uma assinatura ativa.'}
          </Text>
          <View style={styles.subscriptionActions}>
            <PillButton title="Ver assinatura" variant="accent" onPress={() => router.push('/profile/subscription')} />
          </View>
        </Card>

        <PillButton title="Sair" variant="outline" onPress={onLogout} />
      </ScrollView>
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
    marginBottom: spacing.md,
  },
  email: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  subscriptionActions: {
    alignItems: 'flex-start',
  },
});
