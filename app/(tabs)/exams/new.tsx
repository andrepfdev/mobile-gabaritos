import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { AuthTextField } from '../../../components/auth/AuthTextField';
import { PillButton } from '../../../components/ui/PillButton';
import { colors, spacing } from '../../../theme/tokens';
import { useExamStore } from '../../../store/examStore';
import { useCanCreateExam } from '../../../hooks/useCanCreateExam';
import { generateExamCode } from '../../../lib/gabarito/code';

export default function NewExam() {
  const router = useRouter();
  const createExam = useExamStore((s) => s.createExam);
  const examCount = useExamStore((s) => s.exams.length);
  const { canCreate } = useCanCreateExam();

  useEffect(() => {
    if (!canCreate) {
      router.replace('/exams/paywall');
    }
  }, [canCreate, router]);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [questionCount, setQuestionCount] = useState('10');
  const [dueDate, setDueDate] = useState('');
  const [optionsCount, setOptionsCount] = useState<4 | 5>(5);

  const onSubmit = async () => {
    if (!title.trim() || !questionCount.trim()) return;
    const id = `exam-${Date.now()}`;
    await createExam({
      id,
      title: title.trim(),
      subject: subject.trim() || undefined,
      className: className.trim() || undefined,
      questionCount: Math.max(1, Number(questionCount) || 10),
      dueDate: dueDate.trim() || undefined,
      createdAt: new Date().toISOString(),
      priority: 'none',
      status: 'to_correct',
      students: [],
      code: generateExamCode(subject.trim() || undefined, examCount + 1),
      optionsCount,
    });
    router.replace(`/exams/${id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold" style={styles.title}>
          Nova prova
        </Text>
        <AuthTextField label="Título" value={title} onChangeText={setTitle} placeholder="Avaliação de Matemática" />
        <AuthTextField label="Disciplina" value={subject} onChangeText={setSubject} placeholder="Matemática" />
        <AuthTextField label="Turma" value={className} onChangeText={setClassName} placeholder="9º Ano B" />
        <AuthTextField
          label="Número de questões"
          value={questionCount}
          onChangeText={setQuestionCount}
          keyboardType="number-pad"
        />
        <AuthTextField
          label="Prazo (AAAA-MM-DD)"
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="2026-08-15"
        />
        <Text variant="caption" weight="medium" color={colors.textMuted} style={styles.optionsLabel}>
          Alternativas por questão
        </Text>
        <View style={styles.optionsRow}>
          <PillButton
            title="A, B, C, D"
            variant={optionsCount === 4 ? 'accent' : 'outline'}
            onPress={() => setOptionsCount(4)}
          />
          <PillButton
            title="A, B, C, D, E"
            variant={optionsCount === 5 ? 'accent' : 'outline'}
            onPress={() => setOptionsCount(5)}
          />
        </View>
        <PillButton title="Criar prova" onPress={onSubmit} />
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
    marginBottom: spacing.md,
  },
  optionsLabel: {
    marginBottom: spacing.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
});
