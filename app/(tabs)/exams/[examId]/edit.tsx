import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text } from '../../../../components/ui/Text';
import { AuthTextField } from '../../../../components/auth/AuthTextField';
import { PillButton } from '../../../../components/ui/PillButton';
import { colors, radii, spacing } from '../../../../theme/tokens';
import { useExamStore } from '../../../../store/examStore';
import { useClassStore } from '../../../../store/classStore';
import { useSubscriptionStatus } from '../../../../hooks/useSubscriptionStatus';
import { isExamPastDue } from '../../../../lib/exam/deadline';

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

export default function EditExam() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();
  const exams = useExamStore((s) => s.exams);
  const examClasses = useExamStore((s) => s.examClasses);
  const examResults = useExamStore((s) => s.examResults);
  const updateExam = useExamStore((s) => s.updateExam);
  const linkExamClasses = useExamStore((s) => s.linkExamClasses);
  const classes = useClassStore((s) => s.classes);
  const { hasActiveSubscription } = useSubscriptionStatus();

  const exam = exams.find((e) => e.id === examId);
  const hasResults = examResults.some((r) => r.examId === examId);
  // Prazo vencido trava a edição do prazo (e do gabarito, na outra tela) só para contas sem
  // assinatura ativa — é uma medida anti-abuso do plano gratuito, não uma limitação do produto.
  const dueDateLocked = !!exam && isExamPastDue(exam) && !hasActiveSubscription;
  const linkedClassIds = useMemo(
    () => examClasses.filter((l) => l.examId === examId).map((l) => l.classId),
    [examClasses, examId],
  );

  const [title, setTitle] = useState(exam?.title ?? '');
  const [subject, setSubject] = useState(exam?.subject ?? '');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>(linkedClassIds);
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const [questionCount, setQuestionCount] = useState(String(exam?.questionCount ?? 10));
  const [dueDate, setDueDate] = useState(exam?.dueDate ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [optionsCount, setOptionsCount] = useState<4 | 5>(exam?.optionsCount ?? 5);

  const questionCountExceedsMax = Number(questionCount) > MAX_QUESTIONS;
  const selectedClasses = classes.filter((c) => selectedClassIds.includes(c.id));

  const toggleClassId = (id: string) => {
    setSelectedClassIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  if (!exam) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text variant="body" style={styles.content}>
          Prova não encontrada.
        </Text>
      </SafeAreaView>
    );
  }

  const onSubmit = async () => {
    if (!title.trim() || !questionCount.trim()) return;
    await updateExam({
      ...exam,
      title: title.trim(),
      subject: subject.trim() || undefined,
      className: selectedClasses.map((c) => c.turma || c.name).join(', ') || undefined,
      questionCount: hasResults
        ? exam.questionCount
        : Math.min(MAX_QUESTIONS, Math.max(1, Number(questionCount) || 10)),
      dueDate: dueDate.trim() || undefined,
      optionsCount: hasResults ? exam.optionsCount : optionsCount,
    });
    await linkExamClasses(exam.id, selectedClassIds);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold" style={styles.title}>
          Editar prova
        </Text>
        <AuthTextField label="Título" value={title} onChangeText={setTitle} placeholder="Avaliação de Matemática" />
        <AuthTextField label="Disciplina" value={subject} onChangeText={setSubject} placeholder="Matemática" />
        <Text variant="caption" weight="medium" color={colors.textMuted} style={styles.dateLabel}>
          Turma(s)
        </Text>
        <Pressable style={styles.dateInput} onPress={() => setClassPickerOpen(true)}>
          <Text variant="body" color={selectedClasses.length > 0 ? colors.textPrimary : colors.textMuted}>
            {selectedClasses.length > 0
              ? selectedClasses.map((c) => c.turma || c.name).join(', ')
              : 'Sem turma'}
          </Text>
        </Pressable>
        <AuthTextField
          label="Número de questões"
          value={questionCount}
          onChangeText={setQuestionCount}
          keyboardType="number-pad"
          editable={!hasResults}
          error={questionCountExceedsMax ? `Máximo de ${MAX_QUESTIONS} questões` : undefined}
        />
        <Text variant="caption" weight="medium" color={colors.textMuted} style={styles.dateLabel}>
          Prazo
        </Text>
        <Pressable
          style={styles.dateInput}
          onPress={() => !dueDateLocked && setShowDatePicker(true)}
          disabled={dueDateLocked}
        >
          <Text variant="body" color={dueDate ? colors.textPrimary : colors.textMuted}>
            {dueDate ? parseIsoDate(dueDate)?.toLocaleDateString('pt-BR') : 'Selecionar data de entrega'}
          </Text>
        </Pressable>
        {dueDateLocked ? (
          <Text variant="caption" color={colors.textMuted} style={styles.lockedHint}>
            O prazo dessa prova já passou, por isso não é mais possível alterá-lo.
          </Text>
        ) : null}
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
            disabled={hasResults}
          />
          <PillButton
            title="A, B, C, D, E"
            variant={optionsCount === 5 ? 'accent' : 'outline'}
            onPress={() => setOptionsCount(5)}
            disabled={hasResults}
          />
        </View>
        {hasResults ? (
          <Text variant="caption" color={colors.textMuted} style={styles.lockedHint}>
            O número de questões e de alternativas não pode ser alterado porque essa prova já tem alunos
            corrigidos.
          </Text>
        ) : null}
        <PillButton title="Salvar alterações" onPress={onSubmit} />
      </ScrollView>

      <Modal visible={classPickerOpen} transparent animationType="fade" onRequestClose={() => setClassPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setClassPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text variant="h2" weight="bold" style={styles.modalTitle}>
              Vincular a turmas
            </Text>
            <Pressable
              style={styles.modalOption}
              onPress={() => setSelectedClassIds([])}
            >
              <Text variant="body" weight={selectedClassIds.length === 0 ? 'medium' : 'regular'}>
                Sem turma
              </Text>
              {selectedClassIds.length === 0 ? <Ionicons name="checkmark" size={18} color={colors.coral} /> : null}
            </Pressable>
            {classes.map((classRecord) => {
              const checked = selectedClassIds.includes(classRecord.id);
              return (
                <Pressable
                  key={classRecord.id}
                  style={styles.modalOption}
                  onPress={() => toggleClassId(classRecord.id)}
                >
                  <Text variant="body" weight={checked ? 'medium' : 'regular'}>
                    {classRecord.turma || classRecord.name}
                  </Text>
                  {checked ? <Ionicons name="checkmark" size={18} color={colors.coral} /> : null}
                </Pressable>
              );
            })}
            <View style={styles.modalDoneButton}>
              <PillButton title="Pronto" onPress={() => setClassPickerOpen(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
  lockedHint: {
    marginBottom: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  modalTitle: {
    marginBottom: spacing.md,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.grayLight,
  },
  modalDoneButton: {
    marginTop: spacing.md,
  },
});
