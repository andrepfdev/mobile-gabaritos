import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../../components/ui/Text';
import { Card } from '../../../../components/ui/Card';
import { PillButton } from '../../../../components/ui/PillButton';
import { colors, spacing } from '../../../../theme/tokens';
import { useExamStore } from '../../../../store/examStore';
import { CALIBRATION_EXAM_ID } from '../../../../lib/mockData';

export default function ExamDetail() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();
  const exams = useExamStore((s) => s.exams);
  const answerKeys = useExamStore((s) => s.answerKeys);
  const examClasses = useExamStore((s) => s.examClasses);
  const deleteExam = useExamStore((s) => s.deleteExam);

  const exam = exams.find((e) => e.id === examId);
  const answerKey = answerKeys.find((k) => k.examId === examId);
  const isCalibration = exam?.id === CALIBRATION_EXAM_ID;
  const linkedClassCount = exam ? examClasses.filter((l) => l.examId === exam.id).length : 0;

  if (!exam) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text variant="body" style={styles.content}>
          Prova não encontrada.
        </Text>
      </SafeAreaView>
    );
  }

  const onDelete = () => {
    Alert.alert(
      'Excluir prova',
      `Tem certeza que deseja excluir "${exam.title}"? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteExam(exam.id);
            router.replace('/exams');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold" style={styles.title}>
          {exam.title}
        </Text>
        <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
          {[exam.subject, exam.className].filter(Boolean).join(' — ')}
        </Text>
        <Text variant="caption" weight="medium" color={colors.coral} style={styles.code}>
          {`Código: ${exam.code}`}
        </Text>

        {!isCalibration ? (
          <Pressable onPress={() => router.push(`/exams/${examId}/edit`)} style={styles.editButton} hitSlop={8}>
            <Text variant="body" weight="medium" color={colors.textPrimary}>
              Editar prova
            </Text>
          </Pressable>
        ) : null}

        {!answerKey ? (
          <Card variant="dark" style={styles.card}>
            <Text variant="h2" weight="bold" color={colors.white}>
              Configure o gabarito
            </Text>
            <Text variant="body" color="#c9c9c9" style={styles.cardSubtitle}>
              Defina as respostas corretas antes de exportar ou corrigir provas.
            </Text>
            <PillButton
              title="Configurar gabarito"
              variant="light"
              onPress={() => router.push(`/exams/${examId}/answer-key`)}
            />
          </Card>
        ) : (
          <Card variant="grayLight" style={styles.card}>
            <Text variant="body" weight="medium">
              Gabarito configurado ({exam.questionCount} questões)
            </Text>
            <PillButton
              title="Editar gabarito"
              variant="outline"
              onPress={() => router.push(`/exams/${examId}/answer-key`)}
            />
          </Card>
        )}

        <Card variant="accent" style={styles.card}>
          <Text variant="h2" weight="bold" color={colors.white}>
            {linkedClassCount > 1 ? 'Corrigir turmas' : linkedClassCount === 1 ? 'Corrigir turma' : 'Escanear gabarito'}
          </Text>
          <Text variant="body" color={colors.white} style={styles.cardSubtitle}>
            {isCalibration
              ? 'Escaneie a folha de calibração impressa para testar se a câmera do seu celular lê bem as marcações.'
              : linkedClassCount > 0
                ? 'Veja a lista de alunos e corrija um por um.'
                : 'Aponte a câmera para uma folha preenchida e receba a nota na hora.'}
          </Text>
          <PillButton
            title={linkedClassCount > 0 ? 'Ver alunos' : 'Escanear'}
            variant="dark"
            onPress={() =>
              router.push(linkedClassCount > 0 ? `/exams/${examId}/roster` : `/exams/${examId}/scan`)
            }
            disabled={!answerKey}
          />
        </Card>

        <Card variant="cream" style={styles.card}>
          <Text variant="h2" weight="bold">
            {isCalibration ? 'Exportar gabarito de calibração' : 'Exportar gabarito em branco'}
          </Text>
          <Text variant="body" color={colors.textMuted} style={styles.cardSubtitle}>
            {isCalibration
              ? 'Baixe esta folha já marcada, imprima e escaneie de volta para testar a câmera do seu celular antes de aplicar provas reais.'
              : 'Baixe uma imagem para imprimir ou inserir em um documento de texto.'}
          </Text>
          <PillButton
            title="Exportar"
            variant="outline"
            onPress={() => router.push(`/exams/${examId}/export`)}
            disabled={!answerKey}
          />
        </Card>

        <Pressable onPress={onDelete} style={styles.deleteButton} hitSlop={8}>
          <Text variant="body" weight="medium" color={colors.danger}>
            Excluir prova
          </Text>
        </Pressable>
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
    marginBottom: spacing.xs,
  },
  code: {
    marginBottom: spacing.md,
  },
  editButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  deleteButton: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
});
