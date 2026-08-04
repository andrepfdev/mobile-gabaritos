import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../../../components/ui/Text';
import { AuthTextField } from '../../../../../components/auth/AuthTextField';
import { PillButton } from '../../../../../components/ui/PillButton';
import { colors, spacing } from '../../../../../theme/tokens';
import { useClassStore } from '../../../../../store/classStore';

export default function NewStudent() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();
  const createStudent = useClassStore((s) => s.createStudent);

  const [name, setName] = useState('');

  const onSubmit = async () => {
    if (!name.trim() || !classId) return;
    await createStudent({
      id: `student-${Date.now()}`,
      classId,
      name: name.trim(),
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold" style={styles.title}>
          Novo aluno
        </Text>
        <AuthTextField label="Nome" value={name} onChangeText={setName} placeholder="Nome do aluno" />
        <PillButton title="Adicionar aluno" onPress={onSubmit} />
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
    marginBottom: spacing.md,
  },
});
