import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../../components/ui/Text';
import { AuthTextField } from '../../../../components/auth/AuthTextField';
import { PillButton } from '../../../../components/ui/PillButton';
import { colors, spacing } from '../../../../theme/tokens';
import { useClassStore } from '../../../../store/classStore';

export default function EditClass() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();
  const classes = useClassStore((s) => s.classes);
  const updateClass = useClassStore((s) => s.updateClass);
  const classRecord = classes.find((c) => c.id === classId);

  const [name, setName] = useState(classRecord?.name ?? '');
  const [turma, setTurma] = useState(classRecord?.turma ?? '');
  const [subject, setSubject] = useState(classRecord?.subject ?? '');

  if (!classRecord) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Text variant="body" style={styles.content}>
          Turma não encontrada.
        </Text>
      </SafeAreaView>
    );
  }

  const onSubmit = async () => {
    if (!name.trim()) return;
    await updateClass({
      id: classRecord.id,
      name: name.trim(),
      turma: turma.trim() || undefined,
      subject: subject.trim() || undefined,
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold" style={styles.title}>
          Editar turma
        </Text>
        <AuthTextField label="Escola" value={name} onChangeText={setName} placeholder="Escola Valtemir Luz" />
        <AuthTextField label="Turma" value={turma} onChangeText={setTurma} placeholder="5º Ano B" />
        <AuthTextField label="Componente Curricular" value={subject} onChangeText={setSubject} placeholder="Matemática" />
        <PillButton title="Salvar" onPress={onSubmit} />
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
