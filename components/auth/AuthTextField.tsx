import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';

export type AuthTextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthTextField({ label, error, style, onFocus, onBlur, ...rest }: AuthTextFieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="caption" weight="medium" color={colors.textMuted} style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        style={[styles.input, focused && styles.inputFocused, error && styles.inputError, style]}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.grayLight,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.progressTrack,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputFocused: {
    borderColor: colors.coral,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    marginTop: spacing.xs,
  },
});
