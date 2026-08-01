import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, CardVariant } from './Card';
import { StatusTag } from './StatusTag';
import { Text } from './Text';
import { colors, spacing } from '../../theme/tokens';

export type StatCardProps = {
  variant: CardVariant;
  tag?: { label: string; dotColor?: string };
  value?: string;
  label?: string;
  onPress?: () => void;
  fullWidth?: boolean;
  children?: React.ReactNode;
};

const textColorByVariant: Record<CardVariant, string> = {
  light: colors.textPrimary,
  pink: colors.textPrimary,
  dark: colors.textOnDark,
  grayLight: colors.textPrimary,
  cream: colors.textPrimary,
  accent: colors.textOnDark,
};

const mutedColorByVariant: Record<CardVariant, string> = {
  light: colors.textMuted,
  pink: colors.textPrimary,
  dark: '#c9c9c9',
  grayLight: colors.textPrimary,
  cream: colors.textMuted,
  accent: '#ffe4e4',
};

export function StatCard({ variant, tag, value, label, onPress, fullWidth, children }: StatCardProps) {
  const textColor = textColorByVariant[variant];
  const mutedColor = mutedColorByVariant[variant];

  const content = (
    <Card variant={variant} style={fullWidth ? styles.fullWidth : styles.card}>
      <View style={styles.header}>
        {tag ? <StatusTag label={tag.label} dotColor={tag.dotColor} bg="transparent" textColor={mutedColor} /> : <View />}
        {onPress ? <Text color={mutedColor}>{'›'}</Text> : null}
      </View>
      {value ? (
        <Text variant="hero" weight="bold" color={textColor} style={styles.value}>
          {value}
        </Text>
      ) : null}
      {label ? (
        <Text variant="body" color={mutedColor}>
          {label}
        </Text>
      ) : null}
      {children}
    </Card>
  );

  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
  },
  fullWidth: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  value: {
    marginTop: spacing.xs,
  },
});
