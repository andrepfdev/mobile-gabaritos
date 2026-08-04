import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../../../../components/ui/Text';
import { AuthTextField } from '../../../../../../components/auth/AuthTextField';
import { PillButton } from '../../../../../../components/ui/PillButton';
import { colors, spacing } from '../../../../../../theme/tokens';
import { useClassStore } from '../../../../../../store/classStore';

export default function EditStudent() {
  const { studentId } = useLocalSearchParams<{ classId: string; studentId: string }>();
  const router = useRouter();
  const students = useClassStore((s) => s.students);
  const updateStudent = useClassStore((s) => s.updateStudent);
  const deleteStudent = useClassStore((s) => s.deleteStudent);

  const student = students.find((s) => s.id === studentId);
  const [name, setName] = useState(student?.name ?? '');

  if (!student) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text variant="body" style={styles.content}>
          Aluno não encontrado.
        </Text>
      </SafeAreaView>
    );
  }

  const onSubmit = async () => {
    if (!name.trim()) return;
    await updateStudent({ ...student, name: name.trim() });
    router.back();
  };

  const onDelete = () => {
    Alert.alert(
      'Excluir aluno',
      `Tem certeza que deseja excluir "${student.name}"? Essa ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteStudent(student.id);
            router.back();
          },
        },
      ],
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
          Editar aluno
        </Text>
        <AuthTextField label="Nome" value={name} onChangeText={setName} placeholder="Nome do aluno" />
        <PillButton title="Salvar" onPress={onSubmit} />
        <Pressable onPress={onDelete} style={styles.deleteButton} hitSlop={8}>
          <Text variant="body" weight="medium" color={colors.danger}>
            Excluir aluno
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
  backButton: {
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.grayLight,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: spacing.md,
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
  },
  backText: {
    marginLeft: spacing.sm,
  },
  title: {
    marginBottom: spacing.md,
  },
  deleteButton: {
    alignSelf: 'center',
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
});
