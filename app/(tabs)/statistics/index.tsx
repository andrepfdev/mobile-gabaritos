import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { StatCard } from '../../../components/ui/StatCard';
import { LineChart } from '../../../components/ui/LineChart';
import { colors, spacing } from '../../../theme/tokens';
import { statisticsSummary, performanceOverTime } from '../../../lib/mockData';

export default function Statistics() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold" style={styles.header}>
          Estatísticas
        </Text>

        <View style={styles.row}>
          <StatCard
            variant="light"
            tag={{ label: statisticsSummary.examsTodayTag }}
            value={String(statisticsSummary.examsToday)}
            label="Provas hoje"
            onPress={() => router.push('/exams')}
          />
          <View style={styles.gap} />
          <StatCard
            variant="pink"
            tag={{ label: statisticsSummary.pendingTag }}
            value={String(statisticsSummary.pendingCorrections)}
            label="Correções pendentes"
          />
        </View>

        <StatCard
          variant="dark"
          value={statisticsSummary.avgTimePerExam}
          label="Por prova esta semana"
          fullWidth
        >
          <Text variant="caption" color="#c9c9c9" style={styles.activityLabel}>
            {`${statisticsSummary.weeklyActivityPercent}% de atividade`}
          </Text>
        </StatCard>

        <View style={styles.spacer} />

        <StatCard variant="dark" fullWidth>
          <Text variant="body" weight="medium" color={colors.white}>
            Desempenho médio
          </Text>
          <Text variant="hero" weight="bold" color={colors.white} style={styles.chartValue}>
            {`${statisticsSummary.completionPercent} pontos`}
          </Text>
          <LineChart data={performanceOverTime} lineColor={colors.coral} />
        </StatCard>
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
  header: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  gap: {
    width: spacing.md,
  },
  activityLabel: {
    marginTop: spacing.sm,
  },
  spacer: {
    height: spacing.md,
  },
  chartValue: {
    marginBottom: spacing.md,
  },
});
