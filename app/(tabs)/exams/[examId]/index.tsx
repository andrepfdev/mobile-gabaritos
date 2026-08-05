import React, { useEffect } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../../components/ui/Text';
import { Card } from '../../../../components/ui/Card';
import { PillButton } from '../../../../components/ui/PillButton';
import { TourHint } from '../../../../components/tour/TourHint';
import { colors, spacing } from '../../../../theme/tokens';
import { useExamStore } from '../../../../store/examStore';
import { useAuthStore } from '../../../../store/authStore';
import { CALIBRATION_EXAM_CODE } from '../../../../lib/mockData';
import { useSubscriptionStatus } from '../../../../hooks/useSubscriptionStatus';
import { isExamPastDue } from '../../../../lib/exam/deadline';

export default function ExamDetail() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();
  const exams = useExamStore((s) => s.exams);
  const answerKeys = useExamStore((s) => s.answerKeys);
  const examClasses = useExamStore((s) => s.examClasses);
  const deleteExam = useExamStore((s) => s.deleteExam);
  const calibrationTourStep = useAuthStore((s) => s.calibrationTourStep);
  const advanceCalibrationTour = useAuthStore((s) => s.advanceCalibrationTour);
  const skipCalibrationTour = useAuthStore((s) => s.skipCalibrationTour);
  const { hasActiveSubscription } = useSubscriptionStatus();

  const exam = exams.find((e) => e.id === examId);
  const answerKey = answerKeys.find((k) => k.examId === examId);
  const isCalibration = exam?.code === CALIBRATION_EXAM_CODE;
  // Prazo vencido trava configurar/editar o gabarito só para contas sem assinatura ativa — é uma
  // medida anti-abuso do plano gratuito, não uma limitação do produto.
  const examLocked = !!exam && isExamPastDue(exam) && !hasActiveSubscription;
  const linkedClassCount = exam ? examClasses.filter((l) => l.examId === exam.id).length : 0;

  useEffect(() => {
    if (isCalibration && calibrationTourStep === 'card') {
      advanceCalibrationTour();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCalibration, calibrationTourStep]);

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
        <View style={styles.titleRow}>
          <Text variant="h1" weight="bold" style={styles.title}>
            {exam.title}
          </Text>
          {!isCalibration ? (
            <Pressable onPress={() => router.push(`/exams/${examId}/edit`)} style={styles.editButton} hitSlop={8}>
              <Ionicons name="brush" size={20} color={colors.textPrimary} />
            </Pressable>
          ) : null}
        </View>
        <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
          {[exam.subject, exam.className].filter(Boolean).join(' — ')}
        </Text>
        <Text variant="caption" weight="medium" color={colors.coral} style={styles.code}>
          {`Código: ${exam.code}`}
        </Text>

        {!answerKey ? (
          <Card variant="dark" style={styles.card}>
            <Text variant="h2" weight="bold" color={colors.white}>
              Configure o gabarito
            </Text>
            <Text variant="body" color="#c9c9c9" style={styles.cardSubtitle}>
              {examLocked
                ? 'O prazo dessa prova já passou, por isso não é mais possível configurar o gabarito.'
                : 'Defina as respostas corretas antes de exportar ou corrigir provas.'}
            </Text>
            <PillButton
              title="Configurar gabarito"
              variant="light"
              onPress={() => router.push(`/exams/${examId}/answer-key`)}
              disabled={examLocked}
            />
          </Card>
        ) : (
          <Card variant="grayLight" style={styles.card}>
            <Text variant="body" weight="medium">
              Gabarito configurado ({exam.questionCount} questões)
            </Text>
            {examLocked ? (
              <Text variant="caption" color={colors.textMuted} style={styles.cardSubtitle}>
                Prazo encerrado — o gabarito não pode mais ser alterado.
              </Text>
            ) : null}
            <PillButton
              title="Editar gabarito"
              variant="outline"
              onPress={() => router.push(`/exams/${examId}/answer-key`)}
              disabled={examLocked}
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

        <View
          style={[styles.exportWrap, isCalibration && calibrationTourStep === 'export' && styles.exportWrapTourSpace]}
        >
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
              onPress={() => {
                if (calibrationTourStep === 'export') advanceCalibrationTour();
                router.push(`/exams/${examId}/export`);
              }}
              disabled={!answerKey}
            />
          </Card>
          {isCalibration && calibrationTourStep === 'export' ? (
            <TourHint
              text="Toque aqui para baixar e imprimir"
              onDismiss={skipCalibrationTour}
              animationSource={require('../../../../assets/animations/pencil-smart.json')}
            />
          ) : null}
        </View>

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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    marginBottom: spacing.xs,
    marginRight: spacing.sm,
  },
  subtitle: {
    marginBottom: spacing.xs,
  },
  code: {
    marginBottom: spacing.md,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    marginBottom: spacing.md,
  },
  exportWrap: {
    position: 'relative',
  },
  // Gives the calibration TourHint's callout (above) and skip button (below) room to render
  // without overlapping the "Escanear gabarito" card above or the "Excluir prova" link below —
  // the normal gaps here (just the card's own marginBottom) are too tight for both.
  exportWrapTourSpace: {
    marginTop: 74,
    marginBottom: 56,
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
