import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors, typography } from '../../theme/tokens';

type Variant = keyof typeof typography.scale;
type Weight = keyof typeof typography.fontFamily;

export type TextProps = RNTextProps & {
  variant?: Variant;
  weight?: Weight;
  color?: string;
};

export function Text({ variant = 'body', weight, color, style, ...rest }: TextProps) {
  const resolvedWeight: Weight = weight ?? (variant === 'hero' || variant === 'h1' ? 'bold' : 'regular');
  return (
    <RNText
      style={[
        styles.base,
        typography.scale[variant],
        { fontFamily: typography.fontFamily[resolvedWeight], color: color ?? colors.textPrimary },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
  },
});
