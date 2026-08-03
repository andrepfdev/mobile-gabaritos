import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AuthFormLayout } from '../../components/auth/AuthFormLayout';
import { AuthTextField } from '../../components/auth/AuthTextField';
import { PillButton } from '../../components/ui/PillButton';
import { Text } from '../../components/ui/Text';
import { colors, spacing } from '../../theme/tokens';
import { useRegister } from '../../api/auth';
import { ApiError } from '../../api/client';

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const register = useRegister();

  const onSubmit = async () => {
    setError(undefined);
    if (password !== confirmPassword) {
      setError('As senhas digitadas são diferentes.');
      return;
    }
    try {
      await register.mutateAsync({ name, email, password });
      router.replace('/(tabs)/exams');
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.issues?.[0]?.message ?? apiError.message);
    }
  };

  return (
    <AuthFormLayout title="Criar conta" subtitle="Cadastre-se para começar a corrigir suas provas.">
      <AuthTextField label="Nome" value={name} onChangeText={setName} placeholder="Ana Souza" />
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
        placeholder="Mínimo 8 caracteres"
      />
      <AuthTextField
        label="Confirmar senha"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        placeholder="Digite a senha novamente"
      />
      {error ? (
        <Text variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </Text>
      ) : null}
      <PillButton title="Cadastrar" onPress={onSubmit} disabled={register.isPending} />
      <View style={styles.footer}>
        <Text variant="body" color={colors.textMuted}>
          Já tem conta?{' '}
        </Text>
        <Link href="/(auth)/login">
          <Text variant="body" weight="medium">
            Entrar
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
