import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../../components/ui/Text';
import { PillButton } from '../../../../components/ui/PillButton';
import { AnswerGrid } from '../../../../components/exam/AnswerGrid';
import { colors, spacing } from '../../../../theme/tokens';
import { useExamStore } from '../../../../store/examStore';
import { optionsForCount } from '../../../../lib/gabarito/layout';

export default function AnswerKeyScreen() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();
  const exams = useExamStore((s) => s.exams);
  const answerKeys = useExamStore((s) => s.answerKeys);
  const saveAnswerKey = useExamStore((s) => s.saveAnswerKey);

  const exam = exams.find((e) => e.id === examId);
  const existing = answerKeys.find((k) => k.examId === examId);
  const [answers, setAnswers] = useState<Record<number, string>>(existing?.answers ?? {});

  if (!exam) return null;

  const onChange = (index: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const onSave = async () => {
    await saveAnswerKey({ examId: exam.id, answers });
    router.back();
  };

  const allAnswered = Object.keys(answers).length === exam.questionCount;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold" style={styles.title}>
          Gabarito oficial
        </Text>
        <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
          {exam.title}
        </Text>
        <AnswerGrid
          questionCount={exam.questionCount}
          answers={answers}
          onChange={onChange}
          mode="input"
          options={optionsForCount(exam.optionsCount)}
        />
        <PillButton title="Salvar gabarito" onPress={onSave} disabled={!allAnswered} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCream,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 140,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.md,
  },
});
