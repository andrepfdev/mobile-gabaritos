import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';

export type AlternativeSelectorMode = 'input' | 'review';

export type AlternativeSelectorProps = {
  options: string[];
  selected?: string;
  correctValue?: string;
  onSelect: (value: string) => void;
  mode: AlternativeSelectorMode;
};

export function AlternativeSelector({ options, selected, correctValue, onSelect, mode }: AlternativeSelectorProps) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const isSelected = option === selected;
        let bg: string = colors.grayLight;
        let textColor: string = colors.textPrimary;
        let borderColor: string | undefined;

        if (mode === 'review' && isSelected) {
          const isCorrect = option === correctValue;
          bg = isCorrect ? colors.success : colors.yellow;
          textColor = isCorrect ? colors.white : colors.textPrimary;
        } else if (mode === 'review' && option === correctValue) {
          if (selected === undefined) {
            // Unanswered/unread — outline the correct answer in the error color instead of the
            // usual light-green hint, so it reads as "not detected" rather than just "correct".
            bg = colors.white;
            borderColor = colors.yellow;
          } else {
            bg = '#dceee0';
          }
        } else if (isSelected) {
          bg = colors.dark;
          textColor = colors.white;
        }

        return (
          <Pressable
            key={option}
            disabled={mode === 'review'}
            onPress={() => onSelect(option)}
            style={[
              styles.pill,
              { backgroundColor: bg },
              borderColor ? { borderWidth: 2, borderColor } : null,
            ]}
          >
            <Text variant="caption" weight="medium" color={textColor}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  pill: {
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.xs,
  },
});
