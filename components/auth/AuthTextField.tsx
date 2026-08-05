import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';

export type AuthTextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function AuthTextField({
  label,
  error,
  style,
  onFocus,
  onBlur,
  secureTextEntry,
  ...rest
}: AuthTextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPasswordField = !!secureTextEntry;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="caption" weight="medium" color={colors.textMuted} style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.inputRow, focused && styles.inputRowFocused, error && styles.inputRowError]}>
        <TextInput
          style={[styles.input, isPasswordField && styles.inputWithIcon, style]}
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
          secureTextEntry={isPasswordField && !passwordVisible}
          {...rest}
        />
        {isPasswordField ? (
          <Pressable
            style={styles.icon}
            onPress={() => setPasswordVisible((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
          >
            <Ionicons
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
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
  inputRow: {
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.progressTrack,
    backgroundColor: colors.grayLight,
    overflow: 'hidden',
  },
  inputRowFocused: {
    borderColor: colors.yellow,
  },
  inputRowError: {
    borderColor: colors.danger,
  },
  input: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.textPrimary,
  },
  inputWithIcon: {
    paddingRight: spacing.xl,
  },
  icon: {
    position: 'absolute',
    right: spacing.md,
  },
  error: {
    marginTop: spacing.xs,
  },
});
