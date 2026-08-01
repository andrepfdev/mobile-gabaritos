import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radii, shadow, spacing } from '../../theme/tokens';

export type CardVariant = 'light' | 'pink' | 'dark' | 'grayLight' | 'cream' | 'accent';

const bgByVariant: Record<CardVariant, string> = {
  light: colors.white,
  pink: colors.coralSoft,
  dark: colors.dark,
  grayLight: colors.grayLight,
  cream: colors.yellowSoft,
  accent: colors.coral,
};

export type CardProps = ViewProps & {
  variant?: CardVariant;
  padded?: boolean;
};

export function Card({ variant = 'light', padded = true, style, children, ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: bgByVariant[variant] },
        padded && styles.padded,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    ...shadow.card,
  },
  padded: {
    padding: spacing.md,
  },
});
