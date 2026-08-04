import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../../components/ui/Text';
import { Card } from '../../../../components/ui/Card';
import { colors, spacing } from '../../../../theme/tokens';
import { useExamStore } from '../../../../store/examStore';
import { useClassStore } from '../../../../store/classStore';
import { StudentRecord } from '../../../../lib/db/studentsRepository';

export default function ExamRoster() {
  const { examId } = useLocalSearchParams<{ examId: string }>();
  const router = useRouter();
  const exams = useExamStore((s) => s.exams);
  const examResults = useExamStore((s) => s.examResults);
  const examClasses = useExamStore((s) => s.examClasses);
  const classes = useClassStore((s) => s.classes);
  const students = useClassStore((s) => s.students);

  const exam = exams.find((e) => e.id === examId);

  const linkedClasses = useMemo(() => {
    const classIds = examClasses.filter((l) => l.examId === examId).map((l) => l.classId);
    return classes
      .filter((c) => classIds.includes(c.id))
      .sort((a, b) => (a.turma || a.name).localeCompare(b.turma || b.name, 'pt-BR'));
  }, [examClasses, classes, examId]);

  const studentsByClass = useMemo(
    () =>
      linkedClasses.map((classRecord) => ({
        classRecord,
        students: students
          .filter((student) => student.classId === classRecord.id)
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
      })),
    [linkedClasses, students],
  );

  if (!exam || linkedClasses.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text variant="body" style={styles.content}>
          Prova não encontrada.
        </Text>
      </SafeAreaView>
    );
  }

  const renderStudentRow = (student: StudentRecord, isLast: boolean) => {
    const result = examResults.find((r) => r.examId === exam.id && r.studentId === student.id);
    return (
      <Pressable
        key={student.id}
        onPress={() => router.push(`/exams/${exam.id}/scan?studentId=${student.id}`)}
        style={[styles.studentRow, !isLast && styles.studentRowDivider]}
      >
        <View style={styles.studentAvatar}>
          <Text variant="caption" weight="bold" color={colors.textOnDark}>
            {student.name.trim().charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text variant="body" weight="medium" style={styles.studentName}>
          {student.name}
        </Text>
        {result ? (
          <Text variant="caption" weight="medium" color={colors.success}>
            {`Nota ${result.scorePercent}`}
          </Text>
        ) : (
          <Text variant="caption" color={colors.textMuted}>
            Pendente
          </Text>
        )}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} style={styles.chevron} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Ionicons name="arrow-back-circle-outline" size={20} color={colors.textPrimary} />
          <Text variant="body" weight="medium" color={colors.textPrimary} style={styles.backText}>
            Voltar
          </Text>
        </Pressable>
        <Text variant="h1" weight="bold" style={styles.title}>
          {exam.title}
        </Text>
        <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
          {linkedClasses.map((c) => c.turma || c.name).join(', ')}
        </Text>

        {studentsByClass.map(({ classRecord, students: classStudents }) => (
          <View key={classRecord.id} style={styles.classSection}>
            <Text variant="h2" weight="bold" style={styles.classHeader}>
              {classRecord.turma || classRecord.name}
            </Text>
            {classStudents.length > 0 ? (
              <Card variant="light" style={styles.studentsCard} padded={false}>
                {classStudents.map((student, index) =>
                  renderStudentRow(student, index === classStudents.length - 1),
                )}
              </Card>
            ) : (
              <Text variant="body" color={colors.textMuted} style={styles.empty}>
                Essa turma ainda não tem alunos cadastrados.
              </Text>
            )}
          </View>
        ))}
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
  backButton: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.grayLight,
    paddingHorizontal: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  backText: {
    marginLeft: spacing.xs,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    marginBottom: spacing.md,
  },
  classSection: {
    marginBottom: spacing.lg,
  },
  classHeader: {
    marginBottom: spacing.sm,
  },
  studentsCard: {
    overflow: 'hidden',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  studentRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.grayLight,
  },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  studentName: {
    flex: 1,
  },
  chevron: {
    marginLeft: spacing.sm,
  },
  empty: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
