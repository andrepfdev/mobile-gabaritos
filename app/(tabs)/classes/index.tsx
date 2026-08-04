import React from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { PillButton } from '../../../components/ui/PillButton';
import { colors, spacing } from '../../../theme/tokens';
import { useClassStore } from '../../../store/classStore';

export default function Classes() {
  const router = useRouter();
  const classes = useClassStore((s) => s.classes);
  const students = useClassStore((s) => s.students);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="h1" weight="bold">
          Turmas
        </Text>
        <Pressable style={styles.addButton} onPress={() => router.push('/classes/new')}>
          <Ionicons name="add" size={20} color={colors.white} />
        </Pressable>
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const studentCount = students.filter((student) => student.classId === item.id).length;
          const subtitle = [item.turma, item.subject].filter(Boolean).join(' — ');
          return (
            <Pressable onPress={() => router.push(`/classes/${item.id}`)}>
              <Card variant="light" style={styles.card}>
                <Text variant="h2" weight="bold">
                  {item.name}
                </Text>
                {subtitle ? (
                  <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
                    {subtitle}
                  </Text>
                ) : null}
                <Text variant="caption" weight="medium" color={colors.textMuted}>
                  {studentCount === 1 ? '1 aluno' : `${studentCount} alunos`}
                </Text>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="body" color={colors.textMuted} style={styles.emptyText}>
              Nenhuma turma cadastrada ainda.
            </Text>
            <PillButton title="Cadastrar turma" onPress={() => router.push('/classes/new')} />
          </View>
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 140,
  },
  card: {
    marginBottom: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  empty: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
