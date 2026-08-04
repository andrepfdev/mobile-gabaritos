import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../components/ui/Text';
import { ExamCard } from '../../../components/exam/ExamCard';
import { SortButton } from '../../../components/exam/SortButton';
import { TourHint } from '../../../components/tour/TourHint';
import { colors, radii, spacing } from '../../../theme/tokens';
import { useExamStore } from '../../../store/examStore';
import { useClassStore } from '../../../store/classStore';
import { useAuthStore } from '../../../store/authStore';
import { useCanCreateExam } from '../../../hooks/useCanCreateExam';
import { CALIBRATION_EXAM_CODE } from '../../../lib/mockData';

type StatusGroup = 'pending' | 'done';

const TABS: { key: StatusGroup; label: string }[] = [
  { key: 'pending', label: 'Pendentes' },
  { key: 'done', label: 'Corrigidas' },
];

type SortMode = 'dueDate' | 'recent';

const SORT_LABELS: Record<SortMode, string> = {
  dueDate: 'Prazo mais próximo',
  recent: 'Mais recentes',
};

export default function Exams() {
  const router = useRouter();
  const exams = useExamStore((s) => s.exams);
  const examResults = useExamStore((s) => s.examResults);
  const examClasses = useExamStore((s) => s.examClasses);
  const classStudents = useClassStore((s) => s.students);
  const [activeTab, setActiveTab] = useState<StatusGroup>('pending');
  const [selectedClassName, setSelectedClassName] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('dueDate');
  const [classPickerOpen, setClassPickerOpen] = useState(false);
  const { canCreate } = useCanCreateExam();
  const calibrationTourStep = useAuthStore((s) => s.calibrationTourStep);
  const skipCalibrationTour = useAuthStore((s) => s.skipCalibrationTour);

  const onAddExam = () => {
    router.push(canCreate ? '/exams/new' : '/exams/paywall');
  };

  const classNames = useMemo(
    () => Array.from(new Set(exams.map((exam) => exam.className).filter((name): name is string => !!name))),
    [exams],
  );

  const examRosterStudents = (exam: (typeof exams)[number]) => {
    const classIds = examClasses.filter((l) => l.examId === exam.id).map((l) => l.classId);
    if (classIds.length === 0) return undefined;
    return classStudents.filter((student) => classIds.includes(student.classId));
  };

  // Turmas vinculadas: "corrigida" quando todo aluno da turma já tem nota lançada. Provas
  // avulsas (sem turma) não têm nenhum jeito de marcar status hoje, então ficam sempre pendentes.
  const isExamDone = (exam: (typeof exams)[number]) => {
    const roster = examRosterStudents(exam);
    if (!roster || roster.length === 0) return false;
    const corrected = examResults.filter((result) => result.examId === exam.id).length;
    return corrected >= roster.length;
  };

  const filtered = useMemo(() => {
    const byStatus = exams.filter((exam) => (activeTab === 'done' ? isExamDone(exam) : !isExamDone(exam)));
    const byClass = selectedClassName
      ? byStatus.filter((exam) => exam.className === selectedClassName)
      : byStatus;
    const sorted = [...byClass].sort((a, b) => {
      if (sortMode === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exams, examResults, examClasses, classStudents, activeTab, selectedClassName, sortMode]);

  const toggleSortMode = () => {
    setSortMode((prev) => (prev === 'dueDate' ? 'recent' : 'dueDate'));
  };

  const examProgress = (exam: (typeof exams)[number]) => {
    const roster = examRosterStudents(exam);
    if (!roster || roster.length === 0) return 0;
    const corrected = examResults.filter((result) => result.examId === exam.id).length;
    return corrected / roster.length;
  };

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
        <Pressable
          onPress={() => setClassPickerOpen(true)}
          style={styles.classPill}
          disabled={classNames.length === 0}
        >
          <Ionicons name="people-outline" size={14} color={colors.textPrimary} style={styles.classIcon} />
          <Text variant="caption" weight="medium">
            {selectedClassName ?? 'Todas as turmas'}
          </Text>
          {classNames.length > 0 ? (
            <Ionicons name="chevron-down" size={12} color={colors.textMuted} style={styles.classChevron} />
          ) : null}
        </Pressable>
        <SortButton label={SORT_LABELS[sortMode]} onPress={toggleSortMode} />
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
        contentContainerStyle={[styles.listContent, calibrationTourStep === 'card' && styles.listContentTourSpace]}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <ExamCard
              exam={item}
              progress={examProgress(item)}
              rosterStudents={examRosterStudents(item)}
              onPress={() => router.push(`/exams/${item.id}`)}
            />
            {calibrationTourStep === 'card' && item.code === CALIBRATION_EXAM_CODE ? (
              <TourHint
                text="Toque aqui para começar a calibração"
                onDismiss={skipCalibrationTour}
                animationSource={require('../../../assets/animations/strong-pencil.json')}
              />
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          <Text variant="body" color={colors.textMuted} style={styles.empty}>
            Nenhuma prova nesta categoria.
          </Text>
        }
      />

      <Modal visible={classPickerOpen} transparent animationType="fade" onRequestClose={() => setClassPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setClassPickerOpen(false)}>
          <View style={styles.modalSheet}>
            <Text variant="h2" weight="bold" style={styles.modalTitle}>
              Filtrar por turma
            </Text>
            <Pressable
              style={styles.modalOption}
              onPress={() => {
                setSelectedClassName(null);
                setClassPickerOpen(false);
              }}
            >
              <Text variant="body" weight={selectedClassName === null ? 'medium' : 'regular'}>
                Todas as turmas
              </Text>
              {selectedClassName === null ? <Ionicons name="checkmark" size={18} color={colors.coral} /> : null}
            </Pressable>
            {classNames.map((name) => (
              <Pressable
                key={name}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedClassName(name);
                  setClassPickerOpen(false);
                }}
              >
                <Text variant="body" weight={selectedClassName === name ? 'medium' : 'regular'}>
                  {name}
                </Text>
                {selectedClassName === name ? <Ionicons name="checkmark" size={18} color={colors.coral} /> : null}
              </Pressable>
            ))}
          </View>
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
  classPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grayLight,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
  },
  classIcon: {
    marginRight: spacing.xs,
  },
  classChevron: {
    marginLeft: spacing.xs,
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
  // Gives the calibration TourHint's badge+bubble (which floats above the first card) room to
  // render without being clipped by the FlatList's own top edge — there's nothing above the
  // first item to push that edge down otherwise.
  listContentTourSpace: {
    paddingTop: 90,
  },
  cardWrap: {
    position: 'relative',
  },
  empty: {
    textAlign: 'center',
    marginTop: spacing.xl,
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
    paddingBottom: spacing.xl,
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
});
