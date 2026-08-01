import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';

export type AssigneeSelectorProps = {
  name: string;
  initials: string;
  onPress: () => void;
};

export function AssigneeSelector({ name, initials, onPress }: AssigneeSelectorProps) {
  return (
    <Pressable onPress={onPress} style={styles.base}>
      <View style={styles.avatar}>
        <Text variant="caption" weight="medium" color={colors.white}>
          {initials}
        </Text>
      </View>
      <Text variant="caption" weight="medium" style={styles.name}>
        {name}
      </Text>
      <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayLight,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingRight: spacing.sm,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  name: {
    marginRight: spacing.xs,
  },
});
