import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '../../theme/tokens';
import { Text } from '../ui/Text';
import { AlternativeSelector, AlternativeSelectorMode } from './AlternativeSelector';

const DEFAULT_OPTIONS = ['A', 'B', 'C', 'D', 'E'];

export type AnswerGridProps = {
  questionCount: number;
  answers: Record<number, string>;
  answerKey?: Record<number, string>;
  onChange?: (questionIndex: number, value: string) => void;
  mode: AlternativeSelectorMode;
  options?: string[];
};

export function AnswerGrid({
  questionCount,
  answers,
  answerKey,
  onChange,
  mode,
  options = DEFAULT_OPTIONS,
}: AnswerGridProps) {
  return (
    <View>
      {Array.from({ length: questionCount }, (_, i) => i + 1).map((questionNumber) => {
        const index = questionNumber - 1;
        return (
          <View key={index} style={styles.row}>
            <Text variant="body" weight="medium" color={colors.textPrimary} style={styles.label}>
              {`Q${questionNumber}`}
            </Text>
            <AlternativeSelector
              options={options}
              selected={answers[index]}
              correctValue={answerKey?.[index]}
              mode={mode}
              onSelect={(value) => onChange?.(index, value)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.progressTrack,
  },
  label: {
    width: 40,
  },
});
