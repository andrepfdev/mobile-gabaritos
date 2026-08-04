import React, { useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
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
      router.replace('/(tabs)/exams');
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
      <Pressable onPress={() => Linking.openURL('https://provazero.app.br/recuperar-senha')} hitSlop={8}>
        <Text variant="caption" color={colors.textMuted} style={styles.forgotPassword}>
          Esqueci minha senha
        </Text>
      </Pressable>
      {error ? (
        <Text variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </Text>
      ) : null}
      <PillButton title="Entrar" onPress={onSubmit} disabled={login.isPending} />
      <View style={styles.footer}>
        <PillButton title="Cadastre-se" variant="outline" onPress={() => router.push('/(auth)/register')} />
      </View>
    </AuthFormLayout>
  );
}

const styles = StyleSheet.create({
  forgotPassword: {
    textAlign: 'right',
    textDecorationLine: 'underline',
    marginBottom: spacing.md,
  },
  error: {
    marginBottom: spacing.md,
  },
  footer: {
    marginTop: spacing.md,
  },
});
