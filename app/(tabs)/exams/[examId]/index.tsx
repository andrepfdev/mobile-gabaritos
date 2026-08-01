import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../../components/ui/Text';
import { Card } from '../../../../components/ui/Card';
import { PillButton } from '../../../../components/ui/PillButton';
import { colors, spacing } from '../../../../theme/tokens';
import { useExamStore } from '../../../../store/examStore';

export default function ExamDetail() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();
  const exams = useExamStore((s) => s.exams);
  const answerKeys = useExamStore((s) => s.answerKeys);

  const exam = exams.find((e) => e.id === examId);
  const answerKey = answerKeys.find((k) => k.examId === examId);

  if (!exam) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text variant="body" style={styles.content}>
          Prova não encontrada.
        </Text>
      </SafeAreaView>
    );
  }

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
            Escanear gabarito
          </Text>
          <Text variant="body" color={colors.white} style={styles.cardSubtitle}>
            Aponte a câmera para uma folha preenchida e receba a nota na hora.
          </Text>
          <PillButton
            title="Escanear"
            variant="dark"
            onPress={() => router.push(`/exams/${examId}/scan`)}
            disabled={!answerKey}
          />
        </Card>

        <Card variant="cream" style={styles.card}>
          <Text variant="h2" weight="bold">
            Exportar gabarito em branco
          </Text>
          <Text variant="body" color={colors.textMuted} style={styles.cardSubtitle}>
            Baixe uma imagem para imprimir ou inserir em um documento de texto.
          </Text>
          <PillButton
            title="Exportar"
            variant="outline"
            onPress={() => router.push(`/exams/${examId}/export`)}
            disabled={!answerKey}
          />
        </Card>
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
  card: {
    marginBottom: spacing.md,
  },
  cardSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
});
