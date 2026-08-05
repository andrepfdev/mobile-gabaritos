import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { AuthTextField } from '../../../components/auth/AuthTextField';
import { PillButton } from '../../../components/ui/PillButton';
import { colors, spacing } from '../../../theme/tokens';
import { useClassStore } from '../../../store/classStore';

export default function NewClass() {
  const router = useRouter();
  const createClass = useClassStore((s) => s.createClass);

  const [name, setName] = useState('');
  const [turma, setTurma] = useState('');
  const [subject, setSubject] = useState('');

  const onSubmit = async () => {
    if (!name.trim()) return;
    const id = `class-${Date.now()}`;
    await createClass({
      id,
      name: name.trim(),
      turma: turma.trim() || undefined,
      subject: subject.trim() || undefined,
    });
    router.replace(`/classes/${id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold" style={styles.title}>
          Nova turma
        </Text>
        <AuthTextField label="Escola" value={name} onChangeText={setName} placeholder="Escola Valtemir Luz" />
        <AuthTextField label="Turma" value={turma} onChangeText={setTurma} placeholder="5º Ano B" />
        <AuthTextField label="Componente Curricular" value={subject} onChangeText={setSubject} placeholder="Matemática" />
        <PillButton title="Criar turma" onPress={onSubmit} />
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
