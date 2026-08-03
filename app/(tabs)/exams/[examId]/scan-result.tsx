import React from 'react';
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
import { optionsForCount } from '../../../../lib/gabarito/layout';
import { AMBIGUOUS_RATIO_THRESHOLD, scoreAgainstAnswerKey, unansweredRatio } from '../../../../lib/gabarito/scan';

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
  const result = useScanStore((s) => s.result);

  const exam = exams.find((e) => e.id === examId);
  const answerKey = answerKeys.find((k) => k.examId === examId);

  const onScanAgain = () => router.replace(`/exams/${examId}/scan`);
  const onFinish = () => router.replace(`/exams/${examId}`);

  // The full analysis already runs during capture (scan.tsx), so by the time this screen
  // mounts the result is ready — no loading state, no re-analysis here.
  if (!exam || !answerKey || !result) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text variant="body" style={styles.content}>
          Nenhuma leitura de gabarito em andamento.
        </Text>
      </SafeAreaView>
    );
  }

  const { answers, debug, timings } = result;
  const { correctCount, wrongCount, blankCount, scorePercent } = scoreAgainstAnswerKey(
    answers,
    answerKey.answers,
    exam.questionCount,
  );
  const isAmbiguous = unansweredRatio(answers, exam.questionCount) >= AMBIGUOUS_RATIO_THRESHOLD;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold" style={styles.title}>
          Resultado
        </Text>

        {isAmbiguous ? (
          <Card variant="pink" style={styles.card}>
            <Text variant="body" weight="medium">
              Não conseguimos ler ~10% das respostas com clareza (sem marcação ou marcação dupla).
              Escaneie novamente com boa iluminação e a folha bem alinhada ao guia — não edite a
              nota manualmente.
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
          <StatCard variant="grayLight" value={String(blankCount)} label="Em branco" />
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
              {`Tempos: captura=${timings.captureMs}ms redimensionar=${timings.resizeMs}ms leitura=${timings.analyzeMs}ms total=${timings.totalMs}ms`}
            </Text>
            <Text variant="caption" color={colors.textMuted} style={styles.debugLine}>
              {`leitura = nativo=${debug.nativeMs ?? '?'}ms + bolhas=${debug.bubblesMs ?? '?'}ms`}
            </Text>
            <Text variant="caption" color={colors.textMuted} style={styles.debugLine}>
              {`nativo = decode=${debug.decodeMs?.toFixed(0) ?? '?'}ms detect=${debug.detectMs?.toFixed(0) ?? '?'}ms warp=${debug.warpMs?.toFixed(0) ?? '?'}ms clahe=${debug.claheMs?.toFixed(0) ?? '?'}ms`}
            </Text>
            <Text variant="caption" color={colors.textMuted} style={styles.debugLine}>
              {`Foto: ${debug.imageWidth}x${debug.imageHeight}px · canônico: ${debug.canonicalWidth}x${debug.canonicalHeight}px · flip=${debug.flipMode} · motor=${debug.motor}`}
            </Text>
            <Text variant="caption" color={colors.textMuted} style={styles.debugLine}>
              {`ArUco IDs: [${(debug.arucoIds ?? []).join(', ')}] · score=${Number(debug.arucoScore ?? 0).toFixed(2)}`}
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
});
