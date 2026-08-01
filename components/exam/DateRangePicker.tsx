import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';

export type DateRangePickerProps = {
  label: string; // e.g. "13 Fev – 6 Mar"
  onPress: () => void;
};

export function DateRangePicker({ label, onPress }: DateRangePickerProps) {
  return (
    <Pressable onPress={onPress} style={styles.base}>
      <Ionicons name="calendar-outline" size={14} color={colors.textPrimary} style={styles.icon} />
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
