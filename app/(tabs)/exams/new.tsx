import React, { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text } from '../../../components/ui/Text';
import { AuthTextField } from '../../../components/auth/AuthTextField';
import { PillButton } from '../../../components/ui/PillButton';
import { colors, radii, spacing } from '../../../theme/tokens';
import { useExamStore } from '../../../store/examStore';
import { useCanCreateExam } from '../../../hooks/useCanCreateExam';
import { generateExamCode } from '../../../lib/gabarito/code';

const MAX_QUESTIONS = 15;

function parseIsoDate(iso: string): Date | undefined {
  if (!iso) return undefined;
  const parsed = new Date(`${iso}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [optionsCount, setOptionsCount] = useState<4 | 5>(5);

  const questionCountExceedsMax = Number(questionCount) > MAX_QUESTIONS;

  const onSubmit = async () => {
    if (!title.trim() || !questionCount.trim()) return;
    const id = `exam-${Date.now()}`;
    await createExam({
      id,
      title: title.trim(),
      subject: subject.trim() || undefined,
      className: className.trim() || undefined,
      questionCount: Math.min(MAX_QUESTIONS, Math.max(1, Number(questionCount) || 10)),
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
          error={questionCountExceedsMax ? `Máximo de ${MAX_QUESTIONS} questões` : undefined}
        />
        <Text variant="caption" weight="medium" color={colors.textMuted} style={styles.dateLabel}>
          Prazo
        </Text>
        <Pressable style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
          <Text variant="body" color={dueDate ? colors.textPrimary : colors.textMuted}>
            {dueDate ? parseIsoDate(dueDate)?.toLocaleDateString('pt-BR') : 'Selecionar data de entrega'}
          </Text>
        </Pressable>
        {showDatePicker ? (
          <DateTimePicker
            value={parseIsoDate(dueDate) ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (event.type === 'set' && selectedDate) {
                setDueDate(toIsoDate(selectedDate));
              }
            }}
          />
        ) : null}
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
  dateLabel: {
    marginBottom: spacing.xs,
  },
  dateInput: {
    backgroundColor: colors.grayLight,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.progressTrack,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.md,
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
