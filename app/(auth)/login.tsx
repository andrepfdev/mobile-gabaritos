import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AuthFormLayout } from '../../components/auth/AuthFormLayout';
import { AuthTextField } from '../../components/auth/AuthTextField';
import { PillButton } from '../../components/ui/PillButton';
import { Text } from '../../components/ui/Text';
import { colors, spacing } from '../../theme/tokens';
import { useLogin } from '../../api/auth';
import { ApiError } from '../../api/client';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const login = useLogin();

  const onSubmit = async () => {
    setError(undefined);
    try {
      await login.mutateAsync({ email, password });
      router.replace('/(tabs)/statistics');
    } catch (err) {
      setError((err as ApiError).message);
    }
  };

  return (
    <AuthFormLayout title="Entrar" subtitle="Acesse sua conta para continuar corrigindo suas provas.">
      <AuthTextField
        label="E-mail"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        placeholder="seu@email.com"
      />
      <AuthTextField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />
      {error ? (
        <Text variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </Text>
      ) : null}
      <PillButton title="Entrar" onPress={onSubmit} disabled={login.isPending} />
      <View style={styles.footer}>
        <Text variant="body" color={colors.textMuted}>
          Não tem conta?{' '}
        </Text>
        <Link href="/(auth)/register">
          <Text variant="body" weight="medium">
            Cadastre-se
          </Text>
        </Link>
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  error: {
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
});
