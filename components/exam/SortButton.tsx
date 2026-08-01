import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';

export type SortButtonProps = {
  label?: string;
  onPress: () => void;
};

export function SortButton({ label = 'Ordenar por', onPress }: SortButtonProps) {
  return (
    <Pressable onPress={onPress} style={styles.base}>
      <Ionicons name="swap-vertical" size={14} color={colors.textPrimary} style={styles.icon} />
      <Text variant="caption" weight="medium">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayLight,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
  },
  icon: {
    marginRight: spacing.xs,
  },
});
