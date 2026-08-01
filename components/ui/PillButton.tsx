import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from './Text';

export type PillButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'dark' | 'outline' | 'light' | 'accent';
  disabled?: boolean;
  icon?: React.ReactNode;
};

export function PillButton({ title, onPress, variant = 'dark', disabled, icon }: PillButtonProps) {
  const isDark = variant === 'dark';
  const isOutline = variant === 'outline';
  const isAccent = variant === 'accent';
  const onFilled = isDark || isAccent;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        isDark && { backgroundColor: colors.dark },
        isAccent && { backgroundColor: colors.coral },
        isOutline && { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.dark },
        variant === 'light' && { backgroundColor: colors.white },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text
        variant="body"
        weight="medium"
        color={onFilled ? colors.textOnDark : colors.textPrimary}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    marginRight: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
