import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../../components/ui/Text';
import { AuthTextField } from '../../../components/auth/AuthTextField';
import { PillButton } from '../../../components/ui/PillButton';
import { colors, spacing } from '../../../theme/tokens';
import { useExamStore } from '../../../store/examStore';
import { useCanCreateExam } from '../../../hooks/useCanCreateExam';
import { generateExamCode } from '../../../lib/gabarito/code';

export default function NewExam() {
  const router = useRouter();
  const createExam = useExamStore((s) => s.createExam);
  const examCount = useExamStore((s) => s.exams.length);
  const { canCreate } = useCanCreateExam();

  useEffect(() => {
    if (!canCreate) {
      router.replace('/exams/paywall');
    }
  }, [canCreate, router]);

  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [className, setClassName] = useState('');
  const [questionCount, setQuestionCount] = useState('10');
  const [dueDate, setDueDate] = useState('');

  const onSubmit = async () => {
    if (!title.trim() || !questionCount.trim()) return;
    const id = `exam-${Date.now()}`;
    await createExam({
      id,
      title: title.trim(),
      subject: subject.trim() || undefined,
      className: className.trim() || undefined,
      questionCount: Math.max(1, Number(questionCount) || 10),
      dueDate: dueDate.trim() || undefined,
      createdAt: new Date().toISOString(),
      priority: 'none',
      status: 'to_correct',
      students: [],
      code: generateExamCode(subject.trim() || undefined, examCount + 1),
    });
    router.replace(`/exams/${id}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold" style={styles.title}>
          Nova prova
        </Text>
        <AuthTextField label="Título" value={title} onChangeText={setTitle} placeholder="Avaliação de Matemática" />
        <AuthTextField label="Disciplina" value={subject} onChangeText={setSubject} placeholder="Matemática" />
        <AuthTextField label="Turma" value={className} onChangeText={setClassName} placeholder="9º Ano B" />
        <AuthTextField
          label="Número de questões"
          value={questionCount}
          onChangeText={setQuestionCount}
          keyboardType="number-pad"
        />
        <AuthTextField
          label="Prazo (AAAA-MM-DD)"
          value={dueDate}
          onChangeText={setDueDate}
          placeholder="2026-08-15"
        />
        <PillButton title="Criar prova" onPress={onSubmit} />
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
