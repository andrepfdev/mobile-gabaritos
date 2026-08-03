import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';

export type AuthFormLayoutProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AuthFormLayout({ title, subtitle, children }: AuthFormLayoutProps) {
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text variant="h1" weight="bold" style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCream,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
});
