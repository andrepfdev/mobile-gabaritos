import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
import { buildGabaritoLayout, optionsForCount } from '../../../../lib/gabarito/layout';
import {
  AMBIGUOUS_RATIO_THRESHOLD,
  analyzeGabarito,
  GabaritoScanError,
  ScanAnswers,
  ScanDebugInfo,
  scoreAgainstAnswerKey,
  unansweredRatio,
} from '../../../../lib/gabarito/scan';

type PixelPoint = { x: number; y: number };

function LegendItem({ color, borderColor, label }: { color: string; borderColor?: string; label: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color, borderColor: borderColor ?? color }]} />
      <Text variant="caption" color={colors.textMuted}>
        {label}
      </Text>
    </View>
  );
}

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
  const [debug, setDebug] = useState<ScanDebugInfo | null>(null);
  const [errorDebug, setErrorDebug] = useState<{
    imageWidth?: number;
    imageHeight?: number;
    corners?: Partial<{ topLeft: PixelPoint; topRight: PixelPoint; bottomLeft: PixelPoint; bottomRight: PixelPoint }>;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!exam || !answerKey || !photoUri) return;
    let cancelled = false;
    setStatus('loading');
    setErrorDebug(null);
    const layout = buildGabaritoLayout(exam.questionCount, optionsForCount(exam.optionsCount));
    analyzeGabarito(photoUri, layout)
      .then((result) => {
        if (cancelled) return;
        setAnswers(result.answers);
        setDebug(result.debug);
        setStatus('done');
      })
      .catch((error) => {
        if (cancelled) return;
        if (error instanceof GabaritoScanError) {
          setErrorDebug({ imageWidth: error.imageWidth, imageHeight: error.imageHeight, corners: error.corners, message: error.message });
        }
        setStatus('error');
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
            Enquadre as 4 marcas de canto, use fundo claro e boa iluminação — sem teclado ou objetos escuros atrás.
          </Text>
          <PillButton title="Tentar novamente" variant="accent" onPress={onScanAgain} />

          {/* TEMPORARY diagnostic block — same reasoning as the one below for a successful scan,
              but for the failure path: without this we'd have zero visibility into *why* corner
              detection failed or looked implausible on a given photo. */}
          {errorDebug ? (
            <Card variant="grayLight" style={styles.debugCard}>
              <Text variant="body" weight="bold">
                Diagnóstico (temporário)
              </Text>
              <Text variant="caption" color={colors.textMuted} style={styles.debugLine}>
                {errorDebug.message}
              </Text>
              {errorDebug.imageWidth ? (
                <Text variant="caption" color={colors.textMuted} style={styles.debugLine}>
                  {`Foto: ${errorDebug.imageWidth}x${errorDebug.imageHeight}px`}
                </Text>
              ) : null}
              {errorDebug.corners ? (
                <Text variant="caption" color={colors.textMuted} style={styles.debugLine}>
                  {(['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const)
                    .map((key) => {
                      const point = errorDebug.corners?.[key];
                      return `${key}: ${point ? `(${Math.round(point.x)},${Math.round(point.y)})` : 'não encontrado'}`;
                    })
                    .join(' ')}
                </Text>
              ) : null}
            </Card>
          ) : null}
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
              Leitura incompleta — várias bolhas ficaram sem marcação clara. Escaneie de novo com as 4 marcas no guia e luz uniforme (não edite manualmente).
            </Text>
            <View style={{ marginTop: spacing.sm }}>
              <PillButton title="Escanear novamente" variant="accent" onPress={onScanAgain} />
            </View>
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
        <Card variant="grayLight" style={styles.legendCard}>
          <LegendItem color={colors.success} label="Acertou" />
          <LegendItem color={colors.yellow} label="Marcou, mas está errada" />
          <LegendItem color="#dceee0" label="Resposta correta (não foi a marcada)" />
          <LegendItem color={colors.white} borderColor={colors.yellow} label="Não identificamos marcação (contorno = resposta correta)" />
        </Card>
        <AnswerGrid
          questionCount={exam.questionCount}
          answers={answers as Record<number, string>}
          answerKey={answerKey.answers}
          mode="review"
          options={optionsForCount(exam.optionsCount)}
        />

        <PillButton title="Escanear outra" variant="outline" onPress={onScanAgain} />
        <PillButton title="Concluir" variant="accent" onPress={onFinish} />

        {/* TEMPORARY diagnostic block — remove once the pixel-reading pipeline is confirmed
            working end-to-end on a real device. Shows raw luminance readings (0=black..255=white)
            so we can tell apart "sampling the wrong spot" from "Skia not reading pixels right". */}
        {debug ? (
          <Card variant="grayLight" style={styles.debugCard}>
            <Text variant="body" weight="bold">
              Diagnóstico (temporário)
            </Text>
            <Text variant="caption" color={colors.textMuted} style={styles.debugLine}>
              {`Foto: ${debug.imageWidth}x${debug.imageHeight}px · canônico: ${debug.canonicalWidth}x${debug.canonicalHeight}px`}
            </Text>
            <Text variant="caption" color={colors.textMuted} style={styles.debugLine}>
              {`Cantos: TL(${Math.round(debug.corners.topLeft.x)},${Math.round(debug.corners.topLeft.y)}) TR(${Math.round(debug.corners.topRight.x)},${Math.round(debug.corners.topRight.y)}) BL(${Math.round(debug.corners.bottomLeft.x)},${Math.round(debug.corners.bottomLeft.y)}) BR(${Math.round(debug.corners.bottomRight.x)},${Math.round(debug.corners.bottomRight.y)})`}
            </Text>
            {debug.rows.map((row) => (
              <Text key={row.question} variant="caption" color={colors.textMuted} style={styles.debugLine}>
                {`Q${row.question}: ${row.readings.map((r) => `${r.option}=${r.fill.toFixed(2)}`).join(' ')} → ${
                  row.isMarked ? `marcado ${row.chosen}` : 'sem marca'
                } (margem=${row.margin} z=${row.zScore})`}
              </Text>
            ))}
          </Card>
        ) : null}
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
  debugCard: {
    marginTop: spacing.lg,
  },
  legendCard: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  debugLine: {
    marginTop: spacing.xs,
    fontFamily: 'monospace',
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
