import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { PillButton } from '../../components/ui/PillButton';
import { colors, spacing } from '../../theme/tokens';
import { useCurrentUser } from '../../api/users';
import { useCanCreateExam } from '../../hooks/useCanCreateExam';

export default function Home() {
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const { canCreate } = useCanCreateExam();

  const onCreateExam = () => {
    router.push(canCreate ? '/exams/new' : '/exams/paywall');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="h1" weight="bold">
          {user?.name ? `Olá, ${user.name.split(' ')[0]}` : 'Olá!'}
        </Text>
        <Text variant="body" color={colors.textMuted} style={styles.subtitle}>
          Pronto para corrigir suas provas hoje?
        </Text>

        <Card variant="dark" style={styles.card}>
          <Text variant="h2" weight="bold" color={colors.white}>
            Nova prova
          </Text>
          <Text variant="body" color="#c9c9c9" style={styles.cardSubtitle}>
            Configure uma nova avaliação e comece a corrigir.
          </Text>
          <PillButton title="Criar prova" variant="light" onPress={onCreateExam} />
        </Card>

        <View style={styles.row}>
          <PillButton title="Ver provas" variant="outline" onPress={() => router.push('/exams')} />
        </View>
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
    paddingBottom: 120,
  },
  subtitle: {
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardSubtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  row: {
    marginTop: spacing.sm,
  },
});
