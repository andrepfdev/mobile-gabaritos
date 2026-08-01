import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../../components/ui/Text';
import { Card } from '../../../../components/ui/Card';
import { StatCard } from '../../../../components/ui/StatCard';
import { PillButton } from '../../../../components/ui/PillButton';
import { AnswerGrid } from '../../../../components/exam/AnswerGrid';
import { colors, spacing } from '../../../../theme/tokens';
import { useExamStore } from '../../../../store/examStore';
import { useScanStore } from '../../../../store/scanStore';
import { buildGabaritoLayout } from '../../../../lib/gabarito/layout';
import { AMBIGUOUS_RATIO_THRESHOLD, analyzeGabarito, ScanAnswers, scoreAgainstAnswerKey, unansweredRatio } from '../../../../lib/gabarito/scan';

export default function ScanResult() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();
  const exams = useExamStore((s) => s.exams);
  const answerKeys = useExamStore((s) => s.answerKeys);
  const photoUri = useScanStore((s) => s.photoUri);

  const exam = exams.find((e) => e.id === examId);
  const answerKey = answerKeys.find((k) => k.examId === examId);

  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [answers, setAnswers] = useState<ScanAnswers>({});

  useEffect(() => {
    if (!exam || !answerKey || !photoUri) return;
    let cancelled = false;
    setStatus('loading');
    const layout = buildGabaritoLayout(exam.questionCount);
    analyzeGabarito(photoUri, layout)
      .then((result) => {
        if (cancelled) return;
        setAnswers(result);
        setStatus('done');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [exam, answerKey, photoUri]);

  const onScanAgain = () => router.replace(`/exams/${examId}/scan`);
  const onFinish = () => router.replace(`/exams/${examId}`);

  if (!exam || !answerKey || !photoUri) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text variant="body" style={styles.content}>
          Nenhuma leitura de gabarito em andamento.
        </Text>
      </SafeAreaView>
    );
  }

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={[styles.content, styles.centered]}>
          <Text variant="body">Analisando gabarito...</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={[styles.content, styles.centered]}>
          <Text variant="h2" weight="bold" style={styles.errorTitle}>
            Não foi possível ler o gabarito
          </Text>
          <Text variant="body" color={colors.textMuted} style={styles.errorSubtitle}>
            Alinhe a folha às marcas e tente novamente.
          </Text>
          <PillButton title="Tentar novamente" variant="accent" onPress={onScanAgain} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { correctCount, wrongCount, scorePercent } = scoreAgainstAnswerKey(
    answers,
    answerKey.answers,
    exam.questionCount,
  );
  const isAmbiguous = unansweredRatio(answers, exam.questionCount) > AMBIGUOUS_RATIO_THRESHOLD;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold" style={styles.title}>
          Resultado
        </Text>

        {isAmbiguous ? (
          <Card variant="pink" style={styles.card}>
            <Text variant="body" weight="medium">
              Não conseguimos ler várias respostas. Alinhe a folha às marcas e tente novamente.
            </Text>
          </Card>
        ) : null}

        <StatCard variant="dark" value={`${scorePercent} pontos`} label="Nota (base 100)" fullWidth />

        <ScrollView horizontal contentContainerStyle={styles.summaryRow}>
          <StatCard variant="light" value={String(correctCount)} label="Acertos" />
          <StatCard variant="grayLight" value={String(wrongCount)} label="Erros" />
        </ScrollView>

        <Text variant="h2" weight="bold" style={styles.sectionTitle}>
          Detalhamento
        </Text>
        <AnswerGrid
          questionCount={exam.questionCount}
          answers={answers as Record<number, string>}
          answerKey={answerKey.answers}
          mode="review"
        />

        <PillButton title="Escanear outra" variant="outline" onPress={onScanAgain} />
        <PillButton title="Concluir" variant="accent" onPress={onFinish} />
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
    gap: spacing.sm,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginBottom: spacing.sm,
  },
  card: {
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginVertical: spacing.md,
  },
  sectionTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  errorTitle: {
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorSubtitle: {
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
