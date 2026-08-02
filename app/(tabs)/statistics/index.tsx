import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../components/ui/Text';
import { Card } from '../../../components/ui/Card';
import { colors, spacing } from '../../../theme/tokens';

export default function Statistics() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text variant="h1" weight="bold" style={styles.header}>
        Estatísticas
      </Text>

      <View style={styles.center}>
        <Card variant="dark" style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="bar-chart-outline" size={32} color={colors.coral} />
          </View>
          <Text variant="h2" weight="bold" color={colors.white} style={styles.title}>
            Em construção
          </Text>
          <Text variant="body" color="#c9c9c9" style={styles.subtitle}>
            Estamos preparando estatísticas reais sobre suas turmas e provas. Volte em breve!
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCream,
  },
  header: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  center: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 140,
  },
  card: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dark,
    borderWidth: 1,
    borderColor: '#4a4a4a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
  },
});
