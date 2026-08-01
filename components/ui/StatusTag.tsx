import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from './Text';

export type StatusTagProps = {
  label: string;
  dotColor?: string;
  bg?: string;
  textColor?: string;
};

export function StatusTag({ label, dotColor, bg = colors.grayLight, textColor = colors.textPrimary }: StatusTagProps) {
  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      {dotColor ? <View style={[styles.dot, { backgroundColor: dotColor }]} /> : null}
      <Text variant="caption" weight="medium" color={textColor}>
        {label}
      </Text>
    </View>
  );
}

StatusTag.Medium = function MediumPriorityTag() {
  return <StatusTag label="Média" dotColor={colors.tagYellow} bg={colors.tagYellowBg} />;
};

StatusTag.Waiting = function WaitingTag() {
  return <StatusTag label="Em espera" dotColor={colors.tagGray} bg={colors.tagGrayBg} />;
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacing.xs,
  },
});
