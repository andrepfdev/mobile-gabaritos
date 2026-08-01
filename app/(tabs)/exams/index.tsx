import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../components/ui/Text';
import { ExamCard } from '../../../components/exam/ExamCard';
import { SortButton } from '../../../components/exam/SortButton';
import { DateRangePicker } from '../../../components/exam/DateRangePicker';
import { AssigneeSelector } from '../../../components/exam/AssigneeSelector';
import { colors, spacing } from '../../../theme/tokens';
import { useExamStore } from '../../../store/examStore';
import { mockExamProgress } from '../../../lib/mockData';
import { ExamStatus } from '../../../lib/localDb/schema';
import { useCanCreateExam } from '../../../hooks/useCanCreateExam';

const TABS: { key: ExamStatus; label: string }[] = [
  { key: 'to_correct', label: 'A corrigir' },
  { key: 'in_progress', label: 'Em andamento' },
  { key: 'review', label: 'Revisão' },
];

export default function Exams() {
  const router = useRouter();
  const exams = useExamStore((s) => s.exams);
  const [activeTab, setActiveTab] = useState<ExamStatus>('to_correct');
  const { canCreate } = useCanCreateExam();

  const onAddExam = () => {
    router.push(canCreate ? '/exams/new' : '/exams/paywall');
  };

  const filtered = useMemo(
    () => exams.filter((exam) => exam.status === activeTab || (activeTab === 'to_correct' && exam.status === 'waiting')),
    [exams, activeTab],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h1" weight="bold">
          Provas
        </Text>
        <Pressable style={styles.addButton} onPress={onAddExam}>
          <Ionicons name="add" size={20} color={colors.white} />
        </Pressable>
      </View>

      <View style={styles.filtersRow}>
        <AssigneeSelector name="Minhas" initials="EU" onPress={() => {}} />
        <SortButton onPress={() => {}} />
        <DateRangePicker label="13 Fev – 6 Mar" onPress={() => {}} />
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tab}>
            <Text
              variant="body"
              weight="medium"
              color={activeTab === tab.key ? colors.textPrimary : colors.textMuted}
            >
              {tab.label}
            </Text>
            {activeTab === tab.key ? <View style={styles.tabIndicator} /> : null}
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ExamCard
            exam={item}
            progress={mockExamProgress[item.id] ?? 0}
            onPress={() => router.push(`/exams/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <Text variant="body" color={colors.textMuted} style={styles.empty}>
            Nenhuma prova nesta categoria.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCream,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.lg,
  },
  tab: {
    paddingBottom: spacing.sm,
  },
  tabIndicator: {
    height: 2,
    backgroundColor: colors.dark,
    marginTop: spacing.xs,
    borderRadius: 1,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 140,
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
