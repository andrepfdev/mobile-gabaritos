import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../../components/ui/Text';
import { Card } from '../../../../components/ui/Card';
import { colors, spacing } from '../../../../theme/tokens';
import { useClassStore } from '../../../../store/classStore';

export default function ClassDetail() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();
  const classes = useClassStore((s) => s.classes);
  const students = useClassStore((s) => s.students);
  const deleteClass = useClassStore((s) => s.deleteClass);

  const classRecord = classes.find((c) => c.id === classId);

  const classStudents = useMemo(
    () =>
      students
        .filter((student) => student.classId === classId)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [students, classId],
  );

  if (!classRecord) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text variant="body" style={styles.content}>
          Turma não encontrada.
        </Text>
      </SafeAreaView>
    );
  }

  const subtitle = [classRecord.turma, classRecord.subject].filter(Boolean).join(' — ');

  const onDelete = () => {
    Alert.alert(
      'Excluir turma',
      `Tem certeza que deseja excluir "${classRecord.name}"? Os alunos dessa turma também serão excluídos. Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteClass(classRecord.id);
            router.replace('/classes');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h1" weight="bold">
              {classRecord.name}
            </Text>
            {subtitle ? (
              <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <Pressable
            style={styles.editButton}
            onPress={() => router.push(`/classes/${classRecord.id}/edit`)}
            hitSlop={8}
          >
            <Ionicons name="pencil" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.studentsHeader}>
          <Text variant="h2" weight="bold">
            Alunos
          </Text>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push(`/classes/${classRecord.id}/students/new`)}
          >
            <Ionicons name="add" size={20} color={colors.white} />
          </Pressable>
        </View>

        {classStudents.length > 0 ? (
          <Card variant="light" style={styles.studentsCard} padded={false}>
            {classStudents.map((student, index) => (
              <Pressable
                key={student.id}
                onPress={() => router.push(`/classes/${classRecord.id}/students/${student.id}/edit`)}
                style={[styles.studentRow, index < classStudents.length - 1 && styles.studentRowDivider]}
              >
                <View style={styles.studentAvatar}>
                  <Text variant="caption" weight="bold" color={colors.textOnDark}>
                    {student.name.trim().charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text variant="body" weight="medium" style={styles.studentName}>
                  {student.name}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </Card>
        ) : (
          <Text variant="body" color={colors.textMuted} style={styles.empty}>
            Nenhum aluno cadastrado nessa turma ainda.
          </Text>
        )}

        <Pressable onPress={onDelete} style={styles.deleteButton} hitSlop={8}>
          <Text variant="body" weight="medium" color={colors.danger}>
            Excluir turma
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  studentsCard: {
    marginBottom: spacing.lg,
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
  empty: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  deleteButton: {
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    padding: spacing.sm,
  },
});
